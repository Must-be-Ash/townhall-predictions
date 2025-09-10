"use client";

import { useState, useEffect } from "react";
import { DockNavigation } from "@/components/navigation/DockNavigation";
import { formatAddress } from "@/lib/utils";

interface LeaderboardEntry {
  userAddress: string;
  displayName?: string;
  totalBets: number;
  correctPredictions: number;
  winRate: number;
  totalWinnings: string;
  rank: number;
}

interface LeaderboardData {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  totalUsers: number;
  timestamp: string;
}

export default function LeaderboardContent() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      
      if (data.success) {
        setLeaderboardData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 80) return "text-green-400";
    if (winRate >= 60) return "text-blue-400";
    if (winRate >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <DockNavigation />
        <main className="max-w-4xl mx-auto pt-10 md:pt-32 pb-20 md:pb-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-[#808080]">Loading leaderboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <DockNavigation />
        <main className="max-w-4xl mx-auto pt-10 md:pt-32 pb-20 md:pb-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4">⚠️</div>
              <p className="text-[#c0c0c0] mb-4">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { leaderboard } = leaderboardData || { leaderboard: [] };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <DockNavigation />
      
      <main className="max-w-4xl mx-auto pt-10 md:pt-32 pb-20 md:pb-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#ffffff] mb-2 font-[var(--font-climate-crisis)]">
            <span className="md:hidden">Leaderboard </span>
          </h1>

          <div className="text-xs text-[#606060] mt-2 max-w-2xl mx-auto">
            When users have identical win rates & correct predictions, we break the ties using &quot;early participation score&quot; - how early they bet relative to each market&apos;s lifetime. Earlier bettors face more uncertainty and deserve higher ranking.
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium text-[#c0c0c0] mb-2 font-[var(--font-climate-crisis)]">
              No Rankings Yet
            </h3>
            <p className="text-[#808080]">
              The leaderboard will populate once markets are resolved and predictions are scored.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium - Mobile First */}
            {leaderboard.length >= 3 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-[#ffffff] mb-4 text-center font-[var(--font-climate-crisis)]">
                  Top Performers
                </h2>
                
                {/* Mobile: Vertical Stack */}
                <div className="block md:hidden space-y-3">
                  {leaderboard.slice(0, 3).map((entry) => (
                    <div
                      key={entry.userAddress}
                      className={`bg-[#2a2a2a] border rounded-xl p-4 ${
                        entry.rank === 1
                          ? 'border-yellow-400/50 bg-gradient-to-r from-yellow-500/10 to-amber-500/10'
                          : entry.rank === 2
                          ? 'border-gray-400/50 bg-gradient-to-r from-gray-400/10 to-slate-400/10'
                          : 'border-orange-400/50 bg-gradient-to-r from-orange-500/10 to-amber-600/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getRankIcon(entry.rank)}</span>
                          <div>
                            <div className="font-mono text-sm text-[#ffffff]">
                              {entry.displayName || formatAddress(entry.userAddress)}
                            </div>
                            <div className={`text-sm font-semibold ${getWinRateColor(entry.winRate)}`}>
                              {entry.winRate.toFixed(1)}% accuracy
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-[#808080]">
                          {entry.correctPredictions}/{entry.totalBets}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Podium Layout */}
                <div className="hidden md:flex items-end justify-center space-x-6">
                  {/* 2nd Place */}
                  {leaderboard[1] && (
                    <div className="text-center">
                      <div className="bg-gradient-to-t from-gray-400/20 to-gray-400/10 border border-gray-400/30 rounded-xl p-4 mb-2 h-24 flex flex-col justify-end">
                        <div className="text-2xl mb-1">🥈</div>
                        <div className="font-mono text-sm text-[#ffffff]">
                          {leaderboard[1].displayName || formatAddress(leaderboard[1].userAddress)}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${getWinRateColor(leaderboard[1].winRate)}`}>
                        {leaderboard[1].winRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-[#808080]">
                        {leaderboard[1].correctPredictions}/{leaderboard[1].totalBets}
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  <div className="text-center">
                    <div className="bg-gradient-to-t from-yellow-400/20 to-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-2 h-32 flex flex-col justify-end">
                      <div className="text-3xl mb-1">🥇</div>
                      <div className="font-mono text-sm text-[#ffffff]">
                        {leaderboard[0].displayName || formatAddress(leaderboard[0].userAddress)}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${getWinRateColor(leaderboard[0].winRate)}`}>
                      {leaderboard[0].winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-[#808080]">
                      {leaderboard[0].correctPredictions}/{leaderboard[0].totalBets}
                    </div>
                  </div>

                  {/* 3rd Place */}
                  {leaderboard[2] && (
                    <div className="text-center">
                      <div className="bg-gradient-to-t from-orange-400/20 to-orange-400/10 border border-orange-400/30 rounded-xl p-4 mb-2 h-20 flex flex-col justify-end">
                        <div className="text-2xl mb-1">🥉</div>
                        <div className="font-mono text-sm text-[#ffffff]">
                          {leaderboard[2].displayName || formatAddress(leaderboard[2].userAddress)}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${getWinRateColor(leaderboard[2].winRate)}`}>
                        {leaderboard[2].winRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-[#808080]">
                        {leaderboard[2].correctPredictions}/{leaderboard[2].totalBets}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#3a3a3a]">
                <h3 className="font-semibold text-[#ffffff] font-[var(--font-climate-crisis)]">
                  All Rankings
                </h3>
              </div>
              
              <div className="divide-y divide-[#3a3a3a]">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.userAddress}
                    className="px-4 py-3 hover:bg-[#333333] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="text-sm font-medium text-[#808080] w-8 flex-shrink-0">
                          {getRankIcon(entry.rank)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm text-[#ffffff] truncate">
                            {entry.displayName || formatAddress(entry.userAddress)}
                          </div>
                          <div className="text-xs text-[#808080]">
                            {entry.correctPredictions} correct out of {entry.totalBets} predictions
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className={`text-sm font-semibold ${getWinRateColor(entry.winRate)}`}>
                          {entry.winRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-[#606060]">
                          ${entry.totalWinnings}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Refresh Button */}
        <div className="text-center mt-8">
          <button
            onClick={fetchLeaderboard}
            className="bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#c0c0c0] px-4 py-2 rounded-lg transition-colors text-sm flex items-center space-x-2 mx-auto"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            <span>Refresh Rankings</span>
          </button>
        </div>
      </main>
    </div>
  );
}
