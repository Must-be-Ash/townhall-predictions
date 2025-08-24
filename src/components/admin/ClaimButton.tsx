"use client";

import { useState, useEffect } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useContract } from "@/hooks/useContract";

interface ClaimableItem {
  marketId: number;
  type: 'winnings' | 'refund';
  amount: bigint;
  question: string;
}

export function ClaimButton() {
  const { evmAddress } = useEvmAddress();
  const { getAllUserWinnings, getMarket, getUserBet, withdrawWinnings, withdrawRefund } = useContract();
  const [claimableItems, setClaimableItems] = useState<ClaimableItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Load claimable items (both winnings and refunds)
  useEffect(() => {
    async function loadClaimableItems() {
      if (!evmAddress) {
        setClaimableItems([]);
        return;
      }

      setIsLoading(true);
      try {
        const items: ClaimableItem[] = [];

        // Get winnings from resolved markets
        const winningsData = await getAllUserWinnings(evmAddress);
        for (const item of winningsData.markets) {
          if (item.winnings > 0n) {
            const market = await getMarket(item.marketId);
            items.push({
              marketId: item.marketId,
              type: 'winnings',
              amount: item.winnings,
              question: market.question
            });
          }
        }

        // Check for refunds from voided markets
        // We need to check all markets the user has bet on
        // For now, we'll check a reasonable range (last 20 markets)
        const allMarkets = await Promise.all(
          Array.from({ length: 20 }, (_, i) => i).map(async (marketId) => {
            try {
              const market = await getMarket(marketId);
              if (market.voided) {
                const userBet = await getUserBet(marketId, evmAddress);
                if (userBet.hasBet && !userBet.withdrawn) {
                  return {
                    marketId,
                    type: 'refund' as const,
                    amount: 1000000n, // $1.00 USDC (6 decimals)
                    question: market.question
                  };
                }
              }
            } catch {
              // Market doesn't exist, skip
              return null;
            }
            return null;
          })
        );

        // Add valid refund items
        allMarkets.forEach(item => {
          if (item) items.push(item);
        });

        setClaimableItems(items);
      } catch (error) {
        console.error("Failed to load claimable items:", error);
        setClaimableItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadClaimableItems();
  }, [evmAddress, getAllUserWinnings, getMarket, getUserBet]);

  const handleClaimAll = async () => {
    if (claimableItems.length === 0 || !evmAddress) return;

    setIsClaiming(true);
    try {
      for (const item of claimableItems) {
        if (item.type === 'winnings') {
          await withdrawWinnings(item.marketId);
        } else if (item.type === 'refund') {
          await withdrawRefund(item.marketId);
        }
      }
      
      // Refresh the claimable items list
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error("Failed to claim:", error);
      alert("Failed to claim some items. Please try again or claim individually from market pages.");
    } finally {
      setIsClaiming(false);
    }
  };

  if (!evmAddress) {
    return null;
  }

  const totalClaimable = claimableItems.length;

  if (isLoading) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-sm text-[#808080]">Checking claimable funds...</span>
        <div className="px-3 py-1.5 bg-gray-400 text-white text-xs font-bold rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

  if (totalClaimable === 0) {
    return null; // Don't show anything if there's nothing to claim
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#808080]">Claimable funds:</span>
      <button
        onClick={handleClaimAll}
        disabled={isClaiming}
        className="px-3 py-1.5 disabled:bg-[#374151] disabled:cursor-not-allowed text-[#ffffff] text-xs font-bold rounded-lg transition-all border border-[#808080] border-[0.1px]"
        style={{
          background: isClaiming 
            ? '#374151' 
            : 'radial-gradient(circle, #059669 0%, #047857 100%)',
        }}
        onMouseEnter={(e) => {
          if (!isClaiming) {
            e.currentTarget.style.background = 'radial-gradient(circle, #047857 0%, #065f46 100%)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isClaiming) {
            e.currentTarget.style.background = 'radial-gradient(circle, #059669 0%, #047857 100%)';
          }
        }}
      >
        {isClaiming ? "Claiming..." : "Claim All"}
      </button>
    </div>
  );
}