"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import MarketContent from "./MarketContent";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function MarketPage() {
  return (
    <CDPProvider>
      <MarketContent />
    </CDPProvider>
  );
}