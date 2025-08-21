"use client";

import { useState, useEffect } from "react";
import { useContract } from "@/hooks/useContract";

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

export function RecentActivity({ marketId }: RecentActivityProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { getMarket } = useContract();

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

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [marketId, getMarket]);

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
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {Number(market.yesCount)}
              </div>
              <div className="text-sm text-green-300 mb-2">YES Holders</div>
              <div className="text-xs text-[#808080]">
                {yesPercentage}% of participants
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">
                {Number(market.noCount)}
              </div>
              <div className="text-sm text-red-300 mb-2">NO Holders</div>
              <div className="text-xs text-[#808080]">
                {noPercentage}% of participants
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Market Insights */}
      {totalBets > 0 && (
        <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6">
          <h3 className="text-xl font-bold text-[#ffffff] mb-4 font-[var(--font-climate-crisis)]">Market Insights</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-[#3a3a3a] rounded-lg">
              <div className="text-2xl font-bold text-[#ffffff] mb-1">
                {totalBets}
              </div>
              <div className="text-sm text-[#808080]">Total Participants</div>
            </div>
            <div className="text-center p-4 bg-[#3a3a3a] rounded-lg">
              <div className="text-2xl font-bold text-[#ffffff] mb-1">
                ${(totalBets * 0.5).toFixed(2)}
              </div>
              <div className="text-sm text-[#808080]">Total Amount Placed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}