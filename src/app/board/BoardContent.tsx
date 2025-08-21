"use client";

import { useState, useEffect } from "react";
import { LiveMarketDisplay } from "@/components/board/LiveMarketDisplay";
import { MarketSelector } from "@/components/board/MarketSelector";
import { useContract } from "@/hooks/useContract";
import { DockNavigation } from "@/components/navigation/DockNavigation";

export default function BoardContent() {
  const [selectedMarketId, setSelectedMarketId] = useState<number>(0);
  const [availableMarkets, setAvailableMarkets] = useState<number[]>([]);
  const { getMarketCounter } = useContract();

  // Load available markets
  useEffect(() => {
    async function loadMarkets() {
      try {
        console.log("Fetching market counter...");
        const counter = await getMarketCounter();
        console.log("Market counter:", counter);
        const markets = Number(counter) > 0 ? Array.from({ length: Number(counter) }, (_, i) => i) : [];
        console.log("Available markets:", markets);
        setAvailableMarkets(markets);
        
        // Set default market to the latest one
        if (markets.length > 0) {
          setSelectedMarketId(markets[markets.length - 1]);
        }
      } catch (error) {
        console.error("Failed to load markets:", error);
      }
    }

    loadMarkets();
  }, [getMarketCounter]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#ffffff]">
      {/* Dock Navigation */}
      <DockNavigation />
      
      {/* Header with Market Selector */}
      <div className="pt-24 md:pt-20 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-[var(--font-climate-crisis)]">Live Market Display</h1>
              <p className="text-[#808080] text-sm">Real-time betting odds and activity</p>
            </div>
            <div className="flex items-center space-x-4">
              <MarketSelector 
                markets={availableMarkets}
                selectedMarket={selectedMarketId}
                onMarketChange={setSelectedMarketId}
              />
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-[#808080]">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Display */}
      <main className="flex-1 pb-24 md:pb-8">
        {availableMarkets.length > 0 ? (
          <LiveMarketDisplay marketId={selectedMarketId} />
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-[#c0c0c0] mb-2 font-[var(--font-climate-crisis)]">No Markets Available</h3>
              <p className="text-[#808080]">
                Markets will appear here when they are created by administrators.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}