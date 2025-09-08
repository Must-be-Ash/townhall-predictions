"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LeaderboardContent from "./LeaderboardContent";

export default function LeaderboardPage() {
  return (
    <CDPProvider>
      <ProtectedRoute>
        <LeaderboardContent />
      </ProtectedRoute>
    </CDPProvider>
  );
}
