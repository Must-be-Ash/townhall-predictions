"use client";

import { useState, useEffect } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useContract } from "@/hooks/useContract";
import { formatUSDC, BET_AMOUNT_DISPLAY } from "@/lib/constants";

interface BettingInterfaceProps {
  marketId: number;
}

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
  creator: string;
}

interface UserBet {
  hasBet: boolean;
  outcome: boolean;
  withdrawn: boolean;
}

export function BettingInterface({ marketId }: BettingInterfaceProps) {
  const { evmAddress } = useEvmAddress();
  const { 
    getMarket, 
    getUserBet, 
    placeBet, 
    approveUSDC, 
    checkUSDCAllowance,
    getUSDCBalance,
    getPayoutMultiplier,
    getDynamicCap,
    BET_AMOUNT 
  } = useContract();
  
  const [market, setMarket] = useState<Market | null>(null);
  const [userBet, setUserBet] = useState<UserBet | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n);
  const [yesMultiplier, setYesMultiplier] = useState<bigint>(100n);
  const [noMultiplier, setNoMultiplier] = useState<bigint>(100n);
  const [yesCap, setYesCap] = useState<bigint>(50n);
  const [noCap, setNoCap] = useState<bigint>(50n);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Load market data
  useEffect(() => {
    async function loadMarketData() {
      try {
        setIsLoading(true);
        setError(null);
        
        const marketData = await getMarket(marketId);
        setMarket(marketData as Market);
        
        // Load AMM-lite data
        const [yesMultiplierData, noMultiplierData, yesCapData, noCapData] = await Promise.all([
          getPayoutMultiplier(marketId, true),
          getPayoutMultiplier(marketId, false),
          getDynamicCap(marketId, true),
          getDynamicCap(marketId, false)
        ]);
        
        setYesMultiplier(yesMultiplierData);
        setNoMultiplier(noMultiplierData);
        setYesCap(yesCapData);
        setNoCap(noCapData);
        
        if (evmAddress) {
          const [betData, balance] = await Promise.all([
            getUserBet(marketId, evmAddress),
            getUSDCBalance(evmAddress)
          ]);
          setUserBet(betData as UserBet);
          setUsdcBalance(balance);
        }
      } catch (err) {
        console.error("Failed to load market data:", err);
        setError("Failed to load market data. Market may not exist.");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadMarketData();
  }, [marketId, evmAddress, getMarket, getUserBet, getUSDCBalance, getDynamicCap, getPayoutMultiplier]);
  
  const handlePlaceBet = async (outcome: boolean) => {
    if (!evmAddress || !market || userBet?.hasBet) return;
    
    setIsPlacingBet(true);
    setSelectedOutcome(outcome);
    
    try {
      // Check if user has enough USDC
      if (usdcBalance < BET_AMOUNT) {
        alert(`Insufficient USDC balance. You need $${BET_AMOUNT_DISPLAY} USDC to place a bet.`);
        return;
      }
      
      // Check USDC allowance
      const allowance = await checkUSDCAllowance(evmAddress);
      
      if (allowance < BET_AMOUNT) {
        console.log("Approving USDC...");
        await approveUSDC(BET_AMOUNT);
        // Wait a moment for approval to process
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Place the bet
      console.log("Placing bet...");
      const betResult = await placeBet(marketId, outcome);
      console.log("Bet result:", betResult);
      
      // Refresh data including AMM-lite information
      const [marketData, betData, balance, yesMultiplierData, noMultiplierData, yesCapData, noCapData] = await Promise.all([
        getMarket(marketId),
        getUserBet(marketId, evmAddress),
        getUSDCBalance(evmAddress),
        getPayoutMultiplier(marketId, true),
        getPayoutMultiplier(marketId, false),
        getDynamicCap(marketId, true),
        getDynamicCap(marketId, false)
      ]);
      
      setMarket(marketData as Market);
      setUserBet(betData as UserBet);
      setUsdcBalance(balance);
      setYesMultiplier(yesMultiplierData);
      setNoMultiplier(noMultiplierData);
      setYesCap(yesCapData);
      setNoCap(noCapData);
      
    } catch (error) {
      console.error("Failed to place bet:", error);
      alert("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
      setSelectedOutcome(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Market Not Found</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!market) {
    return null;
  }
  
  const isMarketClosed = new Date() > new Date(Number(market.closeTime) * 1000);
  const totalPool = market.yesTotal + market.noTotal;
  const totalBets = Number(market.yesCount) + Number(market.noCount);
  const closeTime = new Date(Number(market.closeTime) * 1000);
  
  return (
    <div className="space-y-6">
      {/* Market Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{market.question}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Closes:</span>
            <div className="font-medium">{closeTime.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <div className="font-medium">
              {market.resolved ? (
                <span className="text-green-600">Resolved</span>
              ) : market.voided ? (
                <span className="text-yellow-600">Voided</span>
              ) : isMarketClosed ? (
                <span className="text-red-600">Closed</span>
              ) : (
                <span className="text-blue-600">Open</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Your USDC:</span>
            <div className="font-medium">{formatUSDC(usdcBalance)}</div>
          </div>
        </div>
      </div>

      {/* Betting Stats with AMM-Lite Odds */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">YES</div>
            <div className="text-lg font-medium">{formatUSDC(market.yesTotal)}</div>
            <div className="text-sm text-gray-600">{Number(market.yesCount)} bets</div>
            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium inline-block ${
              Number(yesMultiplier) >= 110 ? 'bg-green-100 text-green-800' : 
              Number(yesMultiplier) <= 90 ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {(Number(yesMultiplier) / 100).toFixed(2)}x payout
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Number(yesCap) - Number(market.yesCount)} spots left
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">NO</div>
            <div className="text-lg font-medium">{formatUSDC(market.noTotal)}</div>
            <div className="text-sm text-gray-600">{Number(market.noCount)} bets</div>
            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium inline-block ${
              Number(noMultiplier) >= 110 ? 'bg-green-100 text-green-800' : 
              Number(noMultiplier) <= 90 ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {(Number(noMultiplier) / 100).toFixed(2)}x payout
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Number(noCap) - Number(market.noCount)} spots left
            </div>
          </div>
        </div>
        
        {/* Visual representation */}
        {totalPool > 0n && (
          <div className="mb-6">
            <div className="flex h-8 rounded overflow-hidden">
              <div 
                className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
                style={{ 
                  width: `${(Number(market.yesTotal) / Number(totalPool)) * 100}%`,
                  minWidth: totalBets > 0 ? '20%' : '50%'
                }}
              >
                {Math.round((Number(market.yesTotal) / Number(totalPool)) * 100)}%
              </div>
              <div 
                className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                style={{ 
                  width: `${(Number(market.noTotal) / Number(totalPool)) * 100}%`,
                  minWidth: totalBets > 0 ? '20%' : '50%'
                }}
              >
                {Math.round((Number(market.noTotal) / Number(totalPool)) * 100)}%
              </div>
            </div>
          </div>
        )}
        
        {/* User's existing bet */}
        {userBet?.hasBet && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-blue-900">
                  You bet <strong>{userBet.outcome ? "YES" : "NO"}</strong> on this market
                </p>
                <p className="text-sm text-blue-700">Amount: ${BET_AMOUNT_DISPLAY} USDC</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Betting Buttons with Enhanced Information */}
        {!userBet?.hasBet && !isMarketClosed && !market.resolved && !market.voided && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handlePlaceBet(true)}
              disabled={isPlacingBet || usdcBalance < BET_AMOUNT || Number(market.yesCount) >= Number(yesCap)}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors"
            >
              {isPlacingBet && selectedOutcome === true ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Betting...
                </span>
              ) : Number(market.yesCount) >= Number(yesCap) ? (
                "YES Side Full"
              ) : (
                <div className="text-center">
                  <div>Bet YES ($${BET_AMOUNT_DISPLAY})</div>
                  <div className="text-xs opacity-90">
                    Win {((Number(yesMultiplier) / 100) * 1.0).toFixed(2)}+ USDC
                  </div>
                </div>
              )}
            </button>
            <button
              onClick={() => handlePlaceBet(false)}
              disabled={isPlacingBet || usdcBalance < BET_AMOUNT || Number(market.noCount) >= Number(noCap)}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors"
            >
              {isPlacingBet && selectedOutcome === false ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Betting...
                </span>
              ) : Number(market.noCount) >= Number(noCap) ? (
                "NO Side Full"
              ) : (
                <div className="text-center">
                  <div>Bet NO ($${BET_AMOUNT_DISPLAY})</div>
                  <div className="text-xs opacity-90">
                    Win {((Number(noMultiplier) / 100) * 1.0).toFixed(2)}+ USDC
                  </div>
                </div>
              )}
            </button>
          </div>
        )}

        {/* AMM-Lite Information */}
        {!market.resolved && !market.voided && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Dynamic Betting</p>
                <p className="text-blue-700">
                  Early contrarian bets get bonus payouts (up to 1.5x), while majority side payouts decrease. 
                  Betting caps tighten as markets become imbalanced to keep things competitive.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Status Messages */}
        {market.resolved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-center text-green-800 font-medium">
              Market Resolved: <strong>{market.winningOutcome ? "YES" : "NO"}</strong> wins!
            </p>
          </div>
        )}
        
        {market.voided && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-center text-yellow-800 font-medium">
              Market Voided - All bets refunded
            </p>
          </div>
        )}
        
        {isMarketClosed && !market.resolved && !market.voided && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-center text-gray-700">
              Betting is closed. Awaiting resolution.
            </p>
          </div>
        )}
        
        {usdcBalance < BET_AMOUNT && !userBet?.hasBet && !isMarketClosed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-center text-red-800">
              Insufficient USDC balance. You need ${BET_AMOUNT_DISPLAY} USDC to place a bet.
            </p>
          </div>
        )}
        
        {/* Total stats */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
          Total Pool: {formatUSDC(totalPool)} • {totalBets} participants
        </div>
      </div>
    </div>
  );
}