"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useContract } from "@/hooks/useContract";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { formatUSDC } from "@/lib/constants";
import { useMarkets } from "@/contexts/MarketContext";
import Link from "next/link";
import { GlassButton } from "@/components/ui/GlassButton";

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
  isNewMarket?: boolean;
}

function MarketCardComponent({ marketId, hideDetailsLink = false, isNewMarket = false }: MarketCardProps) {
  const [isPlacingBet, setIsPlacingBet] = useState(false);
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
  
  // Enhanced user feedback states
  const [betFeedback, setBetFeedback] = useState<{
    type: 'success' | 'processing' | null;
    outcome?: boolean;
    message?: string;
  }>({ type: null });
  
  // Store refresh function in ref to avoid useEffect dependency issues
  const refreshMarketRef = useRef(refreshMarket);
  refreshMarketRef.current = refreshMarket;

  // Load market data and set up smart polling
  useEffect(() => {
    // For new markets, force refresh to bypass cache, otherwise use normal refresh
    if (isNewMarket) {
      console.log(`Loading new market ${marketId} with force refresh`);
      forceRefreshMarket(marketId);
    } else {
      // Initial load only - polling will be handled by centralized service
      refreshMarketRef.current(marketId);
    }
    
    // Import the polling service to set market focus
    import('@/services/MarketPollingService').then(({ marketPollingService }) => {
      // Set this market as focused when component mounts
      marketPollingService.setMarketFocus(marketId, true);
      
      // Clean up focus when component unmounts
      return () => {
        marketPollingService.setMarketFocus(marketId, false);
      };
    });
  }, [marketId, isNewMarket, forceRefreshMarket]);

  // Check user bet status and winnings when user has wallet connected
  useEffect(() => {
    async function checkUserStatus() {
      if (!evmAddress || !market) return;
      
      try {
        // Always check user bet status regardless of market state
        const bet = await getUserBet(marketId, evmAddress);
        setUserBet(bet);
        
        // Only check winnings for resolved markets
        if (market.resolved) {
          const winnings = await calculateWinnings(marketId, evmAddress);
          setUserWinnings(winnings);
        }
      } catch (error) {
        console.error("Failed to check user status:", error);
      }
    }
    
    checkUserStatus();
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
    
    // Prevent multiple betting - check if user has already placed a bet
    // Do this check before any state changes or optimistic updates
    if (userBet?.hasBet) {
      alert(`You have already placed a ${userBet.outcome ? 'YES' : 'NO'} bet on this market.`);
      return;
    }
    
    setIsPlacingBet(true);
    setBetFeedback({ type: 'processing', outcome, message: 'Preparing transaction...' });
    
    // Optimistic update - immediately show the effect of the bet
    // Only apply if user hasn't already bet (double-check for safety)
    const optimisticUpdates = {
      yesCount: market.yesCount + (outcome ? 1 : 0),
      noCount: market.noCount + (outcome ? 0 : 1),
      yesTotal: (BigInt(market.yesTotal) + (outcome ? BET_AMOUNT : BigInt(0))).toString(),
      noTotal: (BigInt(market.noTotal) + (outcome ? BigInt(0) : BET_AMOUNT)).toString(),
    };
    
    optimisticUpdate(marketId, optimisticUpdates);
    
    // Import polling service for priority refresh
    const { marketPollingService } = await import('@/services/MarketPollingService');
    
    try {
      // Check USDC allowance
      setBetFeedback({ type: 'processing', outcome, message: 'Checking USDC allowance...' });
      const allowance = await checkUSDCAllowance(evmAddress);
      
      if (allowance < BET_AMOUNT) {
        setBetFeedback({ type: 'processing', outcome, message: 'Approving USDC spend...' });
        await approveUSDC(BET_AMOUNT);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Final validation: double-check user hasn't placed a bet (in case state changed)
      const currentUserBet = await getUserBet(marketId, evmAddress);
      if (currentUserBet?.hasBet) {
        throw new Error(`You have already placed a ${currentUserBet.outcome ? 'YES' : 'NO'} bet on this market.`);
      }
      
      // Place the bet
      setBetFeedback({ type: 'processing', outcome, message: 'Placing bet...' });
      await placeBet(marketId, outcome);
      
      // Show success immediately - trust the transaction result
      setBetFeedback({ type: 'success', outcome, message: `Bet placed successfully!` });
      
      // Optimistically update user bet state
      setUserBet({
        hasBet: true,
        outcome,
        withdrawn: false
      });
      
      // Trigger background refresh for eventual confirmation (non-blocking)
      marketPollingService.forceRefresh(marketId, 2); // HIGH priority, not CRITICAL
      
      // Clear success feedback after showing it long enough for user to see
      setTimeout(() => setBetFeedback({ type: null }), 3000);
      
      // Background validation: Check if bet was actually confirmed after delay
      setTimeout(async () => {
        try {
          const validationMarket = getMarket(marketId);
          const originalTotal = market.yesCount + market.noCount;
          const currentTotal = validationMarket ? validationMarket.yesCount + validationMarket.noCount : originalTotal;
          
          // If blockchain hasn't caught up after 15 seconds, show subtle indicator
          if (currentTotal <= originalTotal) {
            console.warn(`Bet validation: Market ${marketId} blockchain data hasn't updated after 15s`);
            // Optionally show a very subtle warning that doesn't interfere with UX
            // This is just for monitoring - optimistic updates will persist
          }
        } catch (error) {
          console.error("Background bet validation failed:", error);
        }
      }, 15000); // 15 second background validation
      
    } catch (error) {
      console.error("Failed to place bet:", error);
      // Revert optimistic updates on error by refreshing
      await forceRefreshMarket(marketId);
      // Clear optimistic user bet state
      setUserBet(null);
      setBetFeedback({ type: null });
      alert("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
    }
  };

  if (!market) {
    return (
      <div className="bg-[#2a2a2a] rounded-2xl p-6 border border-[#3a3a3a]">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-[#c0c0c0] font-medium">
              {isNewMarket ? 'Loading new market...' : 'Loading market data...'}
            </p>
            {isNewMarket && (
              <p className="text-[#808080] text-sm mt-2">
                Fetching fresh data from blockchain
              </p>
            )}
          </div>
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
      {/* Enhanced feedback indicator */}
      {betFeedback.type && (
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          {betFeedback.type === 'processing' && (
            <div className="flex items-center">
              <svg className="animate-spin h-4 w-4 text-blue-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          {betFeedback.type === 'success' && (
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      )}
      
      {/* Update indicator */}
      {isUpdating && !betFeedback.type && (
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
        <>
          {/* Show user's existing bet if they have one */}
          {userBet?.hasBet ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center">
                <span className="text-blue-400 font-medium">
                  You bet <span className={userBet.outcome ? 'text-green-400' : 'text-red-400'}>
                    {userBet.outcome ? 'YES' : 'NO'}
                  </span> on this market
                </span>
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <GlassButton
                variant="green"
                size="md"
                onClick={() => handleBet(true)}
                disabled={isPlacingBet || userBet?.hasBet}
                className={`flex-1 ${betFeedback.type === 'success' && betFeedback.outcome === true ? 'ring-2 ring-green-400/50' : ''}`}
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">YES</span>
                  {yesMultiplier !== 100 && (
                    <span className="text-xs bg-black/20 px-2 py-1 rounded-full">
                      {(yesMultiplier / 100).toFixed(2)}x
                    </span>
                  )}
                </div>
              </GlassButton>
              
              <GlassButton
                variant="red"
                size="md"
                onClick={() => handleBet(false)}
                disabled={isPlacingBet || userBet?.hasBet}
                className={`flex-1 ${betFeedback.type === 'success' && betFeedback.outcome === false ? 'ring-2 ring-green-400/50' : ''}`}
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">NO</span>
                  {noMultiplier !== 100 && (
                    <span className="text-xs bg-black/20 px-2 py-1 rounded-full">
                      {(noMultiplier / 100).toFixed(2)}x
                    </span>
                  )}
                </div>
              </GlassButton>
            </div>
          )}
          
          {/* Bet feedback message */}
          {betFeedback.type && betFeedback.message && (
            <div className={`mt-3 p-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              betFeedback.type === 'processing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              betFeedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              <div className="flex items-center">
                {betFeedback.type === 'processing' && (
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {betFeedback.type === 'success' && (
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{betFeedback.message}</span>
                {betFeedback.outcome !== undefined && (
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                    betFeedback.outcome ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
                  }`}>
                    {betFeedback.outcome ? 'YES' : 'NO'}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
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
            className="inline-block px-3 py-1.5 text-[#ffffff] text-xs font-bold rounded-lg transition-all border border-[#808080] border-[0.1px]"
            style={{
              background: 'radial-gradient(circle, #333333 0%, #555555 100%)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'radial-gradient(circle, #555555 0%, #777777 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'radial-gradient(circle, #333333 0%, #555555 100%)';
            }}
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
  // Only re-render if props actually changed
  return prevProps.marketId === nextProps.marketId && 
         prevProps.hideDetailsLink === nextProps.hideDetailsLink &&
         prevProps.isNewMarket === nextProps.isNewMarket;
});