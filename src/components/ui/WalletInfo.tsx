"use client";

import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useState, useEffect } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { getContractAddress } from "@/lib/constants";
import { FaucetButtons } from "@/components/admin/FaucetButtons";

export function WalletInfo() {
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

  if (!evmAddress) {
    return (
      <div className="space-y-6 text-sm text-[#c0c0c0]">
        <section>
          <h3 className="text-white font-semibold mb-3 text-base">Wallet</h3>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="font-medium text-yellow-400 mb-2">Not Connected</div>
            <div className="text-xs">Please sign in to view your wallet information.</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm text-[#c0c0c0]">
      {/* Wallet Section - Exact copy from admin */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-[#ffffff] font-[var(--font-climate-crisis)]">Wallet</h3>
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
          <FaucetButtons />
        </div>
      </section>
    </div>
  );
}