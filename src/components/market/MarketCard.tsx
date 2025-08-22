"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useContract } from "@/hooks/useContract";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { formatUSDC } from "@/lib/constants";
import { useMarkets } from "@/contexts/MarketContext";
import Link from "next/link";

// Component for smooth number transitions
function AnimatedNumber({ value, format = (n) => n.toString() }: { value: number; format?: (n: number) => string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);
  
  return (
    <span className={`transition-all duration-300 ${isAnimating ? 'scale-105 text-blue-400' : ''}`}>
      {format(displayValue)}
    </span>
  );
}

interface MarketCardProps {
  marketId: number;
  hideDetailsLink?: boolean;
}

function MarketCardComponent({ marketId, hideDetailsLink = false }: MarketCardProps) {
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [userWinnings, setUserWinnings] = useState<bigint>(0n);
  const [userBet, setUserBet] = useState<{
    hasBet: boolean;
    outcome: boolean;
    withdrawn: boolean;
  } | null>(null);
  const { evmAddress } = useEvmAddress();
  const { 
    placeBet, 
    approveUSDC, 
    checkUSDCAllowance,
    withdrawWinnings,
    calculateWinnings,
    getUserBet,
    BET_AMOUNT 
  } = useContract();
  
  // Use centralized market state
  const { getMarket, refreshMarket, forceRefreshMarket, isLoading, getError, optimisticUpdate } = useMarkets();
  const market = getMarket(marketId);
  const error = getError(marketId);
  const isUpdating = isLoading(marketId);
  
  // Store refresh function in ref to avoid useEffect dependency issues
  const refreshMarketRef = useRef(refreshMarket);
  refreshMarketRef.current = refreshMarket;

  // Load market data using centralized state (only initial load, polling handled centrally)
  useEffect(() => {
    // Initial load only - polling will be handled by centralized service
    refreshMarketRef.current(marketId);
  }, [marketId]);

  // Check user winnings when market is resolved and user has wallet connected
  useEffect(() => {
    async function checkUserWinnings() {
      if (!evmAddress || !market || !market.resolved) return;
      
      try {
        const [winnings, bet] = await Promise.all([
          calculateWinnings(marketId, evmAddress),
          getUserBet(marketId, evmAddress)
        ]);
        
        setUserWinnings(winnings);
        setUserBet(bet);
      } catch (error) {
        console.error("Failed to check user winnings:", error);
      }
    }
    
    checkUserWinnings();
  }, [evmAddress, market, marketId, calculateWinnings, getUserBet]);

  const handleWithdraw = async () => {
    if (!evmAddress || !market || isWithdrawing || userWinnings <= 0n) return;
    
    setIsWithdrawing(true);
    
    try {
      await withdrawWinnings(marketId);
      
      // Wait for blockchain state to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh user winnings
      const [winnings, bet] = await Promise.all([
        calculateWinnings(marketId, evmAddress),
        getUserBet(marketId, evmAddress)
      ]);
      
      setUserWinnings(winnings);
      setUserBet(bet);
      
    } catch (error) {
      console.error("Failed to withdraw winnings:", error);
      alert("Failed to withdraw winnings. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleBet = async (outcome: boolean) => {
    if (!evmAddress || !market || isPlacingBet) return;
    
    setIsPlacingBet(true);
    setSelectedOutcome(outcome);
    
    // Optimistic update - immediately show the effect of the bet
    const optimisticUpdates = {
      yesCount: market.yesCount + (outcome ? 1 : 0),
      noCount: market.noCount + (outcome ? 0 : 1),
      yesTotal: (BigInt(market.yesTotal) + (outcome ? BET_AMOUNT : BigInt(0))).toString(),
      noTotal: (BigInt(market.noTotal) + (outcome ? BigInt(0) : BET_AMOUNT)).toString(),
    };
    
    optimisticUpdate(marketId, optimisticUpdates);
    
    try {
      // Check USDC allowance
      const allowance = await checkUSDCAllowance(evmAddress);
      
      if (allowance < BET_AMOUNT) {
        await approveUSDC(BET_AMOUNT);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Place the bet
      await placeBet(marketId, outcome);
      
      // Wait for blockchain state to propagate with retry logic
      const originalYesCount = market.yesCount;
      const originalNoCount = market.noCount;
      
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await forceRefreshMarket(marketId);
        
        // Get fresh market data to check if bet was recorded
        const updatedMarket = getMarket(marketId);
        if (updatedMarket && 
            (updatedMarket.yesCount > originalYesCount || updatedMarket.noCount > originalNoCount)) {
          break; // Bet was recorded, we're done
        }
        attempts++;
      }
      
    } catch (error) {
      console.error("Failed to place bet:", error);
      // Revert optimistic update on error by refreshing
      await forceRefreshMarket(marketId);
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
        <div className="h-14 bg-[#3a3a3a] rounded mb-4"></div>
        <div className="h-2 bg-[#3a3a3a] rounded mb-4"></div>
        <div className="flex space-x-4">
          <div className="flex-1 h-12 bg-[#3a3a3a] rounded"></div>
          <div className="flex-1 h-12 bg-[#3a3a3a] rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#2a2a2a] rounded-2xl p-6 border border-red-500/20">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load market</p>
          <p className="text-sm text-[#808080]">{error}</p>
        </div>
      </div>
    );
  }

  const totalPool = BigInt(market.yesTotal) + BigInt(market.noTotal);
  const totalBets = market.yesCount + market.noCount;
  const closeTime = new Date(market.closeTime);
  const isActive = !market.resolved && !market.voided && Date.now() < closeTime.getTime();
  
  // Calculate percentages
  let yesPercentage = 50;
  let noPercentage = 50;
  
  if (totalBets > 0) {
    yesPercentage = Math.round((market.yesCount / totalBets) * 100);
    noPercentage = 100 - yesPercentage;
  }

  const timeRemaining = closeTime.getTime() - Date.now();
  const minutesRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60)));
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const daysRemaining = Math.floor(hoursRemaining / 24);

  // Get multipliers from API data or default to 1.00x
  const yesMultiplier = market.yesMultiplier || 100;
  const noMultiplier = market.noMultiplier || 100;

  return (
    <div className={`bg-[#2a2a2a] rounded-2xl p-6 border border-[#3a3a3a] hover:border-[#808080] transition-all duration-200 relative ${isUpdating ? 'ring-2 ring-blue-500/20' : ''}`}>
      {/* Update indicator */}
      {isUpdating && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
      )}
      
      {/* Market Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-[#808080] mb-2">
          <span className="flex items-center">
            💰 USDC
          </span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              👥 +<AnimatedNumber value={totalBets} />
            </span>
            <span className="flex items-center">
              💰 <AnimatedNumber value={Number(totalPool)} format={(n) => formatUSDC(BigInt(n))} />
            </span>
            <span className="flex items-center">
              ⏰ {daysRemaining > 0 ? `${daysRemaining}d` : hoursRemaining > 0 ? `${hoursRemaining}h` : `${minutesRemaining}m`}
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="text-[#ffffff] text-lg font-bold mb-4 leading-tight font-sans h-14 overflow-hidden" style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical'
      }}>
        {market.question}
      </div>

      {/* Odds Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-[#c0c0c0] mb-2">
          <span><AnimatedNumber value={yesPercentage} format={(n) => `${n}%`} /></span>
          <span><AnimatedNumber value={noPercentage} format={(n) => `${n}%`} /></span>
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
              {yesMultiplier !== 100 && (
                <span className="text-xs bg-green-600 px-2 py-1 rounded-full">
                  {(yesMultiplier / 100).toFixed(2)}x
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
              {noMultiplier !== 100 && (
                <span className="text-xs bg-red-600 px-2 py-1 rounded-full">
                  {(noMultiplier / 100).toFixed(2)}x
                </span>
              )}
            </div>
          </button>
        </div>
      ) : market.resolved && evmAddress && userBet?.hasBet && userWinnings > 0n && !userBet?.withdrawn ? (
        <div className="text-center">
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-[#ffffff] font-medium py-3 px-4 rounded-xl transition-colors"
          >
            {isWithdrawing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Withdrawing...
              </span>
            ) : (
              `You won ${formatUSDC(userWinnings)}!`
            )}
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

// Memoize the component to prevent unnecessary re-renders
export const MarketCard = memo(MarketCardComponent, (prevProps, nextProps) => {
  // Only re-render if marketId or hideDetailsLink actually changed
  return prevProps.marketId === nextProps.marketId && 
         prevProps.hideDetailsLink === nextProps.hideDetailsLink;
});