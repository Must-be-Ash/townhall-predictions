"use client";

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { marketPollingService } from '@/services/MarketPollingService';

interface MarketData {
  marketId: number;
  question: string;
  closeTime: Date | string;
  resolved: boolean;
  winningOutcome: boolean;
  yesTotal: string;
  noTotal: string;
  yesCount: number;
  noCount: number;
  voided: boolean;
  createdAt: Date | string;
  lastUpdated: Date | string;
  participants: string[];
  yesMultiplier?: number;
  noMultiplier?: number;
}

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

interface MarketState {
  markets: Map<number, Market>;
  loading: Set<number>;
  errors: Map<number, string>;
  lastUpdated: Map<number, number>;
}

type MarketAction = 
  | { type: 'SET_LOADING'; marketId: number; loading: boolean }
  | { type: 'SET_MARKET'; marketId: number; market: Market }
  | { type: 'SET_ERROR'; marketId: number; error: string }
  | { type: 'CLEAR_ERROR'; marketId: number }
  | { type: 'OPTIMISTIC_UPDATE'; marketId: number; update: Partial<Market> };

const initialState: MarketState = {
  markets: new Map(),
  loading: new Set(),
  errors: new Map(),
  lastUpdated: new Map(),
};

function marketReducer(state: MarketState, action: MarketAction): MarketState {
  switch (action.type) {
    case 'SET_LOADING': {
      const newLoading = new Set(state.loading);
      if (action.loading) {
        newLoading.add(action.marketId);
      } else {
        newLoading.delete(action.marketId);
      }
      return { ...state, loading: newLoading };
    }

    case 'SET_MARKET': {
      const newMarkets = new Map(state.markets);
      const newLastUpdated = new Map(state.lastUpdated);
      const newErrors = new Map(state.errors);
      
      newMarkets.set(action.marketId, action.market);
      newLastUpdated.set(action.marketId, Date.now());
      newErrors.delete(action.marketId);
      
      return { ...state, markets: newMarkets, lastUpdated: newLastUpdated, errors: newErrors };
    }

    case 'SET_ERROR': {
      const newErrors = new Map(state.errors);
      newErrors.set(action.marketId, action.error);
      return { ...state, errors: newErrors };
    }

    case 'CLEAR_ERROR': {
      const newErrors = new Map(state.errors);
      newErrors.delete(action.marketId);
      return { ...state, errors: newErrors };
    }

    case 'OPTIMISTIC_UPDATE': {
      const newMarkets = new Map(state.markets);
      const currentMarket = newMarkets.get(action.marketId);
      if (currentMarket) {
        newMarkets.set(action.marketId, { ...currentMarket, ...action.update });
      }
      return { ...state, markets: newMarkets };
    }

    default:
      return state;
  }
}

interface MarketContextValue {
  state: MarketState;
  getMarket: (marketId: number) => Market | undefined;
  refreshMarket: (marketId: number) => Promise<void>;
  forceRefreshMarket: (marketId: number) => Promise<void>;
  isLoading: (marketId: number) => boolean;
  getError: (marketId: number) => string | undefined;
  optimisticUpdate: (marketId: number, update: Partial<Market>) => void;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

export function useMarkets() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarkets must be used within a MarketProvider');
  }
  return context;
}

interface MarketProviderProps {
  children: ReactNode;
}

// Helper function to check if market data actually changed
function hasMarketDataChanged(oldMarket: Market, newMarket: Market): boolean {
  // Compare critical fields that affect UI
  const criticalFields: (keyof Market)[] = [
    'question',
    'resolved',
    'winningOutcome',
    'voided',
    'yesCount',
    'noCount',
    'yesTotal',
    'noTotal',
    'yesMultiplier',
    'noMultiplier'
  ];

  return criticalFields.some(field => {
    const oldValue = oldMarket[field];
    const newValue = newMarket[field];
    
    // Special handling for bigint strings
    if (field === 'yesTotal' || field === 'noTotal') {
      return BigInt(oldValue as string) !== BigInt(newValue as string);
    }
    
    return oldValue !== newValue;
  });
}

export function MarketProvider({ children }: MarketProviderProps) {
  const [state, dispatch] = useReducer(marketReducer, initialState);

  // Set up polling service integration
  useEffect(() => {
    const handleMarketChange = (marketId: number, newData: MarketData) => {
      // Check if we already have this data to prevent redundant updates
      const existingMarket = state.markets.get(marketId);
      
      // Convert the polling service data format to our Market interface
      const market: Market = {
        question: newData.question,
        closeTime: newData.closeTime,
        resolved: newData.resolved,
        winningOutcome: newData.winningOutcome,
        yesTotal: newData.yesTotal,
        noTotal: newData.noTotal,
        yesCount: newData.yesCount,
        noCount: newData.noCount,
        voided: newData.voided,
        createdAt: newData.createdAt,
        yesMultiplier: newData.yesMultiplier,
        noMultiplier: newData.noMultiplier,
      };
      
      // Only update if data actually changed (deduplication)
      if (!existingMarket || hasMarketDataChanged(existingMarket, market)) {
        // Silent update - no loading states during polling
        dispatch({ type: 'SET_MARKET', marketId, market });
      }
    };

    marketPollingService.addChangeListener(handleMarketChange);

    return () => {
      marketPollingService.removeChangeListener(handleMarketChange);
    };
  }, [state.markets]);

  const fetchMarket = async (marketId: number, forceRefresh = false): Promise<Market | null> => {
    try {
      const url = forceRefresh ? `/api/markets/${marketId}?refresh=true` : `/api/markets/${marketId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.market) {
        return data.market;
      } else {
        throw new Error('Invalid market data received');
      }
    } catch (error) {
      throw error;
    }
  };

  const refreshMarket = useCallback(async (marketId: number) => {
    // Add market to polling service for automatic updates
    marketPollingService.addMarket(marketId);
    
    // Check if we already have data from polling service
    const pollingData = marketPollingService.getCurrentData(marketId);
    if (pollingData) {
      // Use existing polling data immediately without loading state
      const market: Market = {
        question: pollingData.question,
        closeTime: pollingData.closeTime,
        resolved: pollingData.resolved,
        winningOutcome: pollingData.winningOutcome,
        yesTotal: pollingData.yesTotal,
        noTotal: pollingData.noTotal,
        yesCount: pollingData.yesCount,
        noCount: pollingData.noCount,
        voided: pollingData.voided,
        createdAt: pollingData.createdAt,
        yesMultiplier: pollingData.yesMultiplier,
        noMultiplier: pollingData.noMultiplier,
      };
      dispatch({ type: 'SET_MARKET', marketId, market });
      return; // Exit early, polling service will handle updates
    }

    // Only show loading state for initial load when no data exists
    dispatch({ type: 'SET_LOADING', marketId, loading: true });
    dispatch({ type: 'CLEAR_ERROR', marketId });

    try {
      // For initial load only - make individual API call
      const market = await fetchMarket(marketId);
      if (market) {
        dispatch({ type: 'SET_MARKET', marketId, market });
        // Also trigger smart tier categorization after loading
        marketPollingService.forceRefresh(marketId, 3); // MEDIUM priority categorization
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch({ type: 'SET_ERROR', marketId, error: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', marketId, loading: false });
    }
  }, []);

  const forceRefreshMarket = useCallback(async (marketId: number, retries = 3) => {
    dispatch({ type: 'SET_LOADING', marketId, loading: true });
    dispatch({ type: 'CLEAR_ERROR', marketId });

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Force refresh bypasses cache and polling service
        const market = await fetchMarket(marketId, true);
        if (market) {
          dispatch({ type: 'SET_MARKET', marketId, market });
          return; // Success, exit retry loop
        }
      } catch (error) {
        console.error(`Failed to fetch market ${marketId}, attempt ${attempt}/${retries}:`, error);
        
        if (attempt === retries) {
          // Final attempt failed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          dispatch({ type: 'SET_ERROR', marketId, error: errorMessage });
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    dispatch({ type: 'SET_LOADING', marketId, loading: false });
  }, []);

  const getMarket = useCallback((marketId: number): Market | undefined => {
    return state.markets.get(marketId);
  }, [state.markets]);

  const isLoading = useCallback((marketId: number): boolean => {
    return state.loading.has(marketId);
  }, [state.loading]);

  const getError = useCallback((marketId: number): string | undefined => {
    return state.errors.get(marketId);
  }, [state.errors]);

  const optimisticUpdate = useCallback((marketId: number, update: Partial<Market>) => {
    dispatch({ type: 'OPTIMISTIC_UPDATE', marketId, update });
  }, []);

  const contextValue: MarketContextValue = useMemo(() => ({
    state,
    getMarket,
    refreshMarket,
    forceRefreshMarket,
    isLoading,
    getError,
    optimisticUpdate,
  }), [state, getMarket, refreshMarket, forceRefreshMarket, isLoading, getError, optimisticUpdate]);

  return (
    <MarketContext.Provider value={contextValue}>
      {children}
    </MarketContext.Provider>
  );
}