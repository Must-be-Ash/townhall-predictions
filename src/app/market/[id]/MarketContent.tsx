"use client";

import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { MarketCard } from "@/components/market/MarketCard";
import { RecentActivity } from "@/components/board/RecentActivity";
import { useParams } from "next/navigation";
import { DockNavigation } from "@/components/navigation/DockNavigation";

export default function MarketContent() {
  const params = useParams();
  const marketId = parseInt(params.id as string);
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[#808080]">Initializing CDP...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="max-w-md mx-auto bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#ffffff] mb-4 font-[var(--font-climate-crisis)]">
              Prediction Market
            </h1>
            <p className="text-[#808080] mb-8">
              Sign in to participate in this prediction market
            </p>
            <AuthButton />
          </div>
        </div>
      </div>
    );
  }

  if (isNaN(marketId)) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#ffffff] mb-4 font-[var(--font-climate-crisis)]">Invalid Market</h1>
          <p className="text-[#808080]">Market ID must be a number</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Dock Navigation */}
      <DockNavigation />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pt-24 md:pt-32 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          
          {/* Market Card - Contains everything needed for betting */}
          <MarketCard marketId={marketId} hideDetailsLink={true} />
          
          {/* Recent Activity Feed */}
          <RecentActivity marketId={marketId} />

        </div>
      </main>
    </div>
  );
}