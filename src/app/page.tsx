"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import { MarketProvider } from "@/contexts/MarketContext";
import ClientApp from "@/components/ClientApp";

export default function Home() {
  return (
    <CDPProvider>
      <MarketProvider>
        <ClientApp />
      </MarketProvider>
    </CDPProvider>
  );
}
