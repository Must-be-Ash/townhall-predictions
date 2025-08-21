"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import ClientApp from "@/components/ClientApp";

export default function Home() {
  return (
    <CDPProvider>
      <ClientApp />
    </CDPProvider>
  );
}
