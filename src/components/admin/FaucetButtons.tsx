"use client";

import { useState } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";

interface FaucetResponse {
  success: boolean;
  transactionHash?: string;
  transactionLink?: string;
  amount?: string;
  error?: string;
  details?: string;
}

export function FaucetButtons() {
  const { evmAddress } = useEvmAddress();
  const [isRequestingETH, setIsRequestingETH] = useState(false);
  const [isRequestingUSDC, setIsRequestingUSDC] = useState(false);
  const [lastETHResponse, setLastETHResponse] = useState<FaucetResponse | null>(null);
  const [lastUSDCResponse, setLastUSDCResponse] = useState<FaucetResponse | null>(null);

  const requestETH = async () => {
    if (!evmAddress || isRequestingETH) return;

    setIsRequestingETH(true);
    setLastETHResponse(null);

    try {
      const response = await fetch('/api/faucet/eth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: evmAddress }),
      });

      const data: FaucetResponse = await response.json();
      setLastETHResponse(data);

      if (data.success) {
        // Show success message briefly
        setTimeout(() => setLastETHResponse(null), 5000);
      }
    } catch (error) {
      console.error('ETH faucet request failed:', error);
      setLastETHResponse({
        success: false,
        error: 'Network error occurred'
      });
    } finally {
      setIsRequestingETH(false);
    }
  };

  const requestUSDC = async () => {
    if (!evmAddress || isRequestingUSDC) return;

    setIsRequestingUSDC(true);
    setLastUSDCResponse(null);

    try {
      const response = await fetch('/api/faucet/usdc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: evmAddress }),
      });

      const data: FaucetResponse = await response.json();
      setLastUSDCResponse(data);

      if (data.success) {
        // Show success message briefly
        setTimeout(() => setLastUSDCResponse(null), 5000);
      }
    } catch (error) {
      console.error('USDC faucet request failed:', error);
      setLastUSDCResponse({
        success: false,
        error: 'Network error occurred'
      });
    } finally {
      setIsRequestingUSDC(false);
    }
  };

  if (!evmAddress) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* ETH Faucet */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-[#808080]">Get testnet ETH:</span>
        <button
          onClick={requestETH}
          disabled={isRequestingETH}
          className="px-3 py-1.5 disabled:bg-[#374151] disabled:cursor-not-allowed text-[#ffffff] text-xs font-bold rounded-lg transition-all border border-[#808080] border-[0.1px]"
          style={{
            background: isRequestingETH 
              ? '#374151' 
              : 'radial-gradient(circle, #333333 0%, #555555 100%)',
          }}
          onMouseEnter={(e) => {
            if (!isRequestingETH) {
              e.currentTarget.style.background = 'radial-gradient(circle, #555555 0%, #777777 100%)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isRequestingETH) {
              e.currentTarget.style.background = 'radial-gradient(circle, #333333 0%, #555555 100%)';
            }
          }}
        >
          {isRequestingETH ? "Getting ETH..." : "Get ETH"}
        </button>
      </div>

      {/* USDC Faucet */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-[#808080]">Get testnet USDC:</span>
        <button
          onClick={requestUSDC}
          disabled={isRequestingUSDC}
          className="px-3 py-1.5 disabled:bg-[#374151] disabled:cursor-not-allowed text-[#ffffff] text-xs font-bold rounded-lg transition-all border border-[#808080] border-[0.1px]"
          style={{
            background: isRequestingUSDC 
              ? '#374151' 
              : 'radial-gradient(circle, #333333 0%, #555555 100%)',
          }}
          onMouseEnter={(e) => {
            if (!isRequestingUSDC) {
              e.currentTarget.style.background = 'radial-gradient(circle, #555555 0%, #777777 100%)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isRequestingUSDC) {
              e.currentTarget.style.background = 'radial-gradient(circle, #333333 0%, #555555 100%)';
            }
          }}
        >
          {isRequestingUSDC ? "Getting USDC..." : "Get USDC"}
        </button>
      </div>

      {/* Success Messages */}
      {lastETHResponse?.success && (
        <div className="p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="text-xs text-green-400">
            ✓ Received {lastETHResponse.amount}!
            {lastETHResponse.transactionLink && (
              <a
                href={lastETHResponse.transactionLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:text-blue-300 underline"
              >
                View transaction
              </a>
            )}
          </div>
        </div>
      )}

      {lastUSDCResponse?.success && (
        <div className="p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="text-xs text-green-400">
            ✓ Received {lastUSDCResponse.amount}!
            {lastUSDCResponse.transactionLink && (
              <a
                href={lastUSDCResponse.transactionLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:text-blue-300 underline"
              >
                View transaction
              </a>
            )}
          </div>
        </div>
      )}

      {/* Error Messages */}
      {lastETHResponse?.error && (
        <div className="p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="text-xs text-red-400">
            ✗ ETH request failed: {lastETHResponse.error}
          </div>
        </div>
      )}

      {lastUSDCResponse?.error && (
        <div className="p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="text-xs text-red-400">
            ✗ USDC request failed: {lastUSDCResponse.error}
          </div>
        </div>
      )}
    </div>
  );
}