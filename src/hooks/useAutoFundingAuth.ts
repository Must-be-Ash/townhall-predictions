"use client";

import { useCallback, useState } from 'react';
import { useVerifyEmailOTP, useVerifySmsOTP } from '@coinbase/cdp-hooks';

export interface AutoFundingStatus {
  status: 'idle' | 'funding' | 'completed' | 'failed' | 'retrying';
  message?: string;
  transactionHashes?: {
    eth?: string;
    usdc?: string;
  };
  error?: string;
  attemptCount?: number;
  isRetryable?: boolean;
}

interface VerificationResult {
  user?: {
    evmAccounts?: `0x${string}`[];
    email?: string;
    displayName?: string;
    userId?: string;
    [key: string]: unknown;
  };
  isNewUser?: boolean;
  [key: string]: unknown;
}

interface FundingTransaction {
  type: 'ETH' | 'USDC';
  hash: string;
  amount?: string;
  gasUsed?: string;
  blockNumber?: string;
}

interface FundingResponse {
  success: boolean;
  funding?: {
    usdcAmount: string;
    ethAmount: string;
  };
  transactions?: FundingTransaction[];
  error?: string;
  retryable?: boolean;
  skipped?: boolean;
}

export interface UseAutoFundingAuthReturn {
  verifyEmailOTPWithFunding: (params: { flowId: string; otp: string }) => Promise<VerificationResult>;
  verifySmsOTPWithFunding: (params: { flowId: string; otp: string }) => Promise<VerificationResult>;
  fundingStatus: AutoFundingStatus;
  retryFunding: () => void;
}

export function useAutoFundingAuth(): UseAutoFundingAuthReturn {
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { verifySmsOTP } = useVerifySmsOTP();
  const [fundingStatus, setFundingStatus] = useState<AutoFundingStatus>({ status: 'idle' });
  const [currentUser, setCurrentUser] = useState<{ address: string; id: string } | null>(null);

  const triggerAutoFunding = useCallback(async (userAddress: string, userId: string, attemptCount = 1) => {
    const maxRetries = 3;
    const isRetrying = attemptCount > 1;
    
    setFundingStatus({ 
      status: isRetrying ? 'retrying' : 'funding', 
      message: isRetrying ? `Retrying funding (attempt ${attemptCount}/${maxRetries})...` : 'Getting your play money...',
      attemptCount
    });

    try {
      console.log(`🚀 ${isRetrying ? 'Retrying' : 'Starting'} auto-funding for user: ${userAddress} (attempt ${attemptCount})`);
      
      const response = await fetch('/api/faucet/admin-fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          userId,
          attemptCount
        }),
      });

      const result = await response.json() as FundingResponse;

      if (result.success) {
        console.log('✅ Auto-funding successful:', result);
        
        if (result.skipped) {
          // User was already funded
          setFundingStatus({
            status: 'completed',
            message: 'You already have funds! Ready to play.',
            transactionHashes: {}
          });
        } else {
          // Normal funding success
          setFundingStatus({
            status: 'completed',
            message: `Success! You received ${result.funding?.usdcAmount} USDC + ${result.funding?.ethAmount} ETH`,
            transactionHashes: {
              eth: result.transactions?.find((tx) => tx.type === 'ETH')?.hash,
              usdc: result.transactions?.find((tx) => tx.type === 'USDC')?.hash,
            }
          });
        }

        // Update user record in database
        await fetch('/api/users/update-funding-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress,
            status: 'completed',
            fundingDetails: result
          })
        });

      } else {
        console.error('❌ Auto-funding failed:', result.error);
        
        // Check if we should retry
        if (result.retryable && attemptCount < maxRetries) {
          console.log(`⏳ Scheduling retry ${attemptCount + 1}/${maxRetries} in 3 seconds...`);
          setTimeout(() => {
            triggerAutoFunding(userAddress, userId, attemptCount + 1);
          }, 3000);
          return;
        }
        
        // Final failure
        setFundingStatus({
          status: 'failed',
          message: result.retryable ? 'Funding failed after retries' : 'Funding failed',
          error: result.error,
          attemptCount,
          isRetryable: result.retryable
        });

        // Update user record with failed status
        await fetch('/api/users/update-funding-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress,
            status: 'failed',
            error: result.error,
            attemptCount
          })
        });
      }
    } catch (error) {
      console.error('❌ Auto-funding request failed:', error);
      
      // Check if we should retry on network errors
      if (attemptCount < maxRetries) {
        console.log(`⏳ Network error, scheduling retry ${attemptCount + 1}/${maxRetries} in 5 seconds...`);
        setTimeout(() => {
          triggerAutoFunding(userAddress, userId, attemptCount + 1);
        }, 5000);
        return;
      }
      
      // Final failure
      setFundingStatus({
        status: 'failed',
        message: 'Network error during funding',
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptCount,
        isRetryable: true
      });

      // Update user record with failed status
      try {
        await fetch('/api/users/update-funding-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Network error',
            attemptCount
          })
        });
      } catch (dbError) {
        console.error('Failed to update user funding status:', dbError);
      }
    }
  }, []);

  const verifyEmailOTPWithFunding = useCallback(async (params: { flowId: string; otp: string }) => {
    console.log('🔐 Verifying email OTP...');
    
    // First, complete the normal verification
    const verificationResult = await verifyEmailOTP(params);
    console.log('✅ Email OTP verified:', verificationResult);

    // Always create/update user record for any authenticated user
    if (verificationResult.user?.evmAccounts?.[0]) {
      const userAddress = verificationResult.user.evmAccounts[0];
      const userId = verificationResult.user.userId;
      
      // Create/update user record in database first
      try {
        console.log('👤 Processing user record for:', userAddress);
        const userResponse = await fetch('/api/users/create-or-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: verificationResult.user?.authenticationMethods?.email?.email || '',
            evmAddress: userAddress,
            displayName: (verificationResult.user as { displayName?: string })?.displayName || ''
          })
        });
        
        const userData = await userResponse.json();
        console.log('👤 User record processed:', userData);
        
        // Only trigger funding for new users
        if (verificationResult.isNewUser) {
          // Check if user has already been funded
          if (userData.user?.autoFundingStatus === 'completed') {
            console.log('✅ User already funded - skipping auto-funding');
            setFundingStatus({ status: 'idle' });
            setCurrentUser(null);
            return verificationResult;
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to process user record:', error);
      }
      
      // Only trigger funding for new users
      if (verificationResult.isNewUser) {
        // Store user info for potential retries
        setCurrentUser({ address: userAddress, id: userId });
        
        console.log(`🆕 New user detected! Triggering auto-funding for ${userAddress}`);
        
        // Don't await this - let it run in background while user proceeds
        triggerAutoFunding(userAddress, userId);
      } else {
        console.log('👤 Returning user - no auto-funding needed');
        setFundingStatus({ status: 'idle' });
        setCurrentUser(null);
      }
    } else {
      console.log('👤 No user data in verification result');
      setFundingStatus({ status: 'idle' });
      setCurrentUser(null);
    }

    return verificationResult;
  }, [verifyEmailOTP, triggerAutoFunding]);

  const verifySmsOTPWithFunding = useCallback(async (params: { flowId: string; otp: string }) => {
    console.log('🔐 Verifying SMS OTP...');
    
    // First, complete the normal verification
    const verificationResult = await verifySmsOTP(params);
    console.log('✅ SMS OTP verified:', verificationResult);

    // Always create/update user record for any authenticated user
    if (verificationResult.user?.evmAccounts?.[0]) {
      const userAddress = verificationResult.user.evmAccounts[0];
      const userId = verificationResult.user.userId;
      
      // Create/update user record in database first
      try {
        console.log('👤 Processing user record for:', userAddress);
        const userResponse = await fetch('/api/users/create-or-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: verificationResult.user?.authenticationMethods?.sms?.phoneNumber || `sms_user_${userAddress.slice(-8)}@phone.local`, // Create pseudo-email for SMS users
            evmAddress: userAddress,
            displayName: (verificationResult.user as { displayName?: string })?.displayName || ''
          })
        });
        
        const userData = await userResponse.json();
        console.log('👤 User record processed:', userData);
        
        // Only trigger funding for new users
        if (verificationResult.isNewUser) {
          // Check if user has already been funded
          if (userData.user?.autoFundingStatus === 'completed') {
            console.log('✅ User already funded - skipping auto-funding');
            setFundingStatus({ status: 'idle' });
            setCurrentUser(null);
            return verificationResult;
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to process user record:', error);
      }
      
      // Only trigger funding for new users
      if (verificationResult.isNewUser) {
        // Store user info for potential retries
        setCurrentUser({ address: userAddress, id: userId });
        
        console.log(`🆕 New user detected! Triggering auto-funding for ${userAddress}`);
        
        // Don't await this - let it run in background while user proceeds
        triggerAutoFunding(userAddress, userId);
      } else {
        console.log('👤 Returning user - no auto-funding needed');
        setFundingStatus({ status: 'idle' });
        setCurrentUser(null);
      }
    } else {
      console.log('👤 No user data in verification result');
      setFundingStatus({ status: 'idle' });
      setCurrentUser(null);
    }

    return verificationResult;
  }, [verifySmsOTP, triggerAutoFunding]);

  const retryFunding = useCallback(() => {
    if (!currentUser) {
      console.warn('No current user to retry funding for');
      return;
    }
    
    console.log('🔄 Manual retry requested for user:', currentUser.address);
    triggerAutoFunding(currentUser.address, currentUser.id, 1);
  }, [currentUser, triggerAutoFunding]);

  return {
    verifyEmailOTPWithFunding,
    verifySmsOTPWithFunding,
    fundingStatus,
    retryFunding
  };
}