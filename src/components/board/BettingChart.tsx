"use client";

interface BettingChartProps {
  yesTotal: bigint;
  noTotal: bigint;
  yesCount: number;
  noCount: number;
}

export function BettingChart({ yesTotal, noTotal, yesCount, noCount }: BettingChartProps) {
  const totalPool = yesTotal + noTotal;
  const totalBets = yesCount + noCount;
  
  // Calculate percentages
  const yesPercentage = totalPool > 0n ? Math.round((Number(yesTotal) / Number(totalPool)) * 100) : 50;
  
  // Ensure percentages add up to 100
  const adjustedNoPercentage = 100 - yesPercentage;

  return (
    <div className="bg-gray-800 rounded-2xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-center text-gray-200 mb-6">
          Live Betting Distribution
        </h2>
        
        {/* Main Chart Bar */}
        <div className="relative h-24 md:h-32 rounded-full overflow-hidden bg-gray-700 shadow-inner">
          {totalPool > 0n ? (
            <div className="flex h-full">
              {/* YES side */}
              <div 
                className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white font-bold transition-all duration-1000 ease-in-out"
                style={{ width: `${yesPercentage}%` }}
              >
                {yesPercentage >= 15 && (
                  <span className="text-lg md:text-2xl">
                    YES {yesPercentage}%
                  </span>
                )}
              </div>
              
              {/* NO side */}
              <div 
                className="bg-gradient-to-l from-red-500 to-red-400 flex items-center justify-center text-white font-bold transition-all duration-1000 ease-in-out"
                style={{ width: `${adjustedNoPercentage}%` }}
              >
                {adjustedNoPercentage >= 15 && (
                  <span className="text-lg md:text-2xl">
                    NO {adjustedNoPercentage}%
                  </span>
                )}
              </div>
            </div>
          ) : (
            // Default state when no bets
            <div className="flex h-full">
              <div className="bg-gray-600 flex-1 flex items-center justify-center">
                <span className="text-gray-400 font-medium">No bets yet</span>
              </div>
            </div>
          )}
        </div>

        {/* Percentage Labels for small bars */}
        {totalPool > 0n && (yesPercentage < 15 || adjustedNoPercentage < 15) && (
          <div className="flex justify-between mt-4 text-lg md:text-xl font-bold">
            <div className="text-green-400">
              YES {yesPercentage}%
            </div>
            <div className="text-red-400">
              NO {adjustedNoPercentage}%
            </div>
          </div>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-2 gap-8">
        <div className="text-center">
          <div className="bg-green-900 bg-opacity-50 rounded-xl p-6 border border-green-500 border-opacity-30">
            <div className="text-green-400 text-sm font-medium mb-2">YES SIDE</div>
            <div className="text-3xl md:text-4xl font-bold text-green-300 mb-2">
              {yesCount}
            </div>
            <div className="text-green-200 text-sm">
              {yesCount === 1 ? 'bet' : 'bets'}
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="bg-red-900 bg-opacity-50 rounded-xl p-6 border border-red-500 border-opacity-30">
            <div className="text-red-400 text-sm font-medium mb-2">NO SIDE</div>
            <div className="text-3xl md:text-4xl font-bold text-red-300 mb-2">
              {noCount}
            </div>
            <div className="text-red-200 text-sm">
              {noCount === 1 ? 'bet' : 'bets'}
            </div>
          </div>
        </div>
      </div>

      {/* Market Summary */}
      {totalBets > 0 && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-4 text-gray-400 text-sm">
            <span>💰 Fixed bet amount: $0.50 USDC</span>
            <span>•</span>
            <span>👥 {totalBets} total participants</span>
            <span>•</span>
            <span>🏆 Winner takes all proportionally</span>
          </div>
        </div>
      )}
    </div>
  );
}