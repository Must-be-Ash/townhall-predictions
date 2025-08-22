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

// Request deduplication cache
const requestCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 10 * 1000; // 10 seconds

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 300; // requests per minute for individual markets
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

async function getMarketFromBlockchain(marketId: number) {
  try {
    const contractAddress = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
    
    const [marketData] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: TOWN_HALL_PREDICTIONS_ABI,
        functionName: "markets",
        args: [BigInt(marketId)],
      }),
    ]);

    return {
      marketId,
      question: marketData[0],
      closeTime: new Date(Number(marketData[1]) * 1000),
      resolved: marketData[2],
      winningOutcome: marketData[3],
      yesTotal: marketData[4].toString(),
      noTotal: marketData[5].toString(),
      yesCount: Number(marketData[6]),
      noCount: Number(marketData[7]),
      voided: marketData[8],
      createdAt: new Date(Number(marketData[9]) * 1000),
      lastUpdated: new Date(),
      participants: [],
    } as IMarketCache;
  } catch (error) {
    console.error(`Failed to fetch market ${marketId} from blockchain:`, error);
    return null;
  }
}

async function verifyMarketIntegrity(cachedMarket: IMarketCache, blockchainMarket: IMarketCache): Promise<boolean> {
  // Verify critical fields match blockchain
  const criticalFields = [
    'question',
    'resolved',
    'winningOutcome',
    'voided',
    'yesCount',
    'noCount',
  ];

  for (const field of criticalFields) {
    const cachedValue = (cachedMarket as unknown as Record<string, unknown>)[field];
    const blockchainValue = (blockchainMarket as unknown as Record<string, unknown>)[field];
    if (cachedValue !== blockchainValue) {
      console.warn(`Data integrity issue for market ${cachedMarket.marketId}: ${field} mismatch`);
      return false;
    }
  }

  // Check if totals are close (allow for precision differences)
  const yesTotalDiff = Math.abs(Number(cachedMarket.yesTotal) - Number(blockchainMarket.yesTotal));
  const noTotalDiff = Math.abs(Number(cachedMarket.noTotal) - Number(blockchainMarket.noTotal));
  
  if (yesTotalDiff > 1 || noTotalDiff > 1) { // Allow 1 wei difference
    console.warn(`Data integrity issue for market ${cachedMarket.marketId}: total amounts mismatch`);
    return false;
  }

  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const awaitedParams = await params;
    const marketId = parseInt(awaitedParams.id);
    if (isNaN(marketId) || marketId < 0) {
      return NextResponse.json(
        { error: 'Invalid market ID' },
        { status: 400 }
      );
    }

    // Check request deduplication cache first
    const cacheKey = `market_${marketId}`;
    const now = Date.now();
    const cached = requestCache.get(cacheKey);
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        ...(cached.data as Record<string, unknown>),
        fromDeduplicationCache: true,
      });
    }

    if (!checkRateLimit(ip, origin || undefined)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    await connectDB();

    // Check if force refresh is requested (for post-transaction updates)
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Try to get from cache first (unless force refresh is requested)
    const cachedMarket = await MarketCache.findOne({ marketId }).lean() as IMarketCache | null;
    let market;
    let fromCache = false;

    if (cachedMarket && !forceRefresh) {
      // Check if cache is stale (older than 2 minutes for individual market)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      if (cachedMarket.lastUpdated > twoMinutesAgo) {
        // Cache is fresh, get real-time multipliers from blockchain
        const contractAddress = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
        
        try {
          const [yesMultiplier, noMultiplier] = await Promise.all([
            publicClient.readContract({
              address: contractAddress,
              abi: TOWN_HALL_PREDICTIONS_ABI,
              functionName: "getPayoutMultiplier",
              args: [BigInt(marketId), true],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: TOWN_HALL_PREDICTIONS_ABI,
              functionName: "getPayoutMultiplier",
              args: [BigInt(marketId), false],
            }),
          ]);

          market = {
            ...cachedMarket,
            yesMultiplier: Number(yesMultiplier),
            noMultiplier: Number(noMultiplier),
          };
          fromCache = true;
        } catch {
          console.error('Failed to get multipliers, falling back to blockchain data');
          // Fall back to full blockchain fetch
        }
      }
    }

    // If cache miss or stale, get from blockchain
    if (!market) {
      const blockchainMarket = await getMarketFromBlockchain(marketId);
      
      if (!blockchainMarket) {
        return NextResponse.json(
          { error: 'Market not found' },
          { status: 404 }
        );
      }

      // If we had cached data, verify integrity before updating
      if (cachedMarket) {
        const isIntegrityOk = await verifyMarketIntegrity(cachedMarket, blockchainMarket);
        if (!isIntegrityOk) {
          console.error(`Data integrity check failed for market ${marketId}, forcing blockchain update`);
        }
      }

      // Update cache with fresh blockchain data
      try {
        await MarketCache.findOneAndUpdate(
          { marketId },
          {
            ...blockchainMarket,
            participants: cachedMarket?.participants || [],
          },
          { upsert: true }
        );
      } catch (error) {
        console.error('Failed to update cache:', error);
      }

      market = blockchainMarket;
      fromCache = false;
    }

    const responseData = {
      success: true,
      market,
      fromCache,
      timestamp: new Date().toISOString(),
    };

    // Store in deduplication cache
    requestCache.set(cacheKey, {
      data: responseData,
      timestamp: now,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Failed to fetch market:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}