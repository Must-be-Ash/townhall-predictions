"use client";

import { useEffect, useState } from 'react';
import { useIsSignedIn, useCurrentUser, useEvmAddress } from '@coinbase/cdp-hooks';

export function SilentAutoFunding() {
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();
  const [hasProcessedUser, setHasProcessedUser] = useState(false);

  useEffect(() => {
    // Only process when user is signed in and we have an address, and haven't processed them yet
    if (!isSignedIn || !evmAddress || hasProcessedUser) {
      return;
    }

    // Prevent duplicate requests (React Strict Mode runs effects twice)
    const fundingKey = `funding_${evmAddress}`;
    if (sessionStorage.getItem(fundingKey)) {
      console.log('🔒 Funding already in progress for this user, skipping duplicate request');
      setHasProcessedUser(true);
      return;
    }

    const processUser = async () => {
      try {
        // Set lock to prevent duplicate requests
        sessionStorage.setItem(fundingKey, 'in_progress');
        console.log('🔍 Starting silent funding for user:', evmAddress);

        // Trigger auto-funding silently - just fund everyone who signs in
        const fundingResponse = await fetch('/api/faucet/admin-fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: evmAddress,
            userId: currentUser?.userId || 'unknown',
            attemptCount: 1
          })
        });

        const fundingResult = await fundingResponse.json();

        if (fundingResult.success) {
          if (fundingResult.skipped) {
            console.log('✅ User already had sufficient funds - no funding needed');
            sessionStorage.setItem(fundingKey, 'completed_skipped');
          } else {
            console.log('🎉 Silent auto-funding successful! User received 2 USDC + 0.0001 ETH');
            sessionStorage.setItem(fundingKey, 'completed_funded');
          }
        } else {
          console.warn('⚠️ Silent auto-funding failed but app continues normally:', fundingResult.error);
          sessionStorage.setItem(fundingKey, 'failed');
        }

      } catch (error) {
        // Complete fail-safe: any error is just logged, app continues normally
        console.warn('⚠️ Silent auto-funding had an error but app continues normally:', error);
        sessionStorage.setItem(fundingKey, 'error');
      } finally {
        // Mark as processed regardless of success/failure to avoid repeated attempts
        setHasProcessedUser(true);
      }
    };

    processUser();
  }, [isSignedIn, evmAddress, hasProcessedUser, currentUser?.userId]);

  // Reset when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      setHasProcessedUser(false);
      // Clear any funding locks when user signs out
      if (evmAddress) {
        sessionStorage.removeItem(`funding_${evmAddress}`);
      }
    }
  }, [isSignedIn, evmAddress]);

  // This component renders nothing - it's purely for background processing
  return null;
}