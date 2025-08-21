"use client";

import { useState, useEffect } from "react";
import { MarketCard } from "./MarketCard";
import { SearchAndFilter, FilterOptions } from "./SearchAndFilter";
import { useContract } from "@/hooks/useContract";

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

export function MarketGrid() {
  const [markets, setMarkets] = useState<{ id: number; data: Market }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    sortBy: 'newest'
  });

  const { getMarketCounter, getMarket } = useContract();

  // Load all markets
  useEffect(() => {
    async function loadMarkets() {
      try {
        setLoading(true);
        const marketCounter = await getMarketCounter();
        const marketCount = Number(marketCounter);
        
        if (marketCount === 0) {
          setMarkets([]);
          setLoading(false);
          return;
        }

        // Load all markets
        const marketPromises = [];
        for (let i = 0; i < marketCount; i++) {
          marketPromises.push(
            getMarket(i).then(market => ({ id: i, data: market as Market }))
          );
        }

        const allMarkets = await Promise.all(marketPromises);
        setMarkets(allMarkets);
      } catch (error) {
        console.error("Failed to load markets:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMarkets();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadMarkets, 10000);
    return () => clearInterval(interval);
  }, [getMarketCounter, getMarket]);

  // Filter and sort markets
  const filteredMarkets = markets
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
          return Number(b.data.createdAt) - Number(a.data.createdAt);
        case 'mostActive':
          const aTotalBets = Number(a.data.yesCount) + Number(a.data.noCount);
          const bTotalBets = Number(b.data.yesCount) + Number(b.data.noCount);
          return bTotalBets - aTotalBets;
        case 'highestPool':
          const aTotalPool = Number(a.data.yesTotal) + Number(a.data.noTotal);
          const bTotalPool = Number(b.data.yesTotal) + Number(b.data.noTotal);
          return bTotalPool - aTotalPool;
        case 'closingSoon':
          return Number(a.data.closeTime) - Number(b.data.closeTime);
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

  if (markets.length === 0) {
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