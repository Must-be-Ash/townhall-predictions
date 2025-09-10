"use client";

import { useCurrentUser } from "@coinbase/cdp-hooks";

export function useCoinbaseAuth() {
  const { currentUser } = useCurrentUser();

  const validateCoinbaseEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@coinbase.com');
  };

  // Get the user's email from authentication methods
  const getUserEmail = (): string | null => {
    if (!currentUser?.authenticationMethods?.email?.email) {
      return null;
    }
    return currentUser.authenticationMethods.email.email;
  };

  // Check if user has a valid Coinbase email
  const hasValidCoinbaseEmail = (): boolean => {
    const email = getUserEmail();
    if (!email) return false;
    return validateCoinbaseEmail(email);
  };

  return {
    currentUser,
    getUserEmail,
    hasValidCoinbaseEmail,
    validateCoinbaseEmail,
  };
}