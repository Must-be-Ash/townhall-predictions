"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useContract } from "@/hooks/useContract";
import { formatUSDC } from "@/lib/constants";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface RecentActivityProps {
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

interface BetEvent {
  userAddress: string;
  displayName: string;
  outcome: boolean;
  amount: string;
  timestamp: Date;
  transactionHash: string;
}

export function RecentActivity({ marketId }: RecentActivityProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<BetEvent[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);
  const [showAllBets, setShowAllBets] = useState(false);
  const betsRef = useRef<BetEvent[]>([]);
  
  const { getMarket } = useContract();

  // Keep bets ref in sync
  useEffect(() => {
    betsRef.current = bets;
  }, [bets]);

  // Function to format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Function to check if bet events have actually changed
  const haveBetsChanged = useCallback((oldBets: BetEvent[], newBets: BetEvent[]): boolean => {
    if (oldBets.length !== newBets.length) return true;
    
    // Compare transaction hashes as unique identifiers
    const oldHashes = new Set(oldBets.map(bet => bet.transactionHash));
    const newHashes = new Set(newBets.map(bet => bet.transactionHash));
    
    // Check if any transaction hash is different
    return oldBets.some(bet => !newHashes.has(bet.transactionHash)) ||
           newBets.some(bet => !oldHashes.has(bet.transactionHash));
  }, []);

  const fetchBetEvents = useCallback(async (showLoadingState = true) => {
    try {
      if (showLoadingState) setBetsLoading(true);
      const response = await fetch(`/api/markets/${marketId}/bets`);
      const data = await response.json();
      
      if (data.success) {
        // Only update state if data has actually changed
        if (haveBetsChanged(betsRef.current, data.bets)) {
          setBets(data.bets);
        }
      } else {
        console.error("Failed to fetch bet events:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch bet events:", error);
    } finally {
      if (showLoadingState) setBetsLoading(false);
    }
  }, [marketId, haveBetsChanged]);

  useEffect(() => {
    async function loadData() {
      try {
        const marketData = await getMarket(marketId);
        setMarket(marketData as Market);
      } catch (error) {
        console.error("Failed to load activity data:", error);
      } finally {
        setLoading(false);
      }
    }

    // Initial load with loading states
    loadData();
    fetchBetEvents(true);
    
    // Background polling without loading states (silent updates)
    const interval = setInterval(() => {
      loadData();
      fetchBetEvents(false); // Silent update
    }, 10000); // Increased to 10 seconds for less aggressive polling
    
    return () => clearInterval(interval);
  }, [marketId, getMarket, fetchBetEvents]);

  if (loading) {
    return (
      <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#3a3a3a] rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-[#3a3a3a] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!market) return null;

  const totalBets = Number(market.yesCount) + Number(market.noCount);
  const totalPool = market.yesTotal + market.noTotal;
  const yesPercentage = totalBets > 0 ? Math.round((Number(market.yesCount) / totalBets) * 100) : 50;
  const noPercentage = 100 - yesPercentage;

  return (
    <div className="space-y-6">
      
      {/* Activity Header */}
      <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#ffffff] font-[var(--font-climate-crisis)]">Activity</h3>
          {totalBets > 0 && (
            <span className="text-sm text-[#808080]">
              {totalBets} participants
            </span>
          )}
        </div>

        {totalBets === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-[#808080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-[#808080]">No participants yet</p>
            <p className="text-[#808080] text-sm mt-1">
              Be the first to place a bet on this market
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {Number(market.yesCount)}
              </div>
              <div className="text-sm text-green-300 mb-1">YES</div>
              <div className="text-xs text-[#808080]">{yesPercentage}%</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">
                {Number(market.noCount)}
              </div>
              <div className="text-sm text-red-300 mb-1">NO</div>
              <div className="text-xs text-[#808080]">{noPercentage}%</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-[#ffffff] mb-1">
                {totalBets}
              </div>
              <div className="text-sm text-[#808080] mb-1">Total</div>
              <div className="text-xs text-[#808080]">Participants</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-[#ffffff] mb-1">
                {formatUSDC(totalPool)}
              </div>
              <div className="text-sm text-[#808080] mb-1">Total</div>
              <div className="text-xs text-[#808080]">Amount</div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Participant Activity */}
      {bets.length > 0 && (
        <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#ffffff] font-[var(--font-climate-crisis)]">Recent Activity</h3>
            {bets.length > 5 && (
              <button
                onClick={() => setShowAllBets(!showAllBets)}
                className="flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showAllBets ? 'Show Less' : `Show All ${bets.length}`}
                {showAllBets ? (
                  <ChevronUpIcon className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 ml-1" />
                )}
              </button>
            )}
          </div>

          {betsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-[#3a3a3a] rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(showAllBets ? bets : bets.slice(0, 5)).map((bet, index) => (
                <div key={`${bet.transactionHash}-${index}`} className="flex items-center justify-between p-3 bg-[#3a3a3a] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        bet.outcome ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {bet.outcome ? 'Y' : 'N'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[#ffffff] font-medium truncate">
                          {bet.displayName}
                        </span>
                        <span className="text-[#808080] text-sm">
                          bet {bet.outcome ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="text-xs text-[#808080]">
                        {formatRelativeTime(new Date(bet.timestamp))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#ffffff] font-medium">
                      {formatUSDC(BigInt(bet.amount))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}