interface MarketData {
  marketId: number;
  question: string;
  closeTime: Date | string;
  resolved: boolean;
  winningOutcome: boolean;
  yesTotal: string;
  noTotal: string;
  yesCount: number;
  noCount: number;
  voided: boolean;
  createdAt: Date | string;
  lastUpdated: Date | string;
  participants: string[];
  yesMultiplier?: number;
  noMultiplier?: number;
}

enum PollingTier {
  FOCUS_ACTIVE = 3000,     // 3s - user actively viewing active market
  BACKGROUND_ACTIVE = 5000, // 5s - active market in background
  CLOSED_WAITING = 15000,   // 15s - closed market awaiting resolution
  RESOLVED_CHECK = 60000,   // 1min - resolved market checking withdrawals
  FINAL_STATE = 0          // No polling - final state
}

enum RequestPriority {
  CRITICAL = 1,    // User actions, immediate needs
  HIGH = 2,        // Active market updates  
  MEDIUM = 3,      // Background refreshes
  LOW = 4          // Resolved market checks
}

interface PriorityRequest {
  marketId: number;
  priority: RequestPriority;
  timestamp: number;
  retries: number;
}

interface PollingConfig {
  interval: number;
  maxRetries: number;
  backoffMultiplier: number;
  enableSmartTiers: boolean;
}

interface MarketChangeListener {
  (marketId: number, newData: MarketData, oldData?: MarketData): void;
}

interface ApiResponse {
  success: boolean;
  markets?: Record<string, MarketData>;
  changes?: number[];
}

export class MarketPollingService {
  private static instance: MarketPollingService | null = null;
  private config: PollingConfig;
  private isPolling = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  // Smart tier management
  private marketTiers = new Map<number, PollingTier>();
  private focusedMarkets = new Set<number>(); // Markets user is actively viewing
  private rateLimitedUntil = 0;
  private backoffMultiplier = 1;
  
  // Priority queue system
  private priorityQueue: PriorityRequest[] = [];
  private processingQueue = false;
  private lastQueueProcess = 0;
  private queueProcessInterval = 1000; // Process queue every 1 second
  
  // Request batching optimization
  private batchedRequests: Map<RequestPriority, Set<number>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly batchWindow = 500; // 500ms batch window
  private readonly maxBatchSize = 8; // Smaller batches for better responsiveness
  
  // Legacy support
  private marketIds = new Set<number>();
  private currentData = new Map<number, MarketData>();
  private changeListeners = new Set<MarketChangeListener>();
  private retryCount = 0;
  private isDocumentVisible = true;

  constructor(config: PollingConfig = { 
    interval: 30000, 
    maxRetries: 3, 
    backoffMultiplier: 2,
    enableSmartTiers: true 
  }) {
    this.config = config;
    this.setupVisibilityHandlers();
  }

  public static getInstance(config?: PollingConfig): MarketPollingService {
    if (!MarketPollingService.instance) {
      MarketPollingService.instance = new MarketPollingService(config);
    }
    return MarketPollingService.instance;
  }

  private setupVisibilityHandlers() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isDocumentVisible = !document.hidden;
        
        if (this.isDocumentVisible && this.marketIds.size > 0) {
          // Resume polling when tab becomes visible
          this.startPolling();
        } else if (!this.isDocumentVisible) {
          // Slow down polling when tab is hidden
          this.adjustPollingInterval(60000); // 1 minute when hidden
        }
      });
    }
  }

  public addMarket(marketId: number): void {
    this.marketIds.add(marketId);
    
    // Smart tier management
    if (this.config.enableSmartTiers) {
      this.categorizeMarket(marketId);
    }
    
    if (!this.isPolling && this.marketIds.size > 0) {
      this.startPolling();
    }
  }

  // Mark a market as focused (user actively viewing)
  public setMarketFocus(marketId: number, focused: boolean): void {
    if (focused) {
      this.focusedMarkets.add(marketId);
    } else {
      this.focusedMarkets.delete(marketId);
    }
    
    // Recategorize market based on focus
    if (this.config.enableSmartTiers) {
      this.categorizeMarket(marketId);
    }
  }

  // Force immediate refresh with intelligent batching
  public forceRefresh(marketId: number, priority: RequestPriority = RequestPriority.HIGH): void {
    // For critical requests, process immediately without batching
    if (priority === RequestPriority.CRITICAL && Date.now() > this.rateLimitedUntil) {
      this.addToPriorityQueue(marketId, priority);
      this.processKriticalRequests();
      return;
    }
    
    // For other requests, use intelligent batching
    this.addToBatch(marketId, priority);
  }
  
  // Add request to batch with intelligent timing
  private addToBatch(marketId: number, priority: RequestPriority): void {
    // Initialize priority level if not exists
    if (!this.batchedRequests.has(priority)) {
      this.batchedRequests.set(priority, new Set());
    }
    
    const batch = this.batchedRequests.get(priority)!;
    batch.add(marketId);
    
    // Process immediately if batch is full
    if (batch.size >= this.maxBatchSize) {
      this.processBatch(priority);
      return;
    }
    
    // Set up batch timeout if not already set
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processAllBatches();
      }, this.batchWindow);
    }
  }
  
  // Process a specific priority batch
  private async processBatch(priority: RequestPriority): Promise<void> {
    const batch = this.batchedRequests.get(priority);
    if (!batch || batch.size === 0) return;
    
    const marketIds = Array.from(batch);
    batch.clear();
    
    // Add to priority queue for processing
    for (const marketId of marketIds) {
      this.addToPriorityQueue(marketId, priority);
    }
    
    // Process the queue
    await this.processQueuedRequests();
  }
  
  // Process all pending batches
  private async processAllBatches(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // Process batches in priority order
    const priorities = [RequestPriority.CRITICAL, RequestPriority.HIGH, RequestPriority.MEDIUM, RequestPriority.LOW];
    
    for (const priority of priorities) {
      await this.processBatch(priority);
    }
  }
  
  // Add request to priority queue with deduplication
  private addToPriorityQueue(marketId: number, priority: RequestPriority): void {
    // Remove existing request for this market (if any)
    this.priorityQueue = this.priorityQueue.filter(req => req.marketId !== marketId);
    
    // Add new request
    this.priorityQueue.push({
      marketId,
      priority,
      timestamp: Date.now(),
      retries: 0
    });
    
    // Sort by priority (lower number = higher priority)
    this.priorityQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // If same priority, sort by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
    
    // Limit queue size to prevent memory issues
    if (this.priorityQueue.length > 100) {
      this.priorityQueue = this.priorityQueue.slice(0, 50); // Keep top 50 priority requests
    }
  }
  
  // Process critical requests immediately
  private async processKriticalRequests(): Promise<void> {
    const criticalRequests = this.priorityQueue.filter(req => req.priority === RequestPriority.CRITICAL);
    if (criticalRequests.length === 0) return;
    
    try {
      await this.processPriorityRequests(criticalRequests.slice(0, 3)); // Max 3 critical at once
    } catch (error) {
      console.error('Failed to process critical requests:', error);
    }
  }

  // Categorize market into appropriate polling tier
  private categorizeMarket(marketId: number): void {
    const marketData = this.currentData.get(marketId);
    if (!marketData) {
      // New market - assume active until we get data
      this.marketTiers.set(marketId, PollingTier.BACKGROUND_ACTIVE);
      return;
    }

    const now = Date.now();
    const closeTime = new Date(marketData.closeTime).getTime();
    const isActive = !marketData.resolved && !marketData.voided && now < closeTime;
    const isFocused = this.focusedMarkets.has(marketId);

    // Determine appropriate tier
    if (marketData.voided || (marketData.resolved && !this.hasUserWinnings(marketId))) {
      // Final state - stop polling
      this.marketTiers.set(marketId, PollingTier.FINAL_STATE);
    } else if (marketData.resolved) {
      // Resolved but may have pending withdrawals
      this.marketTiers.set(marketId, PollingTier.RESOLVED_CHECK);
    } else if (!isActive) {
      // Closed, awaiting resolution
      this.marketTiers.set(marketId, PollingTier.CLOSED_WAITING);
    } else if (isFocused) {
      // Active market with user focus
      this.marketTiers.set(marketId, PollingTier.FOCUS_ACTIVE);
    } else {
      // Active market in background
      this.marketTiers.set(marketId, PollingTier.BACKGROUND_ACTIVE);
    }
  }

  // Check if user has potential winnings (simplified - would need user context)
  private hasUserWinnings(marketId: number): boolean {
    // This would need user context to check actual winnings
    // For now, assume resolved markets might have winnings
    const marketData = this.currentData.get(marketId);
    return marketData?.resolved === true;
  }

  public removeMarket(marketId: number): void {
    this.marketIds.delete(marketId);
    this.currentData.delete(marketId);
    
    if (this.marketIds.size === 0) {
      this.stopPolling();
    }
  }

  public addChangeListener(listener: MarketChangeListener): void {
    this.changeListeners.add(listener);
  }

  public removeChangeListener(listener: MarketChangeListener): void {
    this.changeListeners.delete(listener);
  }

  public getCurrentData(marketId: number): MarketData | undefined {
    return this.currentData.get(marketId);
  }

  private startPolling(): void {
    if (this.isPolling || this.marketIds.size === 0) return;
    
    this.isPolling = true;
    this.poll(); // Initial poll
    
    const interval = this.isDocumentVisible ? this.config.interval : 60000;
    this.intervalId = setInterval(() => {
      this.poll();
      this.processQueuedRequests(); // Process priority queue
    }, interval);
    
    // Also start a separate queue processor for more frequent priority handling
    setInterval(() => this.processQueuedRequests(), this.queueProcessInterval);
  }

  private stopPolling(): void {
    this.isPolling = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private adjustPollingInterval(newInterval: number): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => {
        this.poll();
        this.processQueuedRequests();
      }, newInterval);
    }
  }
  
  // Process queued priority requests
  private async processQueuedRequests(): Promise<void> {
    const now = Date.now();
    
    // Don't process if we recently processed or are rate limited
    if (this.processingQueue || 
        now < this.rateLimitedUntil ||
        now - this.lastQueueProcess < this.queueProcessInterval) {
      return;
    }
    
    this.processingQueue = true;
    this.lastQueueProcess = now;
    
    try {
      // Get requests to process (up to 5 at a time)
      const requestsToProcess = this.priorityQueue.splice(0, 5);
      if (requestsToProcess.length === 0) return;
      
      await this.processPriorityRequests(requestsToProcess);
    } catch (error) {
      console.error('Failed to process queued requests:', error);
    } finally {
      this.processingQueue = false;
    }
  }
  
  // Process a batch of priority requests
  private async processPriorityRequests(requests: PriorityRequest[]): Promise<void> {
    if (requests.length === 0) return;
    
    const marketIds = requests.map(req => req.marketId);
    
    try {
      // Batch requests to respect API limit
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < marketIds.length; i += batchSize) {
        batches.push(marketIds.slice(i, i + batchSize));
      }
      
      // Process all batches in parallel
      const batchPromises = batches.map(async (batch) => {
        const response = await fetch(`/api/markets/bulk?ids=${batch.join(',')}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Priority': 'high', // Signal to backend this is priority
          },
        });

        if (response.status === 429) {
          // Handle rate limiting with priority queue context
          this.handleRateLimit(true); // isFromPriorityQueue = true
          this.requeueFailedRequests(requests, batch);
          throw new Error(`Rate limited: ${response.status}`);
        }

        if (!response.ok) {
          throw new Error(`Priority request failed: ${response.status}`);
        }

        return response.json();
      });

      const results = await Promise.all(batchPromises);
      
      // Process results same as regular polling
      const allMarkets: Record<string, MarketData> = {};
      const allChanges: number[] = [];
      
      results.forEach((data: ApiResponse) => {
        if (data.success && data.markets) {
          Object.assign(allMarkets, data.markets);
          if (data.changes) {
            allChanges.push(...data.changes);
          }
        }
      });
      
      if (Object.keys(allMarkets).length > 0) {
        this.processMarketUpdates(allMarkets, allChanges);
      }
      
    } catch (error) {
      // Re-queue failed requests for retry
      this.requeueFailedRequests(requests, marketIds);
      throw error;
    }
  }
  
  // Re-queue failed requests with exponential backoff
  private requeueFailedRequests(originalRequests: PriorityRequest[], failedMarketIds: number[]): void {
    for (const request of originalRequests) {
      if (failedMarketIds.includes(request.marketId)) {
        request.retries++;
        
        // Exponential backoff: reduce priority on retries
        if (request.retries <= 3) {
          const backoffPriority = Math.min(request.priority + request.retries, RequestPriority.LOW);
          this.addToPriorityQueue(request.marketId, backoffPriority as RequestPriority);
        }
        // After 3 retries, drop the request
      }
    }
  }

  private async poll(): Promise<void> {
    if (this.marketIds.size === 0) return;

    // Check rate limit recovery
    this.checkRateLimitRecovery();

    // Check if rate limited
    const now = Date.now();
    if (now < this.rateLimitedUntil) {
      console.log('Polling paused due to rate limiting');
      return;
    }

    try {
      let marketIds: number[];
      
      if (this.config.enableSmartTiers) {
        // Smart tier-based polling
        marketIds = this.getMarketsToUpdate();
      } else {
        // Legacy: poll all markets
        marketIds = Array.from(this.marketIds);
      }

      if (marketIds.length === 0) {
        return; // No markets need updating
      }
      
      // Use regular tier-based polling (priority queue is handled separately)
      const finalMarkets = marketIds;
      
      // Batch requests to respect API limit of 10 markets per request
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < finalMarkets.length; i += batchSize) {
        batches.push(finalMarkets.slice(i, i + batchSize));
      }

      // Process all batches in parallel
      const batchPromises = batches.map(async (batch) => {
        const response = await fetch(`/api/markets/bulk?ids=${batch.join(',')}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 429) {
          // Rate limited - implement exponential backoff
          this.handleRateLimit(false); // isFromPriorityQueue = false
          throw new Error(`Rate limited: ${response.status}`);
        }

        if (!response.ok) {
          throw new Error(`Poll failed for batch: ${response.status}`);
        }

        return response.json();
      });

      const results = await Promise.all(batchPromises);
      
      // Combine all batch results
      const allMarkets: Record<string, MarketData> = {};
      const allChanges: number[] = [];
      
      results.forEach((data: ApiResponse) => {
        if (data.success && data.markets) {
          Object.assign(allMarkets, data.markets);
          if (data.changes) {
            allChanges.push(...data.changes);
          }
        }
      });
      
      if (Object.keys(allMarkets).length > 0) {
        this.processMarketUpdates(allMarkets, allChanges);
        this.retryCount = 0; // Reset retry count on success
        this.backoffMultiplier = 1; // Reset backoff on success
      }
    } catch (error) {
      console.error('Market polling failed:', error);
      this.handlePollingError();
    }
  }

  // Get markets that need updating based on their tier
  private getMarketsToUpdate(): number[] {
    const now = Date.now();
    const marketsToUpdate: number[] = [];
    
    for (const marketId of this.marketIds) {
      const tier = this.marketTiers.get(marketId);
      
      // Skip markets without tier data
      if (tier === undefined) continue;
      
      // Skip final state markets
      if (tier === PollingTier.FINAL_STATE) continue;
      
      const lastUpdate = this.currentData.get(marketId)?.lastUpdated;
      const lastUpdateTime = lastUpdate ? new Date(lastUpdate).getTime() : 0;
      
      // Check if market needs update based on its tier interval
      if (now - lastUpdateTime >= tier) {
        marketsToUpdate.push(marketId);
      }
    }
    
    return marketsToUpdate;
  }

  // Enhanced rate limiting with smart exponential backoff
  private handleRateLimit(isFromPriorityQueue = false): void {
    this.backoffMultiplier = Math.min(this.backoffMultiplier * 1.5, 16); // More gradual increase, higher cap
    
    // Different backoff strategies for different request types
    const baseBackoff = isFromPriorityQueue ? 3000 : 5000; // Priority requests get shorter backoff
    const backoffTime = baseBackoff * this.backoffMultiplier;
    const maxBackoff = isFromPriorityQueue ? 30000 : 60000; // 30s max for priority, 60s for regular
    
    const actualBackoff = Math.min(backoffTime, maxBackoff);
    this.rateLimitedUntil = Date.now() + actualBackoff;
    
    console.log(`Rate limited (${isFromPriorityQueue ? 'priority' : 'regular'}). Backing off for ${actualBackoff}ms (multiplier: ${this.backoffMultiplier})`);
    
    // Adjust polling interval temporarily, but not as aggressively
    const newInterval = Math.max(this.config.interval, Math.min(actualBackoff / 2, 30000));
    this.adjustPollingInterval(newInterval);
    
    // Clear priority queue of low-priority items when heavily rate limited
    if (this.backoffMultiplier >= 8) {
      const initialLength = this.priorityQueue.length;
      this.priorityQueue = this.priorityQueue.filter(req => req.priority <= RequestPriority.HIGH);
      if (this.priorityQueue.length < initialLength) {
        console.log(`Cleared ${initialLength - this.priorityQueue.length} low-priority requests due to heavy rate limiting`);
      }
    }
  }
  
  // Smart recovery from rate limiting
  private checkRateLimitRecovery(): void {
    const now = Date.now();
    
    // If we've been free of rate limits for a while, gradually reduce backoff
    if (now > this.rateLimitedUntil + 30000) { // 30 seconds since last rate limit
      if (this.backoffMultiplier > 1) {
        this.backoffMultiplier = Math.max(1, this.backoffMultiplier * 0.8); // Gradual recovery
        console.log(`Rate limit recovery: reduced backoff multiplier to ${this.backoffMultiplier}`);
        
        // Restore normal polling interval if we've recovered enough
        if (this.backoffMultiplier <= 2) {
          this.adjustPollingInterval(this.config.interval);
        }
      }
    }
  }

  private processMarketUpdates(newMarkets: Record<string, MarketData>, changedMarketIds: number[]): void {
    // Only process markets that actually changed according to the API
    for (const marketId of changedMarketIds) {
      const newData = newMarkets[marketId.toString()];
      if (!newData) continue;

      const oldData = this.currentData.get(marketId);
      
      // Additional client-side change detection for safety
      if (this.hasDataChanged(oldData, newData)) {
        this.currentData.set(marketId, newData);
        
        // Notify all listeners about the change
        this.changeListeners.forEach(listener => {
          try {
            listener(marketId, newData, oldData);
          } catch (error) {
            console.error('Error in market change listener:', error);
          }
        });
      }
    }

    // Update current data for all markets (even unchanged ones) to keep timestamps fresh
    Object.entries(newMarkets).forEach(([marketIdStr, marketData]) => {
      const marketId = parseInt(marketIdStr);
      if (!changedMarketIds.includes(marketId)) {
        // Update silently without triggering change events
        this.currentData.set(marketId, marketData);
      }
    });
  }

  private hasDataChanged(oldData: MarketData | undefined, newData: MarketData): boolean {
    if (!oldData) return true;

    // Compare critical fields that affect UI
    const criticalFields: (keyof MarketData)[] = [
      'question',
      'resolved',
      'winningOutcome',
      'voided',
      'yesCount',
      'noCount',
      'yesTotal',
      'noTotal'
    ];

    return criticalFields.some(field => {
      const oldValue = oldData[field];
      const newValue = newData[field];
      
      // Special handling for bigint strings
      if (field === 'yesTotal' || field === 'noTotal') {
        return BigInt(oldValue as string) !== BigInt(newValue as string);
      }
      
      return oldValue !== newValue;
    });
  }

  private handlePollingError(): void {
    this.retryCount++;
    
    if (this.retryCount >= this.config.maxRetries) {
      // Exponential backoff
      const backoffDelay = this.config.interval * Math.pow(this.config.backoffMultiplier, this.retryCount - this.config.maxRetries);
      const maxBackoff = 5 * 60 * 1000; // 5 minutes max
      const delay = Math.min(backoffDelay, maxBackoff);
      
      console.warn(`Polling failed ${this.retryCount} times, backing off for ${delay}ms`);
      
      // Restart polling after backoff
      setTimeout(() => {
        this.retryCount = Math.max(0, this.retryCount - 1); // Gradually reduce retry count
        if (this.isPolling) {
          this.poll();
        }
      }, delay);
    }
  }

  // Public method for manual refresh (e.g., after user action)
  public async refreshMarket(marketId: number): Promise<void> {
    if (!this.marketIds.has(marketId)) {
      this.addMarket(marketId);
    }
    
    // Force immediate poll
    await this.poll();
  }

  // Public method to get all current market data
  public getAllCurrentData(): Map<number, MarketData> {
    return new Map(this.currentData);
  }

  // Cleanup method
  public destroy(): void {
    this.stopPolling();
    
    // Clean up batching system
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.batchedRequests.clear();
    this.priorityQueue.length = 0;
    
    this.marketIds.clear();
    this.currentData.clear();
    this.changeListeners.clear();
    this.marketTiers.clear();
    this.focusedMarkets.clear();
    
    MarketPollingService.instance = null;
  }
}

// Export singleton instance
export const marketPollingService = MarketPollingService.getInstance();