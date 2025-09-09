import { createPublicClient, http, getContract, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";
import { BetEvent } from "@/lib/models/BetEvent";
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
 * Syncs only new bet events since the last processed block
 */
export async function syncNewBetEvents(): Promise<{ success: number; failed: number; skipped: number }> {
  try {
    await connectDB();
    
    const fromBlock = await getLatestProcessedBlock();
    const currentBlock = await publicClient.getBlockNumber();
    
    console.log(`🎯 Syncing new bet events from block ${fromBlock} to ${currentBlock}...`);
    
    if (fromBlock >= currentBlock) {
      console.log('No new blocks to process');
      return { success: 0, failed: 0, skipped: 0 };
    }
    
    // Fetch new BetPlaced events
    const betPlacedEvents = await publicClient.getLogs({
      address: contractAddress,
      event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, bool outcome)'),
      fromBlock: BigInt(fromBlock + 1),
      toBlock: 'latest'
    });
    
    console.log(`Found ${betPlacedEvents.length} new BetPlaced events`);
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
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
        
        // Get block details
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
        
      } catch (error) {
        console.error(`Failed to process new bet event ${event.transactionHash}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ New bet event sync completed: ${success} successful, ${failed} failed, ${skipped} skipped`);
    return { success, failed, skipped };
    
  } catch (error) {
    console.error('❌ Failed to sync new bet events:', error);
    return { success: 0, failed: 0, skipped: 0 };
  }
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