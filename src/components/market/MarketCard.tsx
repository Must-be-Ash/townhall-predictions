"use client";

import { useState, useEffect } from "react";
import { useContract } from "@/hooks/useContract";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { formatUSDC } from "@/lib/constants";
import Link from "next/link";

interface Market {
  question: string;
  closeTime: bigint;
  resolved: boolean;
  winningOutcome: boolean;
  yesTotal: bigint;
  noTotal: bigint;
  yesCount: bigint;
  noCount: bigint;
  voided: boolean;
  createdAt: bigint;
}

interface MarketCardProps {
  marketId: number;
  hideDetailsLink?: boolean;
}

export function MarketCard({ marketId, hideDetailsLink = false }: MarketCardProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [yesMultiplier, setYesMultiplier] = useState<bigint>(100n);
  const [noMultiplier, setNoMultiplier] = useState<bigint>(100n);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const { evmAddress } = useEvmAddress();
  const { 
    getMarket, 
    placeBet, 
    approveUSDC, 
    checkUSDCAllowance,
    getPayoutMultiplier,
    BET_AMOUNT 
  } = useContract();

  // Load market data
  useEffect(() => {
    async function loadMarketData() {
      try {
        const [marketData, yesMultiplierData, noMultiplierData] = await Promise.all([
          getMarket(marketId),
          getPayoutMultiplier(marketId, true),
          getPayoutMultiplier(marketId, false)
        ]);
        
        setMarket(marketData as Market);
        setYesMultiplier(yesMultiplierData);
        setNoMultiplier(noMultiplierData);
      } catch (err) {
        console.error("Failed to load market data:", err);
      }
    }

    loadMarketData();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadMarketData, 5000);
    return () => clearInterval(interval);
  }, [marketId, getMarket, getPayoutMultiplier]);

  const handleBet = async (outcome: boolean) => {
    if (!evmAddress || !market || isPlacingBet) return;
    
    setIsPlacingBet(true);
    setSelectedOutcome(outcome);
    
    try {
      // Check USDC allowance
      const allowance = await checkUSDCAllowance(evmAddress);
      
      if (allowance < BET_AMOUNT) {
        await approveUSDC(BET_AMOUNT);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Place the bet
      await placeBet(marketId, outcome);
      
      // Refresh market data
      const [marketData, yesMultiplierData, noMultiplierData] = await Promise.all([
        getMarket(marketId),
        getPayoutMultiplier(marketId, true),
        getPayoutMultiplier(marketId, false)
      ]);
      
      setMarket(marketData as Market);
      setYesMultiplier(yesMultiplierData);
      setNoMultiplier(noMultiplierData);
      
    } catch (error) {
      console.error("Failed to place bet:", error);
      alert("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
      setSelectedOutcome(null);
    }
  };

  if (!market) {
    return (
      <div className="bg-[#2a2a2a] rounded-2xl p-6 animate-pulse border border-[#3a3a3a]">
        <div className="h-4 bg-[#3a3a3a] rounded mb-4"></div>
        <div className="h-32 bg-[#3a3a3a] rounded mb-4"></div>
        <div className="flex space-x-4">
          <div className="flex-1 h-12 bg-[#3a3a3a] rounded"></div>
          <div className="flex-1 h-12 bg-[#3a3a3a] rounded"></div>
        </div>
      </div>
    );
  }

  const totalPool = market.yesTotal + market.noTotal;
  const totalBets = Number(market.yesCount) + Number(market.noCount);
  const closeTime = new Date(Number(market.closeTime) * 1000);
  const isActive = !market.resolved && !market.voided && Date.now() < closeTime.getTime();
  
  // Calculate percentages
  let yesPercentage = 50;
  let noPercentage = 50;
  
  if (totalBets > 0) {
    yesPercentage = Math.round((Number(market.yesCount) / totalBets) * 100);
    noPercentage = 100 - yesPercentage;
  }

  const timeRemaining = closeTime.getTime() - Date.now();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const daysRemaining = Math.floor(hoursRemaining / 24);

  return (
    <div className="bg-[#2a2a2a] rounded-2xl p-6 border border-[#3a3a3a] hover:border-[#808080] transition-all duration-200">
      {/* Market Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-[#808080] mb-2">
          <span className="flex items-center">
            💰 USDC
          </span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              👥 +{totalBets}
            </span>
            <span className="flex items-center">
              💰 {formatUSDC(totalPool)}
            </span>
            <span className="flex items-center">
              ⏰ {daysRemaining > 0 ? `${daysRemaining}d` : `${hoursRemaining}h`}
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      <h3 className="text-[#ffffff] text-lg font-semibold mb-4 leading-tight font-[var(--font-climate-crisis)]">
        {market.question}
      </h3>

      {/* Odds Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-[#c0c0c0] mb-2">
          <span>{yesPercentage}%</span>
          <span>{noPercentage}%</span>
        </div>
        <div className="w-full h-2 bg-[#3a3a3a] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-red-500 rounded-full transition-all duration-300"
            style={{
              background: `linear-gradient(to right, #10B981 0%, #10B981 ${yesPercentage}%, #EF4444 ${yesPercentage}%, #EF4444 100%)`
            }}
          ></div>
        </div>
      </div>

      {/* Betting Buttons */}
      {isActive ? (
        <div className="flex space-x-3">
          <button
            onClick={() => handleBet(true)}
            disabled={isPlacingBet}
            className={`flex-1 py-3 px-4 rounded-xl font-medium text-[#ffffff] transition-all duration-200 ${
              isPlacingBet && selectedOutcome === true
                ? 'bg-green-600 opacity-75'
                : 'bg-green-600 hover:bg-green-500 hover:scale-105'
            } disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center">
              <span className="mr-2">YES</span>
              {yesMultiplier !== 100n && (
                <span className="text-xs bg-green-600 px-2 py-1 rounded-full">
                  {(Number(yesMultiplier) / 100).toFixed(2)}x
                </span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => handleBet(false)}
            disabled={isPlacingBet}
            className={`flex-1 py-3 px-4 rounded-xl font-medium text-[#ffffff] transition-all duration-200 ${
              isPlacingBet && selectedOutcome === false
                ? 'bg-red-600 opacity-75'
                : 'bg-red-600 hover:bg-red-500 hover:scale-105'
            } disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center">
              <span className="mr-2">NO</span>
              {noMultiplier !== 100n && (
                <span className="text-xs bg-red-600 px-2 py-1 rounded-full">
                  {(Number(noMultiplier) / 100).toFixed(2)}x
                </span>
              )}
            </div>
          </button>
        </div>
      ) : (
        <div className="text-center py-3">
          <span className={`text-sm font-medium ${
            market.resolved ? 'text-green-400' : market.voided ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {market.resolved ? 'Resolved' : market.voided ? 'Voided' : 'Closed'}
          </span>
        </div>
      )}

      {/* View Details Link */}
      {!hideDetailsLink && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <Link 
            href={`/market/${marketId}`}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View details →
          </Link>
        </div>
      )}
    </div>
  );
}