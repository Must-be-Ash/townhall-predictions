"use client";

import { useState, useEffect } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { MarketCreationForm } from "@/components/admin/MarketCreationForm";
import { BulkWithdrawal } from "@/components/admin/BulkWithdrawal";
import { DeadPoolWithdrawal } from "@/components/admin/DeadPoolWithdrawal";
import { FaucetButtons } from "@/components/admin/FaucetButtons";
import { ClaimButton } from "@/components/admin/ClaimButton";
import { DockNavigation } from "@/components/navigation/DockNavigation";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { getContractAddress } from "@/lib/constants";

export default function AdminContent() {
  const { evmAddress } = useEvmAddress();
  const [addressCopied, setAddressCopied] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  // Fetch USDC balance
  useEffect(() => {
    async function fetchBalance() {
      if (!evmAddress) return;
      
      try {
        const balance = await publicClient.readContract({
          address: getContractAddress('USDC', 84532) as `0x${string}`,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }]
            }
          ],
          functionName: 'balanceOf',
          args: [evmAddress]
        });
        
        // USDC has 6 decimals
        const formattedBalance = formatUnits(balance as bigint, 6);
        setUsdcBalance(formattedBalance);
      } catch (error) {
        console.error('Failed to fetch USDC balance:', error);
        setUsdcBalance('0');
      }
    }

    fetchBalance();
  }, [evmAddress, publicClient]);

  const copyAddress = async () => {
    if (evmAddress) {
      try {
        await navigator.clipboard.writeText(evmAddress);
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  const refreshBalance = async () => {
    if (!evmAddress || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const balance = await publicClient.readContract({
        address: getContractAddress('USDC', 84532) as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'balanceOf',
        args: [evmAddress]
      });
      
      // USDC has 6 decimals
      const formattedBalance = formatUnits(balance as bigint, 6);
      setUsdcBalance(formattedBalance);
    } catch (error) {
      console.error('Failed to refresh USDC balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Note: Authentication is now handled by ProtectedRoute wrapper
  // No need for separate login screens - users will be redirected to main page if not authenticated

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Dock Navigation */}
      <DockNavigation />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pt-10 md:pt-32 pb-20 md:pb-16 px-4 sm:px-6 lg:px-8">

        {/* Wallet Info */}
        <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-[#ffffff] font-[var(--font-climate-crisis)]">Wallet</h2>
            <button
              onClick={refreshBalance}
              disabled={isRefreshing}
              className="text-[#808080] hover:text-[#ffffff] disabled:opacity-50 transition-colors"
              title="Refresh balance"
            >
              <svg 
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#808080]">Address:</span>
              <button
                onClick={copyAddress}
                className="text-sm font-mono text-[#ffffff] font-medium hover:text-blue-400 transition-colors cursor-pointer flex items-center space-x-1 group"
                title="Click to copy address"
              >
                <span>{evmAddress && `${evmAddress.slice(0, 10)}...${evmAddress.slice(-8)}`}</span>
                <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            {addressCopied && (
              <div className="text-xs text-green-400 text-right">
                ✓ Address copied to clipboard!
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#808080]">Balance:</span>
              <span className="text-sm text-[#ffffff] font-medium">
                {usdcBalance ? `${parseFloat(usdcBalance).toFixed(2)} USDC` : 'Loading...'}
              </span>
            </div>
            <ClaimButton />
            <BulkWithdrawal />
            <DeadPoolWithdrawal />
            <FaucetButtons />
          </div>
        </div>

        <MarketCreationForm />
      </main>
    </div>
  );
}