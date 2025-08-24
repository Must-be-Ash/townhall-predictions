import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { MarketCache } from "@/lib/models/MarketCache";
import connectDB from "@/lib/db";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { TOWN_HALL_PREDICTIONS_ABI } from "@/lib/abis";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const ALLOWED_ORIGINS = [
  'https://www.townhall.lol',
  process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  'http://localhost:3001', // backup dev port
];

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
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
    
    const [marketData, yesMultiplier, noMultiplier] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: TOWN_HALL_PREDICTIONS_ABI,
        functionName: "markets",
        args: [BigInt(marketId)],
      }),
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
      yesMultiplier: Number(yesMultiplier),
      noMultiplier: Number(noMultiplier),
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error(`Failed to fetch market ${marketId} from blockchain:`, error);
    return null;
  }
}

async function syncMarketToCache(marketId: number) {
  try {
    const blockchainData = await getMarketFromBlockchain(marketId);
    if (!blockchainData) return null;

    await connectDB();
    
    const cachedMarket = await MarketCache.findOneAndUpdate(
      { marketId },
      {
        ...blockchainData,
        participants: [], // Will be populated separately
      },
      { upsert: true, new: true }
    );

    return cachedMarket;
  } catch (error) {
    console.error(`Failed to sync market ${marketId} to cache:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Security checks
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid origin' },
        { status: 403 }
      );
    }

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    await connectDB();

    // Get market counter from blockchain to know how many markets exist
    const contractAddress = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
    const marketCounter = await publicClient.readContract({
      address: contractAddress,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "marketCounter",
    });

    const totalMarkets = Number(marketCounter);
    
    // Try to get markets from cache first
    let markets = await MarketCache.find({})
      .sort({ createdAt: -1 })
      .lean();

    // If cache is incomplete or stale (older than 5 minutes), sync from blockchain
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const needsSync = markets.length < totalMarkets || 
                     markets.some(market => market.lastUpdated < fiveMinutesAgo);

    if (needsSync) {
      console.log('Cache stale or incomplete, syncing from blockchain...');
      
      // Sync all markets
      const syncPromises = [];
      for (let i = 1; i <= totalMarkets; i++) {
        syncPromises.push(syncMarketToCache(i));
      }
      
      await Promise.all(syncPromises);
      
      // Refetch from cache
      markets = await MarketCache.find({})
        .sort({ createdAt: -1 })
        .lean();
    }

    // Add multipliers from blockchain for real-time accuracy
    const marketsWithMultipliers = await Promise.all(
      markets.map(async (market) => {
        try {
          const [yesMultiplier, noMultiplier] = await Promise.all([
            publicClient.readContract({
              address: contractAddress,
              abi: TOWN_HALL_PREDICTIONS_ABI,
              functionName: "getPayoutMultiplier",
              args: [BigInt(market.marketId), true],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: TOWN_HALL_PREDICTIONS_ABI,
              functionName: "getPayoutMultiplier",
              args: [BigInt(market.marketId), false],
            }),
          ]);

          return {
            ...market,
            yesMultiplier: Number(yesMultiplier),
            noMultiplier: Number(noMultiplier),
          };
        } catch (error) {
          console.error(`Failed to get multipliers for market ${market.marketId}:`, error);
          return {
            ...market,
            yesMultiplier: 100,
            noMultiplier: 100,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      markets: marketsWithMultipliers,
      cached: !needsSync,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch markets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}