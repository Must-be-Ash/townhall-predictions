"use client";

import { useState, useEffect } from "react";
import { MarketCard } from "./MarketCard";
import { SearchAndFilter, FilterOptions } from "./SearchAndFilter";
import { useContract } from "@/hooks/useContract";
import { useMarkets } from "@/contexts/MarketContext";

interface Market {
  question: string;
  closeTime: string | Date;
  resolved: boolean;
  winningOutcome: boolean;
  yesTotal: string;
  noTotal: string;
  yesCount: number;
  noCount: number;
  voided: boolean;
  createdAt: string | Date;
  yesMultiplier?: number;
  noMultiplier?: number;
}

export function MarketGrid() {
  const [marketIds, setMarketIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    sortBy: 'newest'
  });

  const { getMarketCounter } = useContract();
  const { getMarket, refreshMarket } = useMarkets();

  // Load market IDs once (polling service handles data updates)
  useEffect(() => {
    async function loadMarketIds() {
      try {
        setLoading(true);
        const marketCounter = await getMarketCounter();
        const marketCount = Number(marketCounter);
        
        if (marketCount === 0) {
          setMarketIds([]);
          setLoading(false);
          return;
        }

        // Create array of market IDs (markets start from ID 1)
        const ids = Array.from({ length: marketCount }, (_, i) => i + 1);
        setMarketIds(ids);
      } catch (error) {
        console.error("Failed to load market count:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMarketIds();
  }, [getMarketCounter]);

  // Trigger loading for each market ID through centralized system
  useEffect(() => {
    marketIds.forEach(id => {
      refreshMarket(id);
    });
  }, [marketIds, refreshMarket]);

  // Get market data from centralized context and filter/sort
  const marketsWithData = marketIds
    .map(id => ({ id, data: getMarket(id) }))
    .filter(market => market.data !== undefined) as { id: number; data: Market }[];

  const filteredMarkets = marketsWithData
    .filter(market => {
      const { data } = market;
      
      // Search filter only
      if (filters.search && !data.question.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          const aCreated = new Date(a.data.createdAt).getTime();
          const bCreated = new Date(b.data.createdAt).getTime();
          return bCreated - aCreated;
        case 'mostActive':
          const aTotalBets = a.data.yesCount + a.data.noCount;
          const bTotalBets = b.data.yesCount + b.data.noCount;
          return bTotalBets - aTotalBets;
        case 'highestPool':
          const aTotalPool = BigInt(a.data.yesTotal) + BigInt(a.data.noTotal);
          const bTotalPool = BigInt(b.data.yesTotal) + BigInt(b.data.noTotal);
          return Number(bTotalPool - aTotalPool);
        case 'closingSoon':
          const aCloseTime = new Date(a.data.closeTime).getTime();
          const bCloseTime = new Date(b.data.closeTime).getTime();
          return aCloseTime - bCloseTime;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <SearchAndFilter 
          filters={filters} 
          onFiltersChange={setFilters}
          totalMarkets={0}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-4"></div>
              <div className="h-32 bg-gray-700 rounded mb-4"></div>
              <div className="flex space-x-4">
                <div className="flex-1 h-12 bg-gray-700 rounded"></div>
                <div className="flex-1 h-12 bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show loading if we have market IDs but no market data yet (still loading from polling service)
  const hasMarketIds = marketIds.length > 0;
  const hasMarketData = marketsWithData.length > 0;
  const isLoadingMarketData = hasMarketIds && !hasMarketData;

  if (marketIds.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <SearchAndFilter 
          filters={filters} 
          onFiltersChange={setFilters}
          totalMarkets={0}
        />
        <div className="text-center py-12">
          <div className="mb-6">
            <svg className="mx-auto h-24 w-24 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Markets</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Markets will appear here when they are created by administrators. Check back soon or create a market in the admin panel.
          </p>
          <div className="flex justify-center space-x-4">
            <a 
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Admin Panel
            </a>
            <a 
              href="/board"
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Live Board
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show loading animation if markets are still being loaded from polling service
  if (isLoadingMarketData) {
    return (
      <div className="space-y-6">
        <SearchAndFilter 
          filters={filters} 
          onFiltersChange={setFilters}
          totalMarkets={marketIds.length}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketIds.map((_, i) => (
            <div key={i} className="bg-[#2a2a2a] rounded-2xl p-6 animate-pulse border border-[#3a3a3a]">
              <div className="h-4 bg-[#3a3a3a] rounded mb-4"></div>
              <div className="h-32 bg-[#3a3a3a] rounded mb-4"></div>
              <div className="flex space-x-4">
                <div className="flex-1 h-12 bg-[#3a3a3a] rounded"></div>
                <div className="flex-1 h-12 bg-[#3a3a3a] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchAndFilter 
        filters={filters} 
        onFiltersChange={setFilters}
        totalMarkets={filteredMarkets.length}
      />
      
      {filteredMarkets.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No markets match your filters</h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria to find markets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map(market => (
            <MarketCard key={market.id} marketId={market.id} />
          ))}
        </div>
      )}
    </div>
  );
}