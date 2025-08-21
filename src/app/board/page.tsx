"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import BoardContent from "./BoardContent";

// Force dynamic rendering for real-time updates
export const dynamic = 'force-dynamic';

export default function BoardPage() {
  return (
    <CDPProvider>
      <BoardContent />
    </CDPProvider>
  );
}