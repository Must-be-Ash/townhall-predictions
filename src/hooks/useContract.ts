"use client";

import { useEvmAddress, useSendEvmTransaction } from "@coinbase/cdp-hooks";
import { useCallback } from "react";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { baseSepolia } from "viem/chains";
import { CONTRACT_ADDRESSES, BET_AMOUNT } from "@/lib/constants";
import { TOWN_HALL_PREDICTIONS_ABI, USDC_ABI } from "@/lib/abis";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`, {
    retryCount: 3,
    retryDelay: 1000,
  }),
});

export function useContract() {
  const { evmAddress } = useEvmAddress();
  const { sendEvmTransaction } = useSendEvmTransaction();
  
  const marketContract = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
  const usdcContract = CONTRACT_ADDRESSES.USDC[84532] as `0x${string}`;
  
  // Helper function to retry contract calls with exponential backoff for rate limits
  const retryContractCall = useCallback(async <T>(
    contractCall: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        return await contractCall();
      } catch (error: unknown) {
        attempts++;
        
        // Check if it's a rate limit error
        if (error instanceof Error && 
            (error.message.includes('over rate limit') || 
             error.message.includes('429') ||
             error.message.includes('rate limit'))) {
          
          if (attempts < maxAttempts) {
            const delay = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`Rate limit hit, retrying in ${delay}ms... (attempt ${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // If not a rate limit error or max attempts reached, throw the error
        throw error;
      }
    }
    
    throw new Error(`Max retry attempts (${maxAttempts}) exceeded`);
  }, []);
  
  // Helper function to handle nonce retry logic
  const sendTransactionWithRetry = useCallback(async (transactionParams: {
    transaction: {
      to: `0x${string}`;
      data: `0x${string}`;
      gas: bigint;
      chainId: number;
      type: "eip1559";
    };
    evmAccount: `0x${string}`;
    network: "base-sepolia";
  }) => {
    let result;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        result = await sendEvmTransaction(transactionParams);
        break; // Success, exit retry loop
      } catch (error: unknown) {
        attempts++;
        
        // Check if it's a nonce error
        if (error instanceof Error && error.message.includes('Nonce too low') && attempts < maxAttempts) {
          console.log(`Nonce error on attempt ${attempts}, retrying...`);
          // Wait a short time before retry to let nonce sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // If not a nonce error or max attempts reached, throw the error
        throw error;
      }
    }
    
    return result;
  }, [sendEvmTransaction]);
  
  const createMarket = useCallback(async (question: string, closeTime: number) => {
    if (!evmAddress) throw new Error("Wallet not connected");
    
    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "createMarket",
      args: [question, BigInt(closeTime)],
    });
    
    const result = await sendTransactionWithRetry({
      transaction: {
        to: marketContract,
        data,
        gas: 200000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });
    
    return result;
  }, [evmAddress, sendTransactionWithRetry, marketContract]);
  
  const placeBet = useCallback(async (marketId: number, outcome: boolean) => {
    if (!evmAddress) throw new Error("Wallet not connected");
    
    console.log("Encoding transaction data...");
    console.log("Market ID:", marketId, "Outcome:", outcome);
    console.log("Contract address:", marketContract);
    
    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "placeBet",
      args: [BigInt(marketId), outcome],
    });
    
    console.log("Sending transaction...");
    
    const result = await sendTransactionWithRetry({
      transaction: {
        to: marketContract,
        data,
        gas: 300000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });
    
    console.log("Transaction sent, result:", result);
    return result;
  }, [evmAddress, sendTransactionWithRetry, marketContract]);
  
  const approveUSDC = useCallback(async (amount: bigint) => {
    if (!evmAddress) throw new Error("Wallet not connected");
    
    const data = encodeFunctionData({
      abi: USDC_ABI,
      functionName: "approve",
      args: [marketContract, amount],
    });
    
    const result = await sendTransactionWithRetry({
      transaction: {
        to: usdcContract,
        data,
        gas: 100000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });
    
    return result;
  }, [evmAddress, sendTransactionWithRetry, usdcContract, marketContract]);
  
  const checkUSDCAllowance = useCallback(async (owner: string): Promise<bigint> => {
    const allowance = await publicClient.readContract({
      address: usdcContract,
      abi: USDC_ABI,
      functionName: "allowance",
      args: [owner as `0x${string}`, marketContract],
    });
    
    return allowance as bigint;
  }, [usdcContract, marketContract]);
  
  const getMarket = useCallback(async (marketId: number) => {
    const market = await retryContractCall(() => 
      publicClient.readContract({
        address: marketContract,
        abi: TOWN_HALL_PREDICTIONS_ABI,
        functionName: "markets",
        args: [BigInt(marketId)],
      })
    );
    
    // markets returns: [question, closeTime, resolved, winningOutcome, yesTotal, noTotal, yesCount, noCount, voided, createdAt, creator]
    // Convert to object format
    return {
      question: market[0],
      closeTime: market[1],
      resolved: market[2],
      winningOutcome: market[3],
      yesTotal: market[4],
      noTotal: market[5],
      yesCount: market[6],
      noCount: market[7],
      voided: market[8],
      createdAt: market[9],
      creator: market[10],
    };
  }, [marketContract, retryContractCall]);
  
  const calculateWinnings = useCallback(async (marketId: number, userAddress: string) => {
    const winnings = await retryContractCall(() =>
      publicClient.readContract({
        address: marketContract,
        abi: TOWN_HALL_PREDICTIONS_ABI,
        functionName: "calculateWinnings",
        args: [BigInt(marketId), userAddress as `0x${string}`],
      })
    );
    
    return winnings as bigint;
  }, [marketContract, retryContractCall]);
  
  const getMarketCounter = useCallback(async () => {
    const counter = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "marketCounter",
    });
    
    return counter as bigint;
  }, [marketContract]);
  
  const getUSDCBalance = useCallback(async (address: string) => {
    const balance = await publicClient.readContract({
      address: usdcContract,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    
    return balance as bigint;
  }, [usdcContract]);

  const getContractOwner = useCallback(async () => {
    const owner = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "owner",
    });
    
    return owner as string;
  }, [marketContract]);

  const getPayoutMultiplier = useCallback(async (marketId: number, outcome: boolean) => {
    const multiplier = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "getPayoutMultiplier",
      args: [BigInt(marketId), outcome],
    });
    
    return multiplier as bigint;
  }, [marketContract]);

  const getDynamicCap = useCallback(async (marketId: number, outcome: boolean) => {
    const cap = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "getDynamicCap",
      args: [BigInt(marketId), outcome],
    });
    
    return cap as bigint;
  }, [marketContract]);

  const getBaseMaxBetsPerSide = useCallback(async () => {
    const baseMax = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "BASE_MAX_BETS_PER_SIDE",
    });
    
    return baseMax as bigint;
  }, [marketContract]);

  const getMultiplierBase = useCallback(async () => {
    const multiplierBase = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "MULTIPLIER_BASE",
    });
    
    return multiplierBase as bigint;
  }, [marketContract]);

  const getMarketParticipants = useCallback(async () => {
    // For now, return empty array as we don't have a contract function that tracks all participants
    // This would require listening to BetPlaced events or having an on-chain participant registry
    return [];
  }, []);

  const getUserBet = useCallback(async (marketId: number, userAddress: string) => {
    try {
      const result = await retryContractCall(() =>
        publicClient.readContract({
          address: marketContract,
          abi: TOWN_HALL_PREDICTIONS_ABI,
          functionName: 'userBets',
          args: [BigInt(marketId), userAddress as `0x${string}`]
        })
      );
      
      // Return the UserBet struct: (hasBet, outcome, withdrawn)
      return {
        hasBet: result[0] as boolean,
        outcome: result[1] as boolean,
        withdrawn: result[2] as boolean
      };
    } catch (error) {
      console.error("Failed to get user bet:", error);
      return { hasBet: false, outcome: false, withdrawn: false };
    }
  }, [marketContract, retryContractCall]);

  const getAllUserWinnings = useCallback(async (userAddress: string) => {
    if (!userAddress) return { markets: [], totalWinnings: 0n };

    try {
      // Get the total number of markets
      const marketCount = await getMarketCounter();
      const marketCountNumber = Number(marketCount);
      
      const marketsWithWinnings = [];
      let totalWinnings = 0n;

      // Check each market for pending winnings
      for (let i = 1; i <= marketCountNumber; i++) {
        try {
          const [market, userBet, winnings] = await Promise.all([
            getMarket(i),
            getUserBet(i, userAddress),
            calculateWinnings(i, userAddress)
          ]);

          // Only include markets where user has winnings and hasn't withdrawn
          if (market.resolved && userBet.hasBet && winnings > 0n && !userBet.withdrawn) {
            marketsWithWinnings.push({
              marketId: i,
              question: market.question,
              winnings: winnings,
              outcome: userBet.outcome
            });
            totalWinnings += winnings;
          }
        } catch (error) {
          console.error(`Failed to check market ${i}:`, error);
          // Continue checking other markets even if one fails
        }
      }

      return {
        markets: marketsWithWinnings,
        totalWinnings
      };
    } catch (error) {
      console.error("Failed to get all user winnings:", error);
      return { markets: [], totalWinnings: 0n };
    }
  }, [getMarketCounter, getMarket, getUserBet, calculateWinnings]);

  const resolveMarket = useCallback(async (marketId: number, winningOutcome: boolean) => {
    if (!evmAddress) {
      throw new Error("Wallet not connected");
    }

    console.log("Encoding resolve transaction data...");
    console.log("Market ID:", marketId, "Outcome:", winningOutcome);
    console.log("Contract address:", marketContract);

    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "resolveMarket",
      args: [BigInt(marketId), winningOutcome],
    });

    console.log("Sending resolve transaction...");
    const result = await sendTransactionWithRetry({
      transaction: {
        to: marketContract,
        data,
        gas: 500000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });

    console.log("Resolve transaction sent, result:", result);
    return result;
  }, [evmAddress, sendTransactionWithRetry, marketContract]);

  const voidMarket = useCallback(async (marketId: number) => {
    if (!evmAddress) {
      throw new Error("Wallet not connected");
    }

    console.log("Encoding void transaction data...");
    console.log("Market ID:", marketId);
    console.log("Contract address:", marketContract);

    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "voidMarket",
      args: [BigInt(marketId)],
    });

    console.log("Sending void transaction...");
    const result = await sendTransactionWithRetry({
      transaction: {
        to: marketContract,
        data,
        gas: 300000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });

    console.log("Void transaction sent, result:", result);
    return result;
  }, [evmAddress, sendTransactionWithRetry, marketContract]);

  const withdrawWinnings = useCallback(async (marketId: number) => {
    if (!evmAddress) {
      throw new Error("Wallet not connected");
    }

    console.log("Encoding withdraw transaction data...");
    console.log("Market ID:", marketId);
    console.log("Contract address:", marketContract);

    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "withdrawWinnings",
      args: [BigInt(marketId)],
    });

    console.log("Sending withdraw transaction...");
    const result = await sendTransactionWithRetry({
      transaction: {
        to: marketContract,
        data,
        gas: 300000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });

    console.log("Withdraw transaction sent, result:", result);
    return result;
  }, [evmAddress, sendTransactionWithRetry, marketContract]);

  const withdrawRefund = useCallback(async (marketId: number) => {
    if (!evmAddress) {
      throw new Error("Wallet not connected");
    }
    console.log("Encoding refund transaction data...");
    console.log("Market ID:", marketId);
    console.log("Contract address:", marketContract);
    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "withdrawRefund",
      args: [BigInt(marketId)],
    });
    console.log("Sending refund transaction...");
    const result = await sendTransactionWithRetry({
      transaction: {
        to: marketContract,
        data,
        gas: 300000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });
    console.log("Refund transaction sent, result:", result);
    return result;
  }, [evmAddress, sendTransactionWithRetry, marketContract]);


  const isDeadPoolMarket = useCallback(async (marketId: number): Promise<boolean> => {
    try {
      const result = await publicClient.readContract({
        address: marketContract,
        abi: TOWN_HALL_PREDICTIONS_ABI,
        functionName: 'isDeadPoolMarket',
        args: [BigInt(marketId)]
      });
      return result as boolean;
    } catch (error) {
      console.error("Failed to check if market is dead pool:", error);
      return false;
    }
  }, [marketContract]);

  const deadPoolClaimed = useCallback(async (marketId: number): Promise<boolean> => {
    try {
      const result = await retryContractCall(() =>
        publicClient.readContract({
          address: marketContract,
          abi: TOWN_HALL_PREDICTIONS_ABI,
          functionName: 'deadPoolClaimed',
          args: [BigInt(marketId)]
        })
      );
      return result as boolean;
    } catch (error) {
      console.error("Failed to check if dead pool funds claimed:", error);
      return false;
    }
  }, [marketContract, retryContractCall]);

  const getAllDeadPoolFunds = useCallback(async () => {
    try {
      // Get the total number of markets
      const marketCount = await getMarketCounter();
      const marketCountNumber = Number(marketCount);
      
      const deadPoolMarkets = [];
      let totalDeadPoolFunds = 0n;

      // Check each market for dead pool funds
      for (let i = 1; i <= marketCountNumber; i++) {
        try {
          const [market, isDeadPool, isClaimed] = await Promise.all([
            getMarket(i),
            isDeadPoolMarket(i),
            deadPoolClaimed(i)
          ]);

          // Only include markets that are dead pools and haven't been claimed
          if (isDeadPool && !isClaimed) {
            const totalPool = market.yesTotal + market.noTotal;
            if (totalPool > 0n) {
              deadPoolMarkets.push({
                marketId: i,
                question: market.question,
                amount: totalPool,
                winningOutcome: market.winningOutcome
              });
              totalDeadPoolFunds += totalPool;
            }
          }
        } catch (error) {
          console.error(`Failed to check dead pool for market ${i}:`, error);
        }
      }

      return {
        markets: deadPoolMarkets,
        totalAmount: totalDeadPoolFunds
      };
    } catch (error) {
      console.error("Failed to get all dead pool funds:", error);
      return { markets: [], totalAmount: 0n };
    }
  }, [getMarketCounter, getMarket, isDeadPoolMarket, deadPoolClaimed]);

  const claimDeadPoolFunds = useCallback(async (marketId: number) => {
    if (!evmAddress) {
      throw new Error("No wallet connected");
    }

    console.log("Claiming dead pool funds for market:", marketId);

    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: 'claimDeadPoolFunds',
      args: [BigInt(marketId)]
    });

    const result = await sendTransactionWithRetry({
      transaction: {
        to: marketContract,
        data,
        gas: 200000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress as `0x${string}`,
      network: "base-sepolia",
    });

    console.log("Claim dead pool funds transaction sent, result:", result);
    return result;
  }, [evmAddress, sendTransactionWithRetry, marketContract]);
  
  return {
    createMarket,
    placeBet,
    approveUSDC,
    checkUSDCAllowance,
    getMarket,
    getUserBet,
    calculateWinnings,
    getMarketCounter,
    getUSDCBalance,
    getContractOwner,
    getPayoutMultiplier,
    getDynamicCap,
    getBaseMaxBetsPerSide,
    getMultiplierBase,
    getMarketParticipants,
    getAllUserWinnings,
    getAllDeadPoolFunds,
    isDeadPoolMarket,
    deadPoolClaimed,
    claimDeadPoolFunds,
    resolveMarket,
    voidMarket,
    withdrawWinnings,
    withdrawRefund,
    BET_AMOUNT,
  };
}