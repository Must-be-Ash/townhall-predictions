"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AdminContent from "./AdminContent";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}