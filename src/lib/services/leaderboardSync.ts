import connectDB from '@/lib/db';
import { BetEvent } from '@/lib/models/BetEvent';
import { User } from '@/lib/models/User';
import { MarketCache } from '@/lib/models/MarketCache';
import { LeaderboardCache, ILeaderboardEntry, ILeaderboardCache } from '@/lib/models/LeaderboardCache';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function calculateLeaderboardFromScratch(): Promise<ILeaderboardEntry[]> {
  try {
    await connectDB();

    // Get all bet events
    const betEvents = await BetEvent.find({}).lean();
    
    // Get all resolved market data to determine outcomes
    const markets = await MarketCache.find({ 
      resolved: true 
    }).lean();
    
    // Get user display names
    const users = await User.find({}).lean();
    const userMap = new Map(users.map(u => [u.evmAddress.toLowerCase(), u]));

    // Create market outcome map
    const marketOutcomes = new Map(
      markets.map(m => [m.marketId, m.winningOutcome])
    );

    // Calculate stats per user
    const userStats = new Map<string, {
      totalBets: number;
      correctPredictions: number;
      totalWinnings: number;
      displayName?: string;
      lastBetTimestamp?: Date;
    }>();

    // Process each bet event
    for (const bet of betEvents) {
      const userAddress = bet.userAddress.toLowerCase();
      const marketOutcome = marketOutcomes.get(bet.marketId);
      
      // Skip if market not resolved
      if (marketOutcome === undefined) continue;

      if (!userStats.has(userAddress)) {
        userStats.set(userAddress, {
          totalBets: 0,
          correctPredictions: 0,
          totalWinnings: 0,
          displayName: userMap.get(userAddress)?.displayName,
          lastBetTimestamp: bet.timestamp
        });
      }

      const stats = userStats.get(userAddress)!;
      stats.totalBets++;

      // Update last bet timestamp
      if (!stats.lastBetTimestamp || bet.timestamp > stats.lastBetTimestamp) {
        stats.lastBetTimestamp = bet.timestamp;
      }

      // Check if user's bet was correct
      if (bet.outcome === marketOutcome) {
        stats.correctPredictions++;
        
        // Add winnings calculation here if available
        // For now, we'll estimate based on bet amount and win rate
        const estimatedWinnings = 1.0; // $1 base bet
        stats.totalWinnings += estimatedWinnings;
      }
    }

    // Convert to leaderboard entries and filter
    const leaderboardEntries: ILeaderboardEntry[] = Array.from(userStats.entries())
      .filter(([, stats]) => stats.totalBets >= 1) // Minimum 1 bet to qualify
      .map(([address, stats]) => ({
        userAddress: address,
        displayName: stats.displayName,
        totalBets: stats.totalBets,
        correctPredictions: stats.correctPredictions,
        winRate: stats.totalBets > 0 ? (stats.correctPredictions / stats.totalBets) * 100 : 0,
        totalWinnings: stats.totalWinnings.toFixed(2),
        rank: 0, // Will be set after sorting
        lastBetTimestamp: stats.lastBetTimestamp
      }))
      .sort((a, b) => {
        // Sort by win rate first, then by total correct predictions
        if (Math.abs(a.winRate - b.winRate) < 0.01) {
          return b.correctPredictions - a.correctPredictions;
        }
        return b.winRate - a.winRate;
      });

    // Assign ranks
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboardEntries;

  } catch (error) {
    console.error('Failed to calculate leaderboard from scratch:', error);
    throw error;
  }
}

export async function updateLeaderboardCache(): Promise<void> {
  try {
    console.log('🏆 Updating leaderboard cache...');
    
    const entries = await calculateLeaderboardFromScratch();
    
    await connectDB();
    
    // Clear existing cache and insert new data
    await LeaderboardCache.deleteMany({});
    
    const newCache = new LeaderboardCache({
      entries,
      totalUsers: entries.length,
      version: Date.now() // Use timestamp as version
    });
    
    await newCache.save();
    
    console.log(`✅ Leaderboard cache updated with ${entries.length} users`);
    
  } catch (error) {
    console.error('❌ Failed to update leaderboard cache:', error);
    throw error;
  }
}

export async function getLeaderboardFromCache(): Promise<{
  entries: ILeaderboardEntry[];
  totalUsers: number;
  fromCache: boolean;
  lastUpdated: Date;
} | null> {
  try {
    await connectDB();
    
    const cached = await LeaderboardCache.findOne({})
      .sort({ lastUpdated: -1 })
      .lean() as ILeaderboardCache | null;
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is stale (older than CACHE_DURATION)
    const now = new Date();
    const cacheAge = now.getTime() - new Date(cached.lastUpdated).getTime();
    const isStale = cacheAge > CACHE_DURATION;
    
    if (isStale) {
      console.log('⏰ Leaderboard cache is stale, will trigger update');
      return null;
    }
    
    return {
      entries: cached.entries,
      totalUsers: cached.totalUsers,
      fromCache: true,
      lastUpdated: new Date(cached.lastUpdated)
    };
    
  } catch (error) {
    console.error('Failed to get leaderboard from cache:', error);
    return null;
  }
}

export async function getCachedLeaderboardAge(): Promise<number | null> {
  try {
    await connectDB();
    
    const cached = await LeaderboardCache.findOne({})
      .sort({ lastUpdated: -1 })
      .select('lastUpdated')
      .lean() as Pick<ILeaderboardCache, 'lastUpdated'> | null;
    
    if (!cached) {
      return null;
    }
    
    return new Date().getTime() - new Date(cached.lastUpdated).getTime();
    
  } catch (error) {
    console.error('Failed to get cache age:', error);
    return null;
  }
}
