"use client";

import { CDPReactProvider, type AppConfig, type Theme } from "@coinbase/cdp-react";
import { type Config } from "@coinbase/cdp-core";

const CDP_CONFIG: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "",
};

const APP_CONFIG: AppConfig = {
  name: "TownHall Predictions",
  logoUrl: "http://localhost:3000/logo.svg", // Use full URL as shown in docs
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
      {children}
    </CDPReactProvider>
  );
}