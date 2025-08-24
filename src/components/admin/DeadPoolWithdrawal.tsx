"use client";

import { useState, useEffect } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useContract } from "@/hooks/useContract";
import { formatUSDC } from "@/lib/constants";

interface DeadPoolFunds {
  markets: Array<{
    marketId: number;
    question: string;
    amount: bigint;
    winningOutcome: boolean;
  }>;
  totalAmount: bigint;
}

export function DeadPoolWithdrawal() {
  const { evmAddress } = useEvmAddress();
  const { getAllDeadPoolFunds, claimDeadPoolFunds, getContractOwner } = useContract();
  const [deadPoolFunds, setDeadPoolFunds] = useState<DeadPoolFunds>({ markets: [], totalAmount: 0n });
  const [isClaiming, setIsClaiming] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Check if current user is contract owner
  useEffect(() => {
    async function checkOwner() {
      if (!evmAddress) {
        setIsOwner(false);
        return;
      }

      try {
        const owner = await getContractOwner();
        setIsOwner(evmAddress.toLowerCase() === owner.toLowerCase());
      } catch (error) {
        console.error("Failed to get contract owner:", error);
        setIsOwner(false);
      }
    }

    checkOwner();
  }, [evmAddress, getContractOwner]);

  // Load dead pool funds
  useEffect(() => {
    async function loadDeadPoolFunds() {
      if (!evmAddress || !isOwner) {
        setDeadPoolFunds({ markets: [], totalAmount: 0n });
        return;
      }

      try {
        const funds = await getAllDeadPoolFunds();
        setDeadPoolFunds(funds);
      } catch (error) {
        console.error("Failed to load dead pool funds:", error);
        setDeadPoolFunds({ markets: [], totalAmount: 0n });
      }
    }

    loadDeadPoolFunds();
  }, [evmAddress, isOwner, getAllDeadPoolFunds]);

  const handleClaimAll = async () => {
    if (!evmAddress || deadPoolFunds.markets.length === 0 || isClaiming) return;

    setIsClaiming(true);

    for (const market of deadPoolFunds.markets) {
      try {
        await claimDeadPoolFunds(market.marketId);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Failed to claim dead pool funds from market ${market.marketId}:`, error);
      }
    }

    setIsClaiming(false);

    // Refresh dead pool funds
    try {
      const updatedFunds = await getAllDeadPoolFunds();
      setDeadPoolFunds(updatedFunds);
    } catch (error) {
      console.error("Failed to refresh dead pool funds:", error);
    }
  };

  // Only show for contract owner with available dead pool funds
  if (!evmAddress || !isOwner || deadPoolFunds.totalAmount === 0n) {
    return null;
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#808080]">Dead Pool Funds:</span>
      <button
        onClick={handleClaimAll}
        disabled={isClaiming}
        className="px-3 py-1.5 disabled:bg-[#374151] disabled:cursor-not-allowed text-[#ffffff] text-xs font-bold rounded-lg transition-all border border-[#808080] border-[0.1px]"
        style={{
          background: isClaiming 
            ? '#374151' 
            : 'radial-gradient(circle, #333333 0%, #555555 100%)',
        }}
        onMouseEnter={(e) => {
          if (!isClaiming) {
            e.currentTarget.style.background = 'radial-gradient(circle, #555555 0%, #777777 100%)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isClaiming) {
            e.currentTarget.style.background = 'radial-gradient(circle, #333333 0%, #555555 100%)';
          }
        }}
        title={`Claim funds from ${deadPoolFunds.markets.length} dead pool market${deadPoolFunds.markets.length !== 1 ? 's' : ''}`}
      >
        {isClaiming ? "Claiming..." : `Claim ${formatUSDC(deadPoolFunds.totalAmount)}`}
      </button>
    </div>
  );
}