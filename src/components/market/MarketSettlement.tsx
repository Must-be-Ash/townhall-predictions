"use client";

import { useState } from "react";
import { useContract } from "@/hooks/useContract";
import { useMarkets } from "@/contexts/MarketContext";

interface MarketSettlementProps {
  marketId: number;
  marketData: {
    question: string;
    closeTime: string | Date;
    resolved: boolean;
    voided: boolean;
  };
}

export function MarketSettlement({ marketId, marketData }: MarketSettlementProps) {
  const { resolveMarket, voidMarket } = useContract();
  const { forceRefreshMarket } = useMarkets();
  const [isResolving, setIsResolving] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState<boolean | null>(null);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  // Check if market is eligible for settlement
  const canSettle = () => {
    const now = new Date().getTime();
    const closeTime = new Date(marketData.closeTime).getTime();
    return closeTime <= now && !marketData.resolved && !marketData.voided;
  };

  const handleResolve = async (outcome: boolean) => {
    setIsResolving(true);
    setShowResolveConfirm(null);

    try {
      await resolveMarket(marketId, outcome);
      
      // Wait for blockchain state to propagate, then refresh
      await new Promise(resolve => setTimeout(resolve, 3000));
      await forceRefreshMarket(marketId);
      
    } catch (error) {
      console.error("Failed to resolve market:", error);
      alert("Failed to resolve market. Please try again.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleVoid = async () => {
    setIsVoiding(true);
    setShowVoidConfirm(false);

    try {
      await voidMarket(marketId);
      
      // Wait for blockchain state to propagate, then refresh
      await new Promise(resolve => setTimeout(resolve, 3000));
      await forceRefreshMarket(marketId);
      
    } catch (error) {
      console.error("Failed to void market:", error);
      alert("Failed to void market. Please try again.");
    } finally {
      setIsVoiding(false);
    }
  };

  if (!canSettle()) {
    return null;
  }

  return (
    <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-medium text-[#ffffff] mb-4">Market Settlement</h3>
      <p className="text-[#808080] text-sm mb-6">
        This market has closed and needs to be resolved. Choose the winning outcome or void the market.
      </p>

      {/* Resolve Confirmation Dialog */}
      {showResolveConfirm !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-2xl p-6 max-w-md mx-4">
            <h4 className="text-lg font-medium text-[#ffffff] mb-4">Confirm Resolution</h4>
            <p className="text-[#808080] mb-6">
              Are you sure you want to resolve this market as <span className="text-[#ffffff] font-medium">
                {showResolveConfirm ? "YES" : "NO"}
              </span>?
            </p>
            <p className="text-[#c0c0c0] text-sm mb-6 italic">
              &ldquo;{marketData.question}&rdquo;
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleResolve(showResolveConfirm)}
                disabled={isResolving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isResolving ? "Resolving..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowResolveConfirm(null)}
                disabled={isResolving}
                className="flex-1 bg-[#3a3a3a] hover:bg-[#4a4a4a] disabled:opacity-50 text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Dialog */}
      {showVoidConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-2xl p-6 max-w-md mx-4">
            <h4 className="text-lg font-medium text-[#ffffff] mb-4">Confirm Void</h4>
            <p className="text-[#808080] mb-6">
              Are you sure you want to void this market? All participants will be able to withdraw their full refunds.
            </p>
            <p className="text-[#c0c0c0] text-sm mb-6 italic">
              &ldquo;{marketData.question}&rdquo;
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleVoid}
                disabled={isVoiding}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isVoiding ? "Voiding..." : "Void Market"}
              </button>
              <button
                onClick={() => setShowVoidConfirm(false)}
                disabled={isVoiding}
                className="flex-1 bg-[#3a3a3a] hover:bg-[#4a4a4a] disabled:opacity-50 text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Controls */}
      <div className="space-y-4">
        <div>
          <p className="text-sm text-[#c0c0c0] mb-3">Resolve Market:</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowResolveConfirm(true)}
              disabled={isResolving || isVoiding}
              className="bg-green-600 hover:bg-green-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Resolve as YES
            </button>
            <button
              onClick={() => setShowResolveConfirm(false)}
              disabled={isResolving || isVoiding}
              className="bg-red-600 hover:bg-red-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Resolve as NO
            </button>
          </div>
        </div>

        <div className="border-t border-[#3a3a3a] pt-4">
          <p className="text-sm text-[#c0c0c0] mb-3">Or void the market:</p>
          <button
            onClick={() => setShowVoidConfirm(true)}
            disabled={isResolving || isVoiding}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Void Market (Refund All)
          </button>
        </div>
      </div>
    </div>
  );
}