"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import { MarketProvider } from "@/contexts/MarketContext";
import MarketContent from "./MarketContent";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function MarketPage() {
  return (
    <CDPProvider>
      <MarketProvider>
        <MarketContent />
      </MarketProvider>
    </CDPProvider>
  );
}