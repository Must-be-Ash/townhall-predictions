"use client";

interface Market {
  resolved: boolean;
  winningOutcome: boolean;
  voided: boolean;
  closeTime: bigint;
}

interface MarketStatusProps {
  market: Market;
}

export function MarketStatus({ market }: MarketStatusProps) {
  const closeTime = new Date(Number(market.closeTime) * 1000);
  const isExpired = new Date() > closeTime;

  // Resolved market
  if (market.resolved) {
    const winner = market.winningOutcome ? "YES" : "NO";
    const bgColor = market.winningOutcome ? "bg-green-900" : "bg-red-900";
    const borderColor = market.winningOutcome ? "border-green-500" : "border-red-500";
    const textColor = market.winningOutcome ? "text-green-300" : "text-red-300";
    const labelColor = market.winningOutcome ? "text-green-400" : "text-red-400";

    return (
      <div className={`${bgColor} bg-opacity-50 border ${borderColor} rounded-xl px-6 py-4`}>
        <div className="text-center">
          <div className={`${labelColor} text-sm font-medium mb-1`}>MARKET RESOLVED</div>
          <div className={`text-2xl md:text-3xl font-bold ${textColor}`}>
            🏆 {winner} WINS!
          </div>
        </div>
      </div>
    );
  }

  // Voided market
  if (market.voided) {
    return (
      <div className="bg-yellow-900 bg-opacity-50 border border-yellow-500 rounded-xl px-6 py-4">
        <div className="text-center">
          <div className="text-yellow-400 text-sm font-medium mb-1">MARKET VOIDED</div>
          <div className="text-2xl md:text-3xl font-bold text-yellow-300">
            🔄 All Bets Refunded
          </div>
        </div>
      </div>
    );
  }

  // Market closed but not resolved
  if (isExpired) {
    return (
      <div className="bg-orange-900 bg-opacity-50 border border-orange-500 rounded-xl px-6 py-4">
        <div className="text-center">
          <div className="text-orange-400 text-sm font-medium mb-1">AWAITING RESOLUTION</div>
          <div className="text-2xl md:text-3xl font-bold text-orange-300">
            ⏳ Pending Admin
          </div>
        </div>
      </div>
    );
  }

  // Market is active
  return (
    <div className="bg-green-900 bg-opacity-50 border border-green-500 rounded-xl px-6 py-4">
      <div className="text-center">
        <div className="text-green-400 text-sm font-medium mb-1">BETTING OPEN</div>
        <div className="text-2xl md:text-3xl font-bold text-green-300 flex items-center justify-center">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
          Live Betting
        </div>
      </div>
    </div>
  );
}