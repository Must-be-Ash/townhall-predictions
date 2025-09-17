import { createPublicClient, http, getContract, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";
import { BetEvent } from "@/lib/models/BetEvent";
import { SyncLog } from "@/lib/models/SyncLog";
import { MarketCache, IMarketCache } from "@/lib/models/MarketCache";
import connectDB from "@/lib/db";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { TOWN_HALL_PREDICTIONS_ABI } from "@/lib/abis";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`, {
    retryCount: 3,
    retryDelay: 1000,
  }),
});

const contractAddress = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;

// Configuration for chunked sync (compatible with Alchemy free tier)
const CHUNK_SIZE = 10; // Alchemy free tier allows max 10 blocks per eth_getLogs request
const RATE_LIMIT_DELAY = 50; // ms delay between requests
const MARKET_BUFFER_DAYS = 1; // Days after market close to continue syncing

/**
 * Gets markets that need bet event syncing
 * Returns active markets and recently closed markets (within buffer period)
 */
async function getRelevantMarkets(): Promise<IMarketCache[]> {
  const now = new Date();
  const bufferTime = new Date(now.getTime() - (MARKET_BUFFER_DAYS * 24 * 60 * 60 * 1000));

  // Find markets that are either:
  // 1. Active (not resolved, not voided, close time in future)
  // 2. Recently closed (closed within buffer period)
  // 3. Resolved but within buffer period (to catch late resolutions)
  const relevantMarkets = await MarketCache.find({
    $or: [
      // Active markets
      {
        resolved: false,
        voided: false,
        closeTime: { $gt: now }
      },
      // Recently closed markets
      {
        closeTime: { $gt: bufferTime, $lte: now }
      },
      // Recently resolved markets
      {
        resolved: true,
        lastUpdated: { $gt: bufferTime }
      }
    ]
  }).sort({ createdAt: 1 }); // Oldest first for chronological processing

  console.log(`📊 Found ${relevantMarkets.length} relevant markets for sync:`);
  for (const market of relevantMarkets) {
    const status = market.resolved ? 'RESOLVED' :
                   market.voided ? 'VOIDED' :
                   market.closeTime > now ? 'ACTIVE' : 'CLOSED';
    console.log(`  Market ${market.marketId}: ${status} - "${market.question.slice(0, 50)}..."`);
  }

  return relevantMarkets;
}


/**
 * Fetches all BetPlaced events from the smart contract and stores them in the database
 */
export async function syncAllBetEvents(): Promise<{ success: number; failed: number; skipped: number }> {
  try {
    await connectDB();
    
    console.log('🎯 Starting bet event synchronization...');
    
    // Get the contract deployment block to avoid scanning the entire blockchain
    // The current contract was deployed relatively recently, so we can start from a recent block
    const fromBlock = 17000000n; // Adjust this to your contract deployment block
    
    console.log(`Fetching BetPlaced events from block ${fromBlock}...`);
    
    // Fetch all BetPlaced events
    const betPlacedEvents = await publicClient.getLogs({
      address: contractAddress,
      event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, bool outcome)'),
      fromBlock,
      toBlock: 'latest'
    });
    
    console.log(`Found ${betPlacedEvents.length} BetPlaced events`);
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process each event
    for (const event of betPlacedEvents) {
      try {
        const { marketId, user, outcome } = event.args as {
          marketId: bigint;
          user: string;
          outcome: boolean;
        };
        
        const marketIdNum = Number(marketId);
        const userAddress = user.toLowerCase();
        const transactionHash = event.transactionHash.toLowerCase();
        
        // Check if this bet event already exists
        const existingBet = await BetEvent.findOne({ transactionHash });
        if (existingBet) {
          skipped++;
          continue;
        }
        
        // Get block details for timestamp
        const block = await publicClient.getBlock({
          blockNumber: event.blockNumber
        });
        
        // Create bet event record
        const betEvent = new BetEvent({
          marketId: marketIdNum,
          userAddress,
          outcome,
          amount: "1000000", // 1 USDC (6 decimals)
          transactionHash,
          blockNumber: Number(event.blockNumber),
          timestamp: new Date(Number(block.timestamp) * 1000)
        });
        
        await betEvent.save();
        success++;
        
        if (success % 10 === 0) {
          console.log(`Processed ${success} bet events...`);
        }
        
      } catch (error) {
        console.error(`Failed to process bet event ${event.transactionHash}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ Bet event sync completed: ${success} successful, ${failed} failed, ${skipped} skipped`);
    return { success, failed, skipped };
    
  } catch (error) {
    console.error('❌ Failed to sync bet events:', error);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

/**
 * Syncs bet events for a specific market
 */
export async function syncBetEventsForMarket(marketId: number): Promise<{ success: number; failed: number; skipped: number }> {
  try {
    await connectDB();
    
    console.log(`🎯 Syncing bet events for market ${marketId}...`);
    
    // Get BetPlaced events for this specific market
    const betPlacedEvents = await publicClient.getLogs({
      address: contractAddress,
      event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, bool outcome)'),
      args: {
        marketId: BigInt(marketId)
      },
      fromBlock: 17000000n, // Adjust based on when your contract was deployed
      toBlock: 'latest'
    });
    
    console.log(`Found ${betPlacedEvents.length} BetPlaced events for market ${marketId}`);
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const event of betPlacedEvents) {
      try {
        const { marketId: eventMarketId, user, outcome } = event.args as {
          marketId: bigint;
          user: string;
          outcome: boolean;
        };
        
        const userAddress = user.toLowerCase();
        const transactionHash = event.transactionHash.toLowerCase();
        
        // Check if this bet event already exists
        const existingBet = await BetEvent.findOne({ transactionHash });
        if (existingBet) {
          skipped++;
          continue;
        }
        
        // Get transaction details
        const block = await publicClient.getBlock({
          blockNumber: event.blockNumber
        });
        
        // Create bet event record
        const betEvent = new BetEvent({
          marketId: Number(eventMarketId),
          userAddress,
          outcome,
          amount: "1000000", // 1 USDC (6 decimals)
          transactionHash,
          blockNumber: Number(event.blockNumber),
          timestamp: new Date(Number(block.timestamp) * 1000)
        });
        
        await betEvent.save();
        success++;
        
      } catch (error) {
        console.error(`Failed to process bet event ${event.transactionHash}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ Market ${marketId} bet event sync completed: ${success} successful, ${failed} failed, ${skipped} skipped`);
    return { success, failed, skipped };
    
  } catch (error) {
    console.error(`❌ Failed to sync bet events for market ${marketId}:`, error);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

/**
 * Gets the latest processed block number to enable incremental syncing
 */
export async function getLatestProcessedBlock(): Promise<number> {
  try {
    await connectDB();
    
    const latestBet = await BetEvent.findOne({}).sort({ blockNumber: -1 });
    return latestBet?.blockNumber || 17000000; // Default to deployment block
    
  } catch (error) {
    console.error('Failed to get latest processed block:', error);
    return 17000000;
  }
}

/**
 * Simplified recent-blocks-only sync (similar to working script approach)
 * Scans only the last 2,000-3,000 blocks with per-market filtering
 * Compatible with Alchemy free tier (10-block chunks)
 */
export async function syncNewBetEvents(triggeredBy: 'cron' | 'manual' | 'admin' = 'manual'): Promise<{ success: number; failed: number; skipped: number }> {
  const startTime = new Date();
  let currentBlock: bigint | undefined;
  let totalChunksProcessed = 0;

  try {
    await connectDB();
    currentBlock = await publicClient.getBlockNumber();
    const currentBlockNumber = Number(currentBlock);

    // Simple recent-blocks-only approach (like working script)
    const RECENT_BLOCKS = 1200; // Scan last ~40 minutes of activity (2 sec block time)
    const fromBlock = Math.max(currentBlockNumber - RECENT_BLOCKS, 30333063); // Contract deployment minimum
    const toBlock = currentBlockNumber;

    console.log(`🎯 Recent-blocks sync starting...`);
    console.log(`📦 Scanning blocks ${fromBlock.toLocaleString()} to ${toBlock.toLocaleString()} (${(toBlock - fromBlock + 1).toLocaleString()} blocks)`);

    // Get relevant markets for filtering
    const relevantMarkets = await getRelevantMarkets();
    const relevantMarketIds = new Set(relevantMarkets.map(m => m.marketId));

    if (relevantMarkets.length === 0) {
      console.log('📭 No relevant markets found - sync complete');

      const endTime = new Date();
      await SyncLog.create({
        operation: 'bet-sync',
        status: 'success',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        result: { success: 0, failed: 0, skipped: 0 },
        triggeredBy,
        metadata: {
          fromBlock,
          toBlock: currentBlockNumber,
          eventsProcessed: 0,
          marketsProcessed: 0,
          chunksProcessed: 0
        }
      });

      return { success: 0, failed: 0, skipped: 0 };
    }

    console.log(`🎯 Filtering for ${relevantMarkets.length} relevant markets: ${Array.from(relevantMarketIds).join(', ')}`);

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalEventsFound = 0;

    // Process all relevant markets in the recent block range using small chunks
    const result = await processRecentBlocksInChunks(fromBlock, toBlock, relevantMarketIds);

    totalSuccess = result.success;
    totalFailed = result.failed;
    totalSkipped = result.skipped;
    totalEventsFound = result.eventsFound;
    totalChunksProcessed = result.chunksProcessed;

    const duration = Date.now() - startTime.getTime();
    console.log(`\n🎉 Recent-blocks sync completed in ${duration}ms:`);
    console.log(`  📦 Chunks processed: ${totalChunksProcessed}`);
    console.log(`  🎯 Events found: ${totalEventsFound}`);
    console.log(`  ✅ Success: ${totalSuccess}, ❌ Failed: ${totalFailed}, ⏭️ Skipped: ${totalSkipped}`);

    // Log successful sync
    const endTime = new Date();
    const status = totalFailed > 0 ? 'partial' : 'success';
    await SyncLog.create({
      operation: 'bet-sync',
      status,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      result: { success: totalSuccess, failed: totalFailed, skipped: totalSkipped },
      triggeredBy,
      metadata: {
        fromBlock,
        toBlock: currentBlockNumber,
        eventsProcessed: totalEventsFound,
        marketsProcessed: relevantMarkets.length,
        chunksProcessed: totalChunksProcessed
      }
    });

    return { success: totalSuccess, failed: totalFailed, skipped: totalSkipped };

  } catch (error) {
    console.error('❌ Recent-blocks sync failed:', error);

    // Log failed sync
    const endTime = new Date();
    await SyncLog.create({
      operation: 'bet-sync',
      status: 'failure',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      error: error instanceof Error ? error.message : 'Unknown error',
      triggeredBy,
      metadata: {
        fromBlock: currentBlock ? Number(currentBlock) - 2500 : undefined,
        toBlock: currentBlock ? Number(currentBlock) : undefined,
        chunksProcessed: totalChunksProcessed
      }
    }).catch(() => {
      console.error('Failed to log sync failure');
    });

    return { success: 0, failed: 0, skipped: 0 };
  }
}

/**
 * Processes recent blocks in chunks, filtering for relevant markets (simplified approach)
 */
async function processRecentBlocksInChunks(
  fromBlock: number,
  toBlock: number,
  relevantMarketIds: Set<number>
): Promise<{ success: number; failed: number; skipped: number; eventsFound: number; chunksProcessed: number }> {
  let success = 0;
  let failed = 0;
  let skipped = 0;
  let eventsFound = 0;
  let chunksProcessed = 0;

  const totalBlocks = toBlock - fromBlock + 1;
  let processedBlocks = 0;

  console.log(`🔍 Processing ${totalBlocks.toLocaleString()} blocks in ${CHUNK_SIZE}-block chunks...`);

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
    chunksProcessed++;
    processedBlocks += (end - start + 1);

    try {
      // Progress indicator
      const progress = ((processedBlocks / totalBlocks) * 100).toFixed(1);
      process.stdout.write(`\r📊 ${progress}% (${processedBlocks.toLocaleString()}/${totalBlocks.toLocaleString()} blocks)`);

      // Get ALL BetPlaced events in this chunk (no market filter in the query)
      const events = await publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, bool outcome, uint256 amount)'),
        fromBlock: BigInt(start),
        toBlock: BigInt(end)
      });

      if (events.length > 0) {
        console.log(`\n🎯 Found ${events.length} events in blocks ${start.toLocaleString()}-${end.toLocaleString()}`);
      }

      // Process each event, filtering for relevant markets
      for (const event of events) {
        try {
          const { marketId, user, outcome, amount } = event.args as {
            marketId: bigint;
            user: string;
            outcome: boolean;
            amount: bigint;
          };

          const marketIdNum = Number(marketId);

          // Filter for relevant markets only
          if (!relevantMarketIds.has(marketIdNum)) {
            continue;
          }

          eventsFound++;
          const userAddress = user.toLowerCase();
          const transactionHash = event.transactionHash.toLowerCase();

          // Check if this bet event already exists
          const existingBet = await BetEvent.findOne({ transactionHash });
          if (existingBet) {
            skipped++;
            continue;
          }

          // Get block timestamp
          const block = await publicClient.getBlock({
            blockNumber: event.blockNumber
          });

          // Create bet event record
          const betEvent = new BetEvent({
            marketId: marketIdNum,
            userAddress,
            outcome,
            amount: amount.toString(),
            transactionHash,
            blockNumber: Number(event.blockNumber),
            timestamp: new Date(Number(block.timestamp) * 1000)
          });

          await betEvent.save();
          success++;

          console.log(`  ✅ Saved: Market ${marketIdNum}, ${userAddress.slice(0,6)}...${userAddress.slice(-4)} (${outcome ? 'YES' : 'NO'}) - $${(Number(amount) / 1000000).toFixed(2)}`);

        } catch (error) {
          console.error(`  ❌ Failed to process event ${event.transactionHash}:`, error);
          failed++;
        }
      }

      // Rate limiting between chunks
      if (start + CHUNK_SIZE <= toBlock) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

    } catch (error) {
      console.error(`\n⚠️ Error in chunk ${start.toLocaleString()}-${end.toLocaleString()}:`, error);
      failed++;
    }
  }

  console.log(''); // New line after progress indicator
  return { success, failed, skipped, eventsFound, chunksProcessed };
}


/**
 * Validates bet events against contract data for integrity
 */
export async function validateBetEventIntegrity(): Promise<{ valid: number; invalid: number }> {
  try {
    await connectDB();
    
    console.log('🔍 Validating bet event integrity...');
    
    // Get all bet events
    const betEvents = await BetEvent.find({}).lean();
    
    let valid = 0;
    let invalid = 0;
    
    for (const betEvent of betEvents) {
      try {
        // Get user bet from contract
        const contract = getContract({
          address: contractAddress,
          abi: TOWN_HALL_PREDICTIONS_ABI,
          client: publicClient
        });
        
        const userBet = await contract.read.userBets([
          BigInt(betEvent.marketId),
          betEvent.userAddress as `0x${string}`
        ]);
        
        // Validate: user should have a bet with matching outcome
        // userBet returns [hasBet, outcome, withdrawn]
        const [hasBet, outcome] = userBet as [boolean, boolean, boolean];
        
        if (hasBet && outcome === betEvent.outcome) {
          valid++;
        } else {
          console.warn(`Invalid bet event: ${betEvent.transactionHash} - Contract shows hasBet: ${hasBet}, outcome: ${outcome}, but event shows outcome: ${betEvent.outcome}`);
          invalid++;
        }
        
      } catch (error) {
        console.error(`Failed to validate bet event ${betEvent.transactionHash}:`, error);
        invalid++;
      }
    }
    
    console.log(`✅ Bet event validation completed: ${valid} valid, ${invalid} invalid`);
    return { valid, invalid };
    
  } catch (error) {
    console.error('❌ Failed to validate bet event integrity:', error);
    return { valid: 0, invalid: 0 };
  }
}