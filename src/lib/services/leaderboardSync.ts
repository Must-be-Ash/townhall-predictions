import connectDB from '@/lib/db';
import { BetEvent } from '@/lib/models/BetEvent';
import { User, getUserDisplayName, IUser } from '@/lib/models/User';
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
    
    // Get user data for display names and usernames
    const users = await User.find({});
    const userMap = new Map(users.map(u => [u.evmAddress.toLowerCase(), u]));

    // Create market outcome map
    const marketOutcomes = new Map(
      markets.map(m => [m.marketId, m.winningOutcome])
    );

    // Create market timing lookup for early participation calculation
    const marketTimings = new Map(
      markets.map(m => [m.marketId, {
        createdAt: new Date(m.createdAt),
        closeTime: new Date(m.closeTime)
      }])
    );

    // Calculate stats per user
    const userStats = new Map<string, {
      totalBets: number;
      correctPredictions: number;
      totalWinnings: number;
      user?: IUser; // Store full user object for display name logic
      lastBetTimestamp?: Date;
      earlyParticipationScores: number[]; // Track timing percentage for each bet
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
          user: userMap.get(userAddress),
          lastBetTimestamp: bet.timestamp,
          earlyParticipationScores: []
        });
      }

      const stats = userStats.get(userAddress)!;
      stats.totalBets++;

      // Update last bet timestamp
      if (!stats.lastBetTimestamp || bet.timestamp > stats.lastBetTimestamp) {
        stats.lastBetTimestamp = bet.timestamp;
      }

      // Calculate early participation score for this bet
      const marketTiming = marketTimings.get(bet.marketId);
      if (marketTiming) {
        const marketDuration = marketTiming.closeTime.getTime() - marketTiming.createdAt.getTime();
        
        // Skip instant markets (same create/close time) to avoid division by zero
        if (marketDuration > 0) {
          const timeSinceLaunch = bet.timestamp.getTime() - marketTiming.createdAt.getTime();
          const earlyParticipationPercentage = (timeSinceLaunch / marketDuration) * 100;
          
          // Clamp percentage between 0-100 (in case bet was placed before market creation due to timing issues)
          const clampedPercentage = Math.max(0, Math.min(100, earlyParticipationPercentage));
          stats.earlyParticipationScores.push(clampedPercentage);
        }
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
      .map(([address, stats]) => {
        // Generate display name with fallback logic
        let displayName;
        if (stats.user) {
          displayName = getUserDisplayName(stats.user);
        } else {
          // Fallback for users not in User table
          displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;
        }

        // Calculate average early participation percentage
        const avgEarlyParticipation = stats.earlyParticipationScores.length > 0 
          ? stats.earlyParticipationScores.reduce((sum, score) => sum + score, 0) / stats.earlyParticipationScores.length
          : undefined;

        return {
          userAddress: address,
          displayName,
          totalBets: stats.totalBets,
          correctPredictions: stats.correctPredictions,
          winRate: stats.totalBets > 0 ? (stats.correctPredictions / stats.totalBets) * 100 : 0,
          totalWinnings: stats.totalWinnings.toFixed(2),
          rank: 0, // Will be set after sorting
          lastBetTimestamp: stats.lastBetTimestamp,
          avgEarlyParticipation: avgEarlyParticipation
        };
      })
      .sort((a, b) => {
        // Sort by win rate first, then by total correct predictions, then by early participation (risk-taking)
        if (Math.abs(a.winRate - b.winRate) < 0.01) {
          // Same win rate, check correct predictions
          if (a.correctPredictions === b.correctPredictions) {
            // Same correct predictions, favor earlier participation (lower percentage = earlier betting)
            const aEarly = a.avgEarlyParticipation ?? Number.MAX_SAFE_INTEGER; // No early data = lowest priority
            const bEarly = b.avgEarlyParticipation ?? Number.MAX_SAFE_INTEGER;
            
            if (Math.abs(aEarly - bEarly) < 0.01) {
              // Still tied, fall back to earliest last bet timestamp
              return (a.lastBetTimestamp?.getTime() || 0) - (b.lastBetTimestamp?.getTime() || 0);
            }
            
            return aEarly - bEarly; // Lower percentage = earlier betting = higher rank
          }
          return b.correctPredictions - a.correctPredictions;
        }
        return b.winRate - a.winRate;
      });

    // Assign ranks and log tiebreaker info for debugging
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Log tiebreaker info for entries with same win rates
    const tiedGroups = new Map<string, ILeaderboardEntry[]>();
    leaderboardEntries.forEach(entry => {
      const key = `${entry.winRate.toFixed(1)}-${entry.correctPredictions}`;
      if (!tiedGroups.has(key)) tiedGroups.set(key, []);
      tiedGroups.get(key)!.push(entry);
    });

    tiedGroups.forEach((group, key) => {
      if (group.length > 1) {
        console.log(`🏆 Tiebreaker for ${key} (${group.length} users):`);
        group.forEach((entry) => {
          console.log(`  ${entry.rank}. ${entry.displayName}: early=${entry.avgEarlyParticipation?.toFixed(1)}%`);
        });
      }
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
