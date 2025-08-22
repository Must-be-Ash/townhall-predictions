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

interface PollingConfig {
  interval: number;
  maxRetries: number;
  backoffMultiplier: number;
}

interface MarketChangeListener {
  (marketId: number, newData: MarketData, oldData?: MarketData): void;
}

export class MarketPollingService {
  private static instance: MarketPollingService | null = null;
  private config: PollingConfig;
  private isPolling = false;
  private intervalId: NodeJS.Timeout | null = null;
  private marketIds = new Set<number>();
  private currentData = new Map<number, MarketData>();
  private changeListeners = new Set<MarketChangeListener>();
  private retryCount = 0;
  private isDocumentVisible = true;

  constructor(config: PollingConfig = { interval: 30000, maxRetries: 3, backoffMultiplier: 2 }) {
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
    if (!this.isPolling && this.marketIds.size > 0) {
      this.startPolling();
    }
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
    this.intervalId = setInterval(() => this.poll(), interval);
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
      this.intervalId = setInterval(() => this.poll(), newInterval);
    }
  }

  private async poll(): Promise<void> {
    if (this.marketIds.size === 0) return;

    try {
      const marketIds = Array.from(this.marketIds);
      const response = await fetch(`/api/markets/bulk?ids=${marketIds.join(',')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.markets) {
        this.processMarketUpdates(data.markets, data.changes || []);
        this.retryCount = 0; // Reset retry count on success
      }
    } catch (error) {
      console.error('Market polling failed:', error);
      this.handlePollingError();
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
    this.marketIds.clear();
    this.currentData.clear();
    this.changeListeners.clear();
    MarketPollingService.instance = null;
  }
}

// Export singleton instance
export const marketPollingService = MarketPollingService.getInstance();