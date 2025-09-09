"use client";

import { useEffect, useState } from 'react';
import { useIsSignedIn, useCurrentUser, useEvmAddress } from '@coinbase/cdp-hooks';

export function SilentAutoFunding() {
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();
  const [hasProcessedUser, setHasProcessedUser] = useState(false);

  useEffect(() => {
    // Only process when user is signed in and we have an address and user data, and haven't processed them yet
    if (!isSignedIn || !evmAddress || !currentUser || hasProcessedUser) {
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
        console.log('🔍 Starting silent user processing for:', evmAddress);

        // First, create/update user record in database
        if (currentUser?.authenticationMethods?.email?.email) {
          const email = currentUser.authenticationMethods.email.email;
          console.log('👤 Creating/updating user record for email:', email);

          try {
            const userResponse = await fetch('/api/users/create-or-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                evmAddress
              })
            });

            const userData = await userResponse.json();
            if (userData.success) {
              console.log(`✅ ${userData.user.isNewUser ? 'Created new' : 'Updated existing'} user:`, userData.user.username);
            } else {
              console.warn('⚠️ User creation/update failed:', userData.error);
            }
          } catch (userError) {
            console.warn('⚠️ Failed to process user record:', userError);
          }
        } else {
          console.warn('⚠️ No email available in user object, skipping user record creation');
        }

        // Then trigger auto-funding silently - fund everyone who signs in
        console.log('💰 Starting auto-funding for user:', evmAddress);
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
  }, [isSignedIn, evmAddress, hasProcessedUser, currentUser]);

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