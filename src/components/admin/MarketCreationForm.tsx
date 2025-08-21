"use client";

import { useState } from "react";
import { useContract } from "@/hooks/useContract";

export function MarketCreationForm() {
  const { createMarket } = useContract();
  
  const [question, setQuestion] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreatedMarket, setLastCreatedMarket] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !closeDate || !closeTime) return;
    
    setIsCreating(true);
    setLastCreatedMarket(null);
    
    try {
      const closeDateTime = new Date(`${closeDate}T${closeTime}`);
      const closeTimestamp = Math.floor(closeDateTime.getTime() / 1000);
      
      // Check if close time is in the future
      if (closeTimestamp <= Math.floor(Date.now() / 1000)) {
        alert("Close time must be in the future");
        return;
      }
      
      const result = await createMarket(question, closeTimestamp);
      
      // Reset form
      setQuestion("");
      setCloseDate("");
      setCloseTime("");
      
      setLastCreatedMarket(question);
      console.log("Market created successfully:", result);
    } catch (error) {
      console.error("Failed to create market:", error);
      alert("Failed to create market. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };
  
  const now = new Date();
  const minDate = now.toISOString().split('T')[0];
  
  return (
    <div className="bg-[#2a2a2a] rounded-lg shadow-lg p-6 border border-[#3a3a3a]">
      <h2 className="text-xl text-[#ffffff] font-bold mb-4 font-[var(--font-climate-crisis)]">Create New Market</h2>
      
      {lastCreatedMarket && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-400">Market created successfully!</p>
              <p className="text-sm text-green-300 mt-1">&ldquo;{lastCreatedMarket}&rdquo;</p>
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
              className="w-full p-3 border border-[#3a3a3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1a1a1a] text-[#ffffff]"
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
              className="w-full p-3 border border-[#3a3a3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1a1a1a] text-[#ffffff]"
              required
              disabled={isCreating}
            />
          </div>
        </div>
        
        
        <button
          type="submit"
          disabled={isCreating || !question || !closeDate || !closeTime}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-[#3a3a3a] disabled:cursor-not-allowed text-[#ffffff] font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isCreating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Market...
            </span>
          ) : (
            "Create Market"
          )}
        </button>
      </form>
    </div>
  );
}