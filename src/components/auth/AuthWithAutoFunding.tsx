"use client";

import { useState } from 'react';
import { useSignInWithEmail } from '@coinbase/cdp-hooks';
import { useAutoFundingAuth } from '@/hooks/useAutoFundingAuth';
import { FundingProgressModal } from '@/components/ui/FundingProgressModal';

interface AuthWithAutoFundingProps {
  onAuthSuccess?: () => void;
}

export function AuthWithAutoFunding({ onAuthSuccess }: AuthWithAutoFundingProps) {
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTPWithFunding, fundingStatus, retryFunding } = useAutoFundingAuth();
  
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [flowId, setFlowId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Show funding modal when funding is in progress or completed/failed
  const showFundingModal = fundingStatus.status !== 'idle';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmail({ email });
      setFlowId(result.flowId);
      setStep('otp');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !flowId) return;

    setLoading(true);
    setError('');

    try {
      // This will trigger auto-funding for new users
      const result = await verifyEmailOTPWithFunding({ flowId, otp });
      console.log('Authentication successful:', result);
      
      // If user is returning (no auto-funding), proceed immediately
      if (fundingStatus.status === 'idle') {
        onAuthSuccess?.();
      }
      // For new users, onAuthSuccess will be called when funding modal is closed
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFundingModalClose = () => {
    // Call onAuthSuccess when user closes the funding modal
    onAuthSuccess?.();
  };

  return (
    <>
      <div className="max-w-md mx-auto bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#ffffff] mb-4 font-[var(--font-climate-crisis)]">
            Townhall Predictions
          </h1>
          <p className="text-[#808080]">
            Sign in to start making predictions
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#c0c0c0] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-[#ffffff] placeholder-[#808080] focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-[#c0c0c0] text-sm">
                Enter the 6-digit code sent to <strong className="text-white">{email}</strong>
              </p>
            </div>

            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-[#c0c0c0] mb-2">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-[#ffffff] placeholder-[#808080] focus:border-blue-500 focus:outline-none transition-colors text-center text-2xl tracking-widest font-mono"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-[#3a3a3a] hover:bg-[#4a4a4a] disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Auto-funding progress modal */}
      <FundingProgressModal 
        isOpen={showFundingModal}
        onClose={handleFundingModalClose}
        fundingStatus={fundingStatus}
        onRetry={retryFunding}
      />
    </>
  );
}