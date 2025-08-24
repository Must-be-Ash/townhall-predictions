"use client";

import { CDPProvider } from "./CDPProvider";

interface RootProvidersProps {
  children: React.ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
  return (
    <CDPProvider>
      {children}
    </CDPProvider>
  );
}