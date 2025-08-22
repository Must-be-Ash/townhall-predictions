"use client";

import { useState, useEffect } from "react";
import { useIsInitialized, useIsSignedIn, useEvmAddress, useExportEvmAccount } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { TriangleAlert, Key, Copy, Check } from "lucide-react";

export default function ExportContent() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const { exportEvmAccount } = useExportEvmAccount();

  const [privateKey, setPrivateKey] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide private key after 30 seconds
  useEffect(() => {
    if (privateKey) {
      const timer = setTimeout(() => {
        setPrivateKey('');
      }, 30000);
      setAutoHideTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [privateKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [autoHideTimer]);

  const handleExport = async () => {
    if (!evmAddress) return;

    setIsExporting(true);
    try {
      const { privateKey: exportedKey } = await exportEvmAccount({
        evmAccount: evmAddress
      });

      setPrivateKey(exportedKey);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export private key. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!privateKey) return;

    try {
      await navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy to clipboard. Please copy manually.");
    }
  };

  const handleHideKey = () => {
    setPrivateKey('');
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[#808080]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="max-w-md mx-auto bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-8">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#ffffff] mb-4 font-[var(--font-climate-crisis)]">
              Private Key Export
            </h1>
            <p className="text-[#808080] mb-8">
              Sign in to export your embedded wallet private key
            </p>
            <AuthButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="max-w-lg mx-auto">
        
        {!privateKey ? (
          <div className="bg-[#2a2a2a] rounded-2xl border border-red-500 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <TriangleAlert className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#ffffff] mb-4 font-[var(--font-climate-crisis)]">
                Export Key
              </h1>
              <p className="text-[#c0c0c0] mb-6">
                Anyone with your private key has full control of your wallet. Never share it with anyone.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-[#ffffff] font-medium py-4 px-6 rounded-lg transition-colors"
              >
                {isExporting ? "Exporting..." : "Export Key"}
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#ffffff] font-medium py-4 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#2a2a2a] rounded-2xl border border-green-500 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#ffffff] mb-4">Private Key Exported</h2>
              <p className="text-orange-400 text-sm font-medium">
                ⚠️ Auto-hide in 30 seconds
              </p>
            </div>

            <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <code className="flex-1 bg-[#0a0a0a] text-green-400 p-3 rounded font-mono text-sm break-all border border-[#2a2a2a]">
                  {privateKey}
                </code>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-3 rounded font-medium transition-colors ${
                    copied 
                      ? "bg-green-600 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleHideKey}
                className="flex-1 bg-red-600 hover:bg-red-700 text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Hide Key
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}