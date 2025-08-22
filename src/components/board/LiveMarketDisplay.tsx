"use client";

import { useState, useEffect } from "react";
import { useContract } from "@/hooks/useContract";
import { formatUSDC, REFRESH_INTERVALS } from "@/lib/constants";
import { BettingChart } from "./BettingChart";
import { CountdownTimer } from "./CountdownTimer";
import { RecentActivity } from "./RecentActivity";
import { MarketStatus } from "./MarketStatus";

interface LiveMarketDisplayProps {
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
}

export function LiveMarketDisplay({ marketId }: LiveMarketDisplayProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [yesMultiplier, setYesMultiplier] = useState<bigint>(100n);
  const [noMultiplier, setNoMultiplier] = useState<bigint>(100n);
  const [yesCap, setYesCap] = useState<bigint>(50n);
  const [noCap, setNoCap] = useState<bigint>(50n);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { getMarket, getPayoutMultiplier, getDynamicCap } = useContract();

  // Load and refresh market data
  useEffect(() => {
    async function loadMarketData() {
      try {
        setError(null);
        console.log(`Fetching market data for market ${marketId}...`);
        
        // Load both market data and AMM-lite information
        const [marketData, yesMultiplierData, noMultiplierData, yesCapData, noCapData] = await Promise.all([
          getMarket(marketId),
          getPayoutMultiplier(marketId, true),
          getPayoutMultiplier(marketId, false),
          getDynamicCap(marketId, true),
          getDynamicCap(marketId, false)
        ]);
        
        console.log("Market data:", marketData);
        setMarket(marketData as Market);
        setYesMultiplier(yesMultiplierData);
        setNoMultiplier(noMultiplierData);
        setYesCap(yesCapData);
        setNoCap(noCapData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to load market data:", err);
        setError("Failed to load market data");
      } finally {
        setLoading(false);
      }
    }

    // Initial load
    loadMarketData();

    // Auto-refresh every 5 seconds for live updates
    const interval = setInterval(loadMarketData, REFRESH_INTERVALS.BOARD_DISPLAY);
    
    return () => clearInterval(interval);
  }, [marketId, getMarket, getDynamicCap, getPayoutMultiplier]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">Market Not Found</h3>
          <p className="text-gray-500">Market #{marketId} could not be loaded</p>
        </div>
      </div>
    );
  }

  const totalPool = market.yesTotal + market.noTotal;
  const totalBets = Number(market.yesCount) + Number(market.noCount);
  const closeTime = new Date(Number(market.closeTime) * 1000);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Market Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 break-words">
          {market.question}
        </h1>
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
          <CountdownTimer closeTime={closeTime} />
          <MarketStatus market={market} />
        </div>
      </div>

      {/* Main Chart */}
      <div className="mb-12">
        <BettingChart
          yesTotal={market.yesTotal}
          noTotal={market.noTotal}
          yesCount={Number(market.yesCount)}
          noCount={Number(market.noCount)}
        />
      </div>

      {/* Enhanced Stats Grid with AMM-Lite Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="text-center">
          <div className="text-4xl md:text-6xl font-bold text-green-400 mb-2">
            {formatUSDC(market.yesTotal)}
          </div>
          <div className="text-xl md:text-2xl text-green-300 mb-1">YES Pool</div>
          <div className="text-lg text-gray-400 mb-2">{Number(market.yesCount)} bets</div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            Number(yesMultiplier) >= 110 ? 'bg-green-600 text-white' : 
            Number(yesMultiplier) <= 90 ? 'bg-red-600 text-white' : 
            'bg-gray-600 text-white'
          }`}>
            {(Number(yesMultiplier) / 100).toFixed(2)}x payout
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {Number(yesCap) - Number(market.yesCount)} spots left
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-4xl md:text-6xl font-bold text-blue-400 mb-2">
            {formatUSDC(totalPool)}
          </div>
          <div className="text-xl md:text-2xl text-blue-300 mb-1">Total Pool</div>
          <div className="text-lg text-gray-400">{totalBets} participants</div>
          <div className="text-sm text-gray-500 mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-4xl md:text-6xl font-bold text-red-400 mb-2">
            {formatUSDC(market.noTotal)}
          </div>
          <div className="text-xl md:text-2xl text-red-300 mb-1">NO Pool</div>
          <div className="text-lg text-gray-400 mb-2">{Number(market.noCount)} bets</div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            Number(noMultiplier) >= 110 ? 'bg-green-600 text-white' : 
            Number(noMultiplier) <= 90 ? 'bg-red-600 text-white' : 
            'bg-gray-600 text-white'
          }`}>
            {(Number(noMultiplier) / 100).toFixed(2)}x payout
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {Number(noCap) - Number(market.noCount)} spots left
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <RecentActivity marketId={marketId} />
      </div>

      {/* Footer Info */}
      <div className="text-center text-gray-500 text-sm">
        <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
        <p className="mt-1">Auto-refreshing every 3 seconds</p>
      </div>
    </div>
  );
}