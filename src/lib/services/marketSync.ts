import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { MarketCache, IMarketCache } from "@/lib/models/MarketCache";
import connectDB from "@/lib/db";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { TOWN_HALL_PREDICTIONS_ABI } from "@/lib/abis";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface BlockchainMarketData {
  marketId: number;
  question: string;
  closeTime: Date;
  resolved: boolean;
  winningOutcome: boolean;
  yesTotal: string;
  noTotal: string;
  yesCount: number;
  noCount: number;
  voided: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

/**
 * Fetches market data directly from blockchain
 * This is the source of truth - all cached data must match this
 */
export async function getMarketFromBlockchain(marketId: number): Promise<BlockchainMarketData | null> {
  try {
    const contractAddress = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
    
    const marketData = await publicClient.readContract({
      address: contractAddress,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "markets",
      args: [BigInt(marketId)],
    });

    return {
      marketId,
      question: marketData[0] as string,
      closeTime: new Date(Number(marketData[1]) * 1000),
      resolved: marketData[2] as boolean,
      winningOutcome: marketData[3] as boolean,
      yesTotal: (marketData[4] as bigint).toString(),
      noTotal: (marketData[5] as bigint).toString(),
      yesCount: Number(marketData[6]),
      noCount: Number(marketData[7]),
      voided: marketData[8] as boolean,
      createdAt: new Date(Number(marketData[9]) * 1000),
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error(`Failed to fetch market ${marketId} from blockchain:`, error);
    return null;
  }
}

/**
 * Verifies cached data against blockchain data
 * Returns false if any critical data doesn't match
 */
export async function verifyMarketIntegrity(marketId: number): Promise<boolean> {
  try {
    await connectDB();
    
    const [cachedMarket, blockchainMarket] = await Promise.all([
      MarketCache.findOne({ marketId }).lean() as Promise<IMarketCache | null>,
      getMarketFromBlockchain(marketId)
    ]);

    if (!cachedMarket || !blockchainMarket) {
      return false;
    }

    // Critical fields that must exactly match blockchain
    const criticalFields: (keyof BlockchainMarketData)[] = [
      'question',
      'resolved',
      'winningOutcome',
      'voided',
      'yesCount',
      'noCount',
    ];

    for (const field of criticalFields) {
      const cachedValue = (cachedMarket as unknown as Record<string, unknown>)[field];
      const blockchainValue = blockchainMarket[field];
      if (cachedValue !== blockchainValue) {
        console.warn(
          `Integrity check failed for market ${marketId}: ${field} mismatch.`,
          `Cache: ${cachedValue}, Blockchain: ${blockchainValue}`
        );
        return false;
      }
    }

    // Check totals (allow small precision differences)
    const yesTotalDiff = Math.abs(Number(cachedMarket.yesTotal) - Number(blockchainMarket.yesTotal));
    const noTotalDiff = Math.abs(Number(cachedMarket.noTotal) - Number(blockchainMarket.noTotal));
    
    if (yesTotalDiff > 1 || noTotalDiff > 1) { // Allow 1 wei difference
      console.warn(`Integrity check failed for market ${marketId}: total amounts mismatch`);
      return false;
    }

    // Check timestamps are reasonable
    const closeTimeDiff = Math.abs(cachedMarket.closeTime.getTime() - blockchainMarket.closeTime.getTime());
    const createdAtDiff = Math.abs(cachedMarket.createdAt.getTime() - blockchainMarket.createdAt.getTime());
    
    if (closeTimeDiff > 1000 || createdAtDiff > 1000) { // Allow 1 second difference
      console.warn(`Integrity check failed for market ${marketId}: timestamp mismatch`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Failed to verify integrity for market ${marketId}:`, error);
    return false;
  }
}

/**
 * Syncs a single market from blockchain to cache
 * Always overwrites cache with blockchain data (blockchain is source of truth)
 */
export async function syncMarketToCache(marketId: number): Promise<boolean> {
  try {
    const blockchainData = await getMarketFromBlockchain(marketId);
    if (!blockchainData) {
      console.error(`Cannot sync market ${marketId}: not found on blockchain`);
      return false;
    }

    await connectDB();
    
    // Get existing cache entry to preserve participants list
    const existingCache = await MarketCache.findOne({ marketId }).lean() as IMarketCache | null;
    
    await MarketCache.findOneAndUpdate(
      { marketId },
      {
        ...blockchainData,
        participants: existingCache?.participants || [],
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    console.log(`Successfully synced market ${marketId} to cache`);
    return true;
  } catch (error) {
    console.error(`Failed to sync market ${marketId} to cache:`, error);
    return false;
  }
}

/**
 * Syncs all markets from blockchain to cache
 * Used for bulk updates and initial cache population
 */
export async function syncAllMarkets(): Promise<{ success: number; failed: number }> {
  try {
    const contractAddress = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
    
    const marketCounter = await publicClient.readContract({
      address: contractAddress,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "marketCounter",
    });

    const totalMarkets = Number(marketCounter);
    console.log(`Syncing ${totalMarkets} markets from blockchain...`);

    const results = await Promise.allSettled(
      Array.from({ length: totalMarkets }, (_, i) => syncMarketToCache(i + 1))
    );

    const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - success;

    console.log(`Sync completed: ${success} successful, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('Failed to sync all markets:', error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Performs integrity check on all cached markets
 * Returns list of markets that failed verification
 */
export async function validateAllCacheIntegrity(): Promise<number[]> {
  try {
    await connectDB();
    
    const cachedMarkets = await MarketCache.find({}, 'marketId').lean();
    console.log(`Validating integrity for ${cachedMarkets.length} cached markets...`);

    const validationResults = await Promise.allSettled(
      cachedMarkets.map(market => verifyMarketIntegrity(market.marketId))
    );

    const failedMarkets: number[] = [];
    
    validationResults.forEach((result, index) => {
      if (result.status === 'rejected' || !result.value) {
        failedMarkets.push(cachedMarkets[index].marketId);
      }
    });

    if (failedMarkets.length > 0) {
      console.warn(`Integrity check failed for markets: ${failedMarkets.join(', ')}`);
    } else {
      console.log('All cached markets passed integrity check');
    }

    return failedMarkets;
  } catch (error) {
    console.error('Failed to validate cache integrity:', error);
    return [];
  }
}

/**
 * Gets market data with smart fallback:
 * 1. Try cache if fresh (< 2 minutes old)
 * 2. Verify integrity if cache exists
 * 3. Fall back to blockchain if cache is stale or invalid
 * 4. Update cache with fresh data
 */
export async function getMarketWithFallback(marketId: number) {
  try {
    await connectDB();
    
    // Try cache first
    const cachedMarket = await MarketCache.findOne({ marketId }).lean() as IMarketCache | null;
    
    if (cachedMarket) {
      // Check if cache is fresh (< 2 minutes old)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      if (cachedMarket.lastUpdated > twoMinutesAgo) {
        // Cache is fresh, verify integrity
        const isValid = await verifyMarketIntegrity(marketId);
        
        if (isValid) {
          return { data: cachedMarket, source: 'cache' };
        } else {
          console.warn(`Cache integrity failed for market ${marketId}, falling back to blockchain`);
        }
      }
    }

    // Cache miss, stale, or invalid - get from blockchain
    const blockchainData = await getMarketFromBlockchain(marketId);
    
    if (!blockchainData) {
      return { data: null, source: 'none' };
    }

    // Update cache
    await syncMarketToCache(marketId);
    
    return { data: blockchainData, source: 'blockchain' };
  } catch (error) {
    console.error(`Failed to get market ${marketId} with fallback:`, error);
    return { data: null, source: 'error' };
  }
}