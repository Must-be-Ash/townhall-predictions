"use client";

import { useState, useEffect } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useContract } from "@/hooks/useContract";
import { formatUSDC } from "@/lib/constants";

interface UserWinnings {
  markets: Array<{
    marketId: number;
    question: string;
    winnings: bigint;
    outcome: boolean;
  }>;
  totalWinnings: bigint;
}

export function BulkWithdrawal() {
  const { evmAddress } = useEvmAddress();
  const { getAllUserWinnings, withdrawWinnings } = useContract();
  const [userWinnings, setUserWinnings] = useState<UserWinnings>({ markets: [], totalWinnings: 0n });
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Load user winnings
  useEffect(() => {
    async function loadWinnings() {
      if (!evmAddress) {
        setUserWinnings({ markets: [], totalWinnings: 0n });
        return;
      }

      try {
        const winnings = await getAllUserWinnings(evmAddress);
        setUserWinnings(winnings);
      } catch (error) {
        console.error("Failed to load user winnings:", error);
        setUserWinnings({ markets: [], totalWinnings: 0n });
      }
    }

    loadWinnings();
  }, [evmAddress, getAllUserWinnings]);

  const handleWithdrawAll = async () => {
    if (!evmAddress || userWinnings.markets.length === 0 || isWithdrawing) return;

    setIsWithdrawing(true);

    for (const market of userWinnings.markets) {
      try {
        await withdrawWinnings(market.marketId);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Failed to withdraw from market ${market.marketId}:`, error);
      }
    }

    setIsWithdrawing(false);

    // Refresh winnings
    try {
      const updatedWinnings = await getAllUserWinnings(evmAddress);
      setUserWinnings(updatedWinnings);
    } catch (error) {
      console.error("Failed to refresh winnings:", error);
    }
  };

  if (!evmAddress || userWinnings.totalWinnings === 0n) {
    return null;
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#808080]">Winnings:</span>
      <button
        onClick={handleWithdrawAll}
        disabled={isWithdrawing}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-[#ffffff] text-xs font-medium rounded-lg transition-colors"
      >
        {isWithdrawing ? "Claiming..." : `Claim ${formatUSDC(userWinnings.totalWinnings)}`}
      </button>
    </div>
  );
}