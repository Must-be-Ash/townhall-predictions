"use client";

import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";
import { MarketGrid } from "./market/MarketGrid";
import { DockNavigation } from "./navigation/DockNavigation";
import { LandingPage } from "./landing/LandingPage";
import { SilentAutoFunding } from "./auth/SilentAutoFunding";

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
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Silent auto-funding - runs in background */}
      <SilentAutoFunding />
      
      {/* Dock Navigation */}
      <DockNavigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pt-10 md:pt-32 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8">

        
        <MarketGrid />
      </main>
    </div>
  );
}