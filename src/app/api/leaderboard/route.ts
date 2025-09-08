import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardFromCache, updateLeaderboardCache } from '@/lib/services/leaderboardSync';

// Request deduplication cache
const requestCache = new Map<string, { data: unknown; timestamp: number }>();
const DEDUP_CACHE_DURATION = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    // Check request deduplication cache first
    const cacheKey = 'leaderboard_global';
    const now = Date.now();
    const cached = requestCache.get(cacheKey);
    
    if (cached && (now - cached.timestamp) < DEDUP_CACHE_DURATION) {
      return NextResponse.json({
        ...(cached.data as Record<string, unknown>),
        fromDeduplicationCache: true,
      });
    }

    // Check if force refresh is requested (for admin/testing)
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    let leaderboardData = null;
    let fromCache = false;

    // Try to get from cache first (unless force refresh is requested)
    if (!forceRefresh) {
      leaderboardData = await getLeaderboardFromCache();
      fromCache = !!leaderboardData;
    }

    // If cache miss, stale, or force refresh - recalculate
    if (!leaderboardData) {
      console.log('🏆 Leaderboard cache miss/stale, updating...');
      
      // Update cache in background
      try {
        await updateLeaderboardCache();
        
        // Get fresh data from cache
        leaderboardData = await getLeaderboardFromCache();
        fromCache = false;
        
      } catch (updateError) {
        console.error('Failed to update leaderboard cache:', updateError);
        
        // Return error if we can't update cache
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to generate leaderboard',
            details: updateError instanceof Error ? updateError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    if (!leaderboardData) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to load leaderboard data'
        },
        { status: 500 }
      );
    }

    const responseData = {
      success: true,
      leaderboard: leaderboardData.entries,
      totalUsers: leaderboardData.totalUsers,
      fromCache,
      lastUpdated: leaderboardData.lastUpdated,
      timestamp: new Date().toISOString(),
      metadata: {
        cacheAge: fromCache ? new Date().getTime() - leaderboardData.lastUpdated.getTime() : 0,
        topWinRate: leaderboardData.entries[0]?.winRate || 0,
        activeUsers: leaderboardData.entries.filter(e => e.totalBets >= 3).length,
      }
    };

    // Store in deduplication cache
    requestCache.set(cacheKey, {
      data: responseData,
      timestamp: now,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
