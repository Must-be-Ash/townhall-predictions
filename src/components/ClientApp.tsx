"use client";

import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { MarketGrid } from "./market/MarketGrid";
import { DockNavigation } from "./navigation/DockNavigation";

export default function ClientApp() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[#808080]">Loading...</p>
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
              Townhall Predictions
            </h1>
            <p className="text-[#808080] mb-8">
              Sign in to participate in prediction markets with dynamic AMM-lite odds
            </p>
            <AuthButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Dock Navigation */}
      <DockNavigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pt-10 md:pt-32 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8">

        
        <MarketGrid />
      </main>
    </div>
  );
}