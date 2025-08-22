"use client";

import { useEvmAddress, useSendEvmTransaction } from "@coinbase/cdp-hooks";
import { useCallback } from "react";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { baseSepolia } from "viem/chains";
import { CONTRACT_ADDRESSES, BET_AMOUNT } from "@/lib/constants";
import { TOWN_HALL_PREDICTIONS_ABI, USDC_ABI } from "@/lib/abis";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export function useContract() {
  const { evmAddress } = useEvmAddress();
  const { sendEvmTransaction } = useSendEvmTransaction();
  
  const marketContract = CONTRACT_ADDRESSES.TOWN_HALL_PREDICTIONS[84532] as `0x${string}`;
  const usdcContract = CONTRACT_ADDRESSES.USDC[84532] as `0x${string}`;
  
  const createMarket = useCallback(async (question: string, closeTime: number) => {
    if (!evmAddress) throw new Error("Wallet not connected");
    
    const data = encodeFunctionData({
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "createMarket",
      args: [question, BigInt(closeTime)],
    });
    
    const result = await sendEvmTransaction({
      transaction: {
        to: marketContract,
        data,
        gas: 200000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress,
      network: "base-sepolia",
    });
    
    return result;
  }, [evmAddress, sendEvmTransaction, marketContract]);
  
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
    const result = await sendEvmTransaction({
      transaction: {
        to: marketContract,
        data,
        gas: 300000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress,
      network: "base-sepolia",
    });
    
    console.log("Transaction sent, result:", result);
    return result;
  }, [evmAddress, sendEvmTransaction, marketContract]);
  
  const approveUSDC = useCallback(async (amount: bigint) => {
    if (!evmAddress) throw new Error("Wallet not connected");
    
    const data = encodeFunctionData({
      abi: USDC_ABI,
      functionName: "approve",
      args: [marketContract, amount],
    });
    
    const result = await sendEvmTransaction({
      transaction: {
        to: usdcContract,
        data,
        gas: 100000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress,
      network: "base-sepolia",
    });
    
    return result;
  }, [evmAddress, sendEvmTransaction, usdcContract, marketContract]);
  
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
    const market = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "markets",
      args: [BigInt(marketId)],
    });
    
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
  }, [marketContract]);
  
  const getUserBet = useCallback(async (marketId: number, userAddress: string) => {
    const bet = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "userBets",
      args: [BigInt(marketId), userAddress as `0x${string}`],
    });
    
    // userBets returns: [hasBet, outcome, withdrawn]
    return {
      hasBet: bet[0],
      outcome: bet[1],
      withdrawn: bet[2],
    };
  }, [marketContract]);
  
  const calculateWinnings = useCallback(async (marketId: number, userAddress: string) => {
    const winnings = await publicClient.readContract({
      address: marketContract,
      abi: TOWN_HALL_PREDICTIONS_ABI,
      functionName: "calculateWinnings",
      args: [BigInt(marketId), userAddress as `0x${string}`],
    });
    
    return winnings as bigint;
  }, [marketContract]);
  
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
    const result = await sendEvmTransaction({
      transaction: {
        to: marketContract,
        data,
        gas: 500000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress,
      network: "base-sepolia",
    });

    console.log("Resolve transaction sent, result:", result);
    return result;
  }, [evmAddress, sendEvmTransaction, marketContract]);

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
    const result = await sendEvmTransaction({
      transaction: {
        to: marketContract,
        data,
        gas: 300000n,
        chainId: 84532,
        type: "eip1559",
      },
      evmAccount: evmAddress,
      network: "base-sepolia",
    });

    console.log("Void transaction sent, result:", result);
    return result;
  }, [evmAddress, sendEvmTransaction, marketContract]);
  
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
    resolveMarket,
    voidMarket,
    BET_AMOUNT,
  };
}