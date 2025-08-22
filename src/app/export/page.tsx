"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import ExportContent from "./ExportContent";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ExportPage() {
  return (
    <CDPProvider>
      <ExportContent />
    </CDPProvider>
  );
}