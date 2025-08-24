"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useContract } from "@/hooks/useContract";

export function MarketCreationForm() {
  const { createMarket, getMarketCounter, getMarket } = useContract();
  const router = useRouter();
  
  const [question, setQuestion] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreatedMarket, setLastCreatedMarket] = useState<{
    question: string;
    transactionHash?: string;
    marketId?: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !closeDate || !closeTime) return;
    
    setIsCreating(true);
    setLastCreatedMarket(null);
    
    try {
      const closeDateTime = new Date(`${closeDate}T${closeTime}`);
      const closeTimestamp = Math.floor(closeDateTime.getTime() / 1000);
      
      // Check if close time is in the future (at least 1 minute from now)
      const nowTimestamp = Math.floor(Date.now() / 1000);
      if (closeTimestamp <= nowTimestamp) {
        alert("Close time must be in the future. Please select a time at least 1 minute from now.");
        return;
      }
      
      // Get the current market counter BEFORE creating the market
      // This will be the ID assigned to the new market (contract does marketId = marketCounter++)
      const marketCounter = await getMarketCounter();
      const marketId = Number(marketCounter);
      
      const result = await createMarket(question, closeTimestamp);
      
      // Extract transaction hash from result
      const transactionHash = result?.transactionHash;
      
      // Validate market exists before showing success UI
      // Add retry mechanism for blockchain data propagation delays
      let marketExists = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!marketExists && attempts < maxAttempts) {
        try {
          const marketData = await getMarket(marketId);
          if (marketData && marketData.question === question) {
            marketExists = true;
            break;
          }
        } catch (error) {
          console.warn(`Market validation attempt ${attempts + 1} failed:`, error);
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!marketExists) {
        console.warn(`Market ${marketId} validation failed after ${maxAttempts} attempts`);
        // Still show success but with a warning
      }
      
      // Reset form
      setQuestion("");
      setCloseDate("");
      setCloseTime("");
      
      setLastCreatedMarket({
        question,
        transactionHash,
        marketId: marketExists ? marketId : undefined, // Only set ID if validation passed
      });
      console.log("Market created successfully:", result);
    } catch (error) {
      console.error("Failed to create market:", error);
      alert("Failed to create market. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };
  
  const now = new Date();
  // Get today's date in user's local timezone, not UTC
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const minDate = `${year}-${month}-${day}`;

  const triggerShimmer = () => {
    if (!buttonRef.current || (isCreating || !question || !closeDate || !closeTime)) return;
    
    // Add shimmer animation
    buttonRef.current.style.animation = 'shimmer 0.6s ease-in-out';
    
    // Remove animation after it completes
    setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.style.animation = '';
      }
    }, 600);
  };
  
  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
          50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 0 0 30px rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.1); }
          100% { box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
        }
      `}</style>
      <div className="bg-[#2a2a2a] rounded-lg shadow-lg p-6 border border-[#3a3a3a]">
        <h2 className="text-xl text-[#ffffff] font-bold mb-4 font-[var(--font-climate-crisis)]">Create New Market</h2>
      
      {lastCreatedMarket && (
        <div className="mb-6 p-6 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-4">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-400 mb-2">Market Created Successfully!</h3>
              <p className="text-[#c0c0c0] mb-4 font-medium">&ldquo;{lastCreatedMarket.question}&rdquo;</p>
              
              {lastCreatedMarket.transactionHash && (
                <div className="mb-4 p-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded">
                  <p className="text-sm text-[#808080] mb-2">Transaction Hash:</p>
                  <a
                    href={`https://sepolia.basescan.org/tx/${lastCreatedMarket.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 break-all font-mono"
                  >
                    {lastCreatedMarket.transactionHash}
                  </a>
                </div>
              )}
              
              {lastCreatedMarket.marketId ? (
                <button
                  onClick={() => router.push(`/market/${lastCreatedMarket.marketId}?new=true`)}
                  className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#ffffff] font-medium rounded-lg transition-colors border border-[#4a4a4a]"
                >
                  View Market →
                </button>
              ) : (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    Market created successfully, but data is still propagating on the blockchain. 
                    Please check the markets list in a few moments.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-[#c0c0c0] mb-2">
            Market Question
          </label>
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will Dan wear a black hat today?"
            className="w-full p-3 border border-[#3a3a3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1a1a1a] text-[#ffffff] placeholder-[#808080]"
            required
            disabled={isCreating}
          />
          <p className="mt-1 text-xs text-[#808080]">
            Create a clear yes/no question about a town hall event
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="closeDate" className="block text-sm font-medium text-[#c0c0c0] mb-2">
              Close Date
            </label>
            <input
              id="closeDate"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              min={minDate}
              className="date-input w-full p-3 border border-[#3a3a3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1a1a1a] text-[#ffffff]"
              required
              disabled={isCreating}
            />
          </div>
          <div>
            <label htmlFor="closeTime" className="block text-sm font-medium text-[#c0c0c0] mb-2">
              Close Time
            </label>
            <input
              id="closeTime"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="time-input w-full p-3 border border-[#3a3a3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1a1a1a] text-[#ffffff]"
              required
              disabled={isCreating}
            />
          </div>
        </div>
        
        
        <button
          ref={buttonRef}
          type="submit"
          disabled={isCreating || !question || !closeDate || !closeTime}
          className="w-full disabled:cursor-not-allowed font-bold py-3 px-4 rounded-lg transition-all border border-[0.1px]"
          style={{
            background: (isCreating || !question || !closeDate || !closeTime)
              ? '#2a2a2a' 
              : 'radial-gradient(circle, #333333 0%, #555555 100%)',
            color: (isCreating || !question || !closeDate || !closeTime)
              ? '#555555'
              : '#ffffff',
            borderColor: (isCreating || !question || !closeDate || !closeTime)
              ? '#3a3a3a'
              : '#808080',
          }}
          onMouseEnter={(e) => {
            if (!(isCreating || !question || !closeDate || !closeTime)) {
              e.currentTarget.style.background = 'radial-gradient(circle, #555555 0%, #777777 100%)';
              triggerShimmer();
            }
          }}
          onMouseLeave={(e) => {
            if (!(isCreating || !question || !closeDate || !closeTime)) {
              e.currentTarget.style.background = 'radial-gradient(circle, #333333 0%, #555555 100%)';
            }
          }}
        >
          {isCreating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 004 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Market...
            </span>
          ) : (
            "Create Market"
          )}
        </button>
      </form>
    </div>
    </>
  );
}