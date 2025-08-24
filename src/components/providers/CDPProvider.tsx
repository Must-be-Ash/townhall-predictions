"use client";

import { CDPReactProvider, type AppConfig, type Theme } from "@coinbase/cdp-react";
import { type Config } from "@coinbase/cdp-core";
import { MarketProvider } from "@/contexts/MarketContext";
import { getAbsoluteUrl } from "@/lib/config";

const CDP_CONFIG: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "",
};

const APP_CONFIG: AppConfig = {
  name: "Townhall Predictions",
  logoUrl: getAbsoluteUrl("/w-text.svg"), // Use environment-aware absolute URL
};

const THEME: Partial<Theme> = {
  "colors-bg-default": "#ffffff",
  "colors-bg-overlay": "rgba(0, 0, 0, 0.8)",
  "colors-fg-default": "#111827",
  "colors-fg-muted": "#6b7280",
};

interface ProvidersProps {
  children: React.ReactNode;
}

export function CDPProvider({ children }: ProvidersProps) {
  return (
    <CDPReactProvider config={CDP_CONFIG} app={APP_CONFIG} theme={THEME}>
      <MarketProvider>
        {children}
      </MarketProvider>
    </CDPReactProvider>
  );
}