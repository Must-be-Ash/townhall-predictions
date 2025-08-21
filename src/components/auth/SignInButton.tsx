"use client";

import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";

export function SignInButton() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <AuthButton />
    </div>
  );
}