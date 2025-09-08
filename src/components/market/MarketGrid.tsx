"use client";

import { useState, useEffect } from "react";
import { MarketCard } from "./MarketCard";
import { SearchAndFilter, FilterOptions } from "./SearchAndFilter";
import { useContract } from "@/hooks/useContract";
import { useMarkets } from "@/contexts/MarketContext";
import { HIDDEN_MARKETS } from "@/lib/constants";

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

const MARKETS_PER_PAGE = 9;

export function MarketGrid() {
  const [allMarketIds, setAllMarketIds] = useState<number[]>([]);
  const [displayedMarketIds, setDisplayedMarketIds] = useState<number[]>([]);
  const [searchMarketIds, setSearchMarketIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    sortBy: 'newest'
  });

  const { getMarketCounter } = useContract();
  const { getMarket, refreshMarket } = useMarkets();

  // Determine search state early
  const isSearchActive = filters.search.trim().length > 0;
  
  // For search, we need to look through ALL markets, so we set searchMarketIds to match search
  useEffect(() => {
    if (!filters.search.trim()) {
      setSearchMarketIds([]);
      return;
    }

    setSearchLoading(true);
    
    // Trigger loading for all markets first
    allMarketIds.forEach(id => refreshMarket(id));
    
    // Then search through them with a delay
    const timeoutId = setTimeout(() => {
      const matchingIds: number[] = [];
      
      for (const id of allMarketIds) {
        const marketData = getMarket(id);
        
        if (marketData && marketData.question.toLowerCase().includes(filters.search.toLowerCase())) {
          matchingIds.push(id);
        }
      }
      
      setSearchMarketIds(matchingIds);
      setSearchLoading(false);
    }, 800); // Give time for markets to load

    return () => {
      clearTimeout(timeoutId);
      setSearchLoading(false);
    };
  }, [filters.search, allMarketIds]); // Only depend on search term and market IDs

  // Load more markets function
  const loadMoreMarkets = async () => {
    if (loadingMore || displayedMarketIds.length >= allMarketIds.length) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const startIndex = 0; // Always start from beginning
      const endIndex = nextPage * MARKETS_PER_PAGE;
      
      // Get all markets up to the current page
      const newDisplayedIds = allMarketIds.slice(startIndex, endIndex);
      setDisplayedMarketIds(newDisplayedIds);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Failed to load more markets:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Calculate if there are more markets to load (only when not searching)
  const hasMoreMarkets = !isSearchActive && displayedMarketIds.length < allMarketIds.length;
  const remainingMarkets = allMarketIds.length - displayedMarketIds.length;

  // Reset pagination when non-search filters change
  useEffect(() => {
    if (allMarketIds.length > 0 && !filters.search.trim()) {
      setCurrentPage(1);
      const firstPageIds = allMarketIds.slice(0, MARKETS_PER_PAGE);
      setDisplayedMarketIds(firstPageIds);
    }
  }, [filters.sortBy, allMarketIds, filters.search]);

  // Load all market IDs once to know total count
  useEffect(() => {
    async function loadAllMarketIds() {
      try {
        setLoading(true);
        const marketCounter = await getMarketCounter();
        const marketCount = Number(marketCounter);
        
        if (marketCount === 0) {
          setAllMarketIds([]);
          setDisplayedMarketIds([]);
          setLoading(false);
          return;
        }

        // Create array of all market IDs (markets start from ID 0), excluding hidden ones
        // Reverse the array so newest markets (highest IDs) come first
        const ids = Array.from({ length: marketCount }, (_, i) => marketCount - 1 - i)
          .filter(id => !HIDDEN_MARKETS.includes(id));
        setAllMarketIds(ids);
        
        // Load first page of markets (now contains newest markets)
        const firstPageIds = ids.slice(0, MARKETS_PER_PAGE);
        setDisplayedMarketIds(firstPageIds);
      } catch (error) {
        console.error("Failed to load market count:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAllMarketIds();
  }, [getMarketCounter]);

  // Determine which market IDs to use based on search state
  const activeMarketIds = isSearchActive ? searchMarketIds : displayedMarketIds;

  // Trigger loading for active markets
  useEffect(() => {
    activeMarketIds.forEach(id => {
      refreshMarket(id);
    });
  }, [activeMarketIds, refreshMarket]);

  // Get market data from centralized context for active markets
  const marketsWithData = activeMarketIds
    .map(id => ({ id, data: getMarket(id) }))
    .filter(market => market.data !== undefined) as { id: number; data: Market }[];

  const filteredMarkets = marketsWithData
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

  // Show loading if we have market IDs but no market data yet (still loading from polling service or searching)
  const hasMarketIds = activeMarketIds.length > 0;
  const hasMarketData = marketsWithData.length > 0;
  const isLoadingMarketData = (hasMarketIds && !hasMarketData) || searchLoading;

  if (allMarketIds.length === 0 && !loading) {
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
        </div>
      </div>
    );
  }

  // Show loading animation if markets are still being loaded from polling service or searching
  if (isLoadingMarketData) {
    return (
      <div className="space-y-6">
        <SearchAndFilter 
          filters={filters} 
          onFiltersChange={setFilters}
          totalMarkets={activeMarketIds.length}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeMarketIds.map((_, i) => (
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map(market => (
              <MarketCard key={market.id} marketId={market.id} />
            ))}
          </div>
          
          {/* Load More Button */}
          {hasMoreMarkets && (
            <div className="flex flex-col items-center mt-8 space-y-3">
              <p className="text-sm text-gray-400">
                Showing {displayedMarketIds.length} of {allMarketIds.length} markets
                {remainingMarkets > 0 && (
                  <span className="ml-1">({remainingMarkets} more available)</span>
                )}
              </p>
              <button
                onClick={loadMoreMarkets}
                disabled={loadingMore}
                className={`
                  px-6 py-3 rounded-xl font-medium transition-all duration-200
                  ${loadingMore 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg hover:scale-105'
                  }
                  flex items-center space-x-2
                `}
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Markets</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}