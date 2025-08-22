import { NextRequest, NextResponse } from "next/server";
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

const ALLOWED_ORIGINS = [
  'https://www.townhall.lol',
  'http://localhost:3000',
  'http://localhost:3001', // backup dev port
];

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute for bulk endpoint
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string, origin?: string): boolean {
  // Bypass rate limiting for development
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return true;
  }
  
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow same-origin requests (no origin header)
  if (!origin && !referer) return true;
  
  // Check origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Check referer as fallback
  if (referer) {
    return ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
  }
  
  return false;
}

async function getMarketsFromBlockchain(marketIds: number[]): Promise<Map<number, IMarketCache>> {
  const markets = new Map<number, IMarketCache>();
  
  try {
    const contractAddress = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
    
    // Fetch all markets in parallel
    const marketPromises = marketIds.map(async (marketId) => {
      try {
        const marketData = await publicClient.readContract({
          address: contractAddress,
          abi: TOWN_HALL_PREDICTIONS_ABI,
          functionName: "markets",
          args: [BigInt(marketId)],
        });

        const market: IMarketCache = {
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
          participants: [],
        };

        return { marketId, market };
      } catch (error) {
        console.error(`Failed to fetch market ${marketId} from blockchain:`, error);
        return null;
      }
    });

    const results = await Promise.all(marketPromises);
    
    results.forEach(result => {
      if (result) {
        markets.set(result.marketId, result.market);
      }
    });

    return markets;
  } catch (error) {
    console.error('Failed to fetch markets from blockchain:', error);
    return markets;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Security checks
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const origin = request.headers.get('origin');
    
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid origin' },
        { status: 403 }
      );
    }

    if (!checkRateLimit(ip, origin || undefined)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Parse market IDs and priority from query params
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const isHighPriority = request.headers.get('X-Priority') === 'high';
    
    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const marketIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id >= 1);
    
    if (marketIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid market IDs provided' },
        { status: 400 }
      );
    }

    if (marketIds.length > 10) {
      return NextResponse.json(
        { error: 'Too many markets requested (max 10)' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get cached markets
    const cachedMarkets = await MarketCache.find({ 
      marketId: { $in: marketIds } 
    }).lean() as unknown as IMarketCache[];

    const cachedMarketsMap = new Map<number, IMarketCache>();
    cachedMarkets.forEach(market => {
      cachedMarketsMap.set(market.marketId, market);
    });

    // State-aware cache invalidation - different TTL based on market state
    const now = new Date();
    
    const staleMarketIds = marketIds.filter(marketId => {
      const cached = cachedMarketsMap.get(marketId);
      if (!cached) return true; // No cache = needs fresh data
      
      // High priority requests bypass cache for active markets
      if (isHighPriority) {
        const closeTime = new Date(cached.closeTime).getTime();
        const isActive = !cached.resolved && !cached.voided && now.getTime() < closeTime;
        if (isActive) {
          return true; // Always fetch fresh data for active markets on high-priority requests
        }
      }
      
      // Determine appropriate TTL based on market state
      const closeTime = new Date(cached.closeTime).getTime();
      const isActive = !cached.resolved && !cached.voided && now.getTime() < closeTime;
      
      let ttlMinutes;
      if (cached.voided || (cached.resolved && now.getTime() - closeTime > 24 * 60 * 60 * 1000)) {
        // Final state markets: very long TTL (24 hours)
        ttlMinutes = 24 * 60;
      } else if (cached.resolved) {
        // Recently resolved markets: long TTL (30 minutes) for withdrawal checking
        ttlMinutes = 30;
      } else if (!isActive) {
        // Closed but unresolved: medium TTL (5 minutes)
        ttlMinutes = 5;
      } else {
        // Active markets: short TTL (2 minutes, or 30 seconds for high priority)
        ttlMinutes = isHighPriority ? 0.5 : 2;
      }
      
      const ttlMs = ttlMinutes * 60 * 1000;
      const cacheAge = now.getTime() - cached.lastUpdated.getTime();
      
      return cacheAge > ttlMs;
    });

    // Fetch fresh blockchain data for stale markets
    let freshMarkets = new Map<number, IMarketCache>();
    if (staleMarketIds.length > 0) {
      freshMarkets = await getMarketsFromBlockchain(staleMarketIds);
      
      // Update cache with fresh data
      const updatePromises = Array.from(freshMarkets.entries()).map(([marketId, market]) => {
        return MarketCache.findOneAndUpdate(
          { marketId },
          market,
          { upsert: true }
        );
      });
      
      await Promise.all(updatePromises);
    }

    // Combine cached and fresh data
    const result: Record<string, IMarketCache> = {};
    const changes: number[] = [];
    
    for (const marketId of marketIds) {
      let market = freshMarkets.get(marketId);
      if (!market) {
        market = cachedMarketsMap.get(marketId);
      }
      
      if (market) {
        result[marketId] = market;
        if (freshMarkets.has(marketId)) {
          changes.push(marketId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      markets: result,
      changes, // Markets that actually changed
      timestamp: new Date().toISOString(),
      fromCache: staleMarketIds.length === 0,
      metadata: {
        requestedMarkets: marketIds.length,
        staleCacheMarkets: staleMarketIds.length,
        freshDataFetched: freshMarkets.size,
        isHighPriority,
        cacheStats: {
          activeMarkets: Object.values(result).filter(m => !m.resolved && !m.voided && new Date(m.closeTime).getTime() > Date.now()).length,
          resolvedMarkets: Object.values(result).filter(m => m.resolved).length,
          closedMarkets: Object.values(result).filter(m => !m.resolved && !m.voided && new Date(m.closeTime).getTime() <= Date.now()).length,
          voidedMarkets: Object.values(result).filter(m => m.voided).length,
        }
      },
    });

  } catch (error) {
    console.error('Failed to fetch bulk markets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}