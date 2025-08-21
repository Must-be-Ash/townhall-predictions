"use client";

import { CDPProvider } from "@/components/providers/CDPProvider";
import AdminContent from "./AdminContent";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <CDPProvider>
      <AdminContent />
    </CDPProvider>
  );
}