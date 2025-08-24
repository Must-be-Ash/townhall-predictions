'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { CDPProvider } from '@/components/providers/CDPProvider';

// Dynamically import AuthWithAutoFunding to avoid SSR issues
const AuthWithAutoFunding = dynamic(
  () => import('@/components/auth/AuthWithAutoFunding').then(mod => ({ default: mod.AuthWithAutoFunding })),
  { 
    ssr: false,
    loading: () => (
      <div className="p-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-[#3a3a3a] rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-[#3a3a3a] rounded w-1/2"></div>
        </div>
      </div>
    )
  }
);

export default function TestAuthPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAuthSuccess = () => {
    console.log('🎉 Authentication and funding complete!');
    // In a real app, this would redirect to the main app
    alert('Authentication successful! Check console for details.');
  };

  return (
    <CDPProvider>
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Test Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            🧪 TEST MODE
          </h1>
          <p className="text-[#808080] text-sm">
            This is a test page for the auto-funding authentication system.
            <br />
            New users will receive 2 USDC + 0.0001 ETH automatically.
          </p>
        </div>

        {/* Auth Component */}
        {isClient ? (
          <AuthWithAutoFunding onAuthSuccess={handleAuthSuccess} />
        ) : (
          <div className="p-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg">
            <div className="animate-pulse">
              <div className="h-4 bg-[#3a3a3a] rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-[#3a3a3a] rounded w-1/2"></div>
            </div>
          </div>
        )}

        {/* Test Instructions */}
        <div className="mt-8 p-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg">
          <h3 className="text-white font-semibold mb-2">Testing Instructions:</h3>
          <ol className="text-[#c0c0c0] text-sm space-y-1 list-decimal list-inside">
            <li>Use a <strong>new email address</strong> you haven&apos;t used before</li>
            <li>Complete the email verification process</li>
            <li>If you&apos;re a new user, auto-funding will trigger automatically</li>
            <li>Watch for the funding progress modal</li>
            <li>Check the console for detailed logs</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <p className="text-yellow-400 text-xs">
              <strong>Note:</strong> Only truly new users (first time using CDP) will trigger auto-funding.
              Existing users will skip the funding process.
            </p>
          </div>
        </div>

        {/* Environment Info */}
        <div className="mt-4 text-center">
          <p className="text-[#808080] text-xs">
            Environment: {isClient ? process.env.NODE_ENV : 'loading'} • Base Sepolia Testnet
          </p>
        </div>
        </div>
      </div>
    </CDPProvider>
  );
}