"use client";

export function TradingRules() {
  return (
    <div className="space-y-6 text-sm text-[#c0c0c0]">
      {/* Basic Rules */}
      <section>
        <h3 className="text-white font-semibold mb-3 text-base">Basic Rules</h3>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong className="text-white">Fixed bet:</strong> Each bet costs exactly $1.00 USDC</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong className="text-white">One bet per market:</strong> You can only place one bet per market</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong className="text-white">Time limit:</strong> Betting closes when the market expires</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong className="text-white">Market creation:</strong> Anyone can create markets, only admin resolves them</span>
          </li>
        </ul>
      </section>

      {/* Winning Scenarios */}
      <section>
        <h3 className="text-white font-semibold mb-3 text-base">Winning Scenarios</h3>
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="font-medium text-green-400 mb-1">Maximum Win</div>
            <div className="text-xs">Everyone bets YES, you bet NO, and NO wins → You get the entire pool!</div>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="font-medium text-green-400 mb-1">Balanced Win</div>
            <div className="text-xs">Mixed betting, you pick the winning side → Share the pool proportionally</div>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="font-medium text-green-400 mb-1">Crowd Win</div>
            <div className="text-xs">Everyone bets the same side and wins → Everyone gets $1.00 back</div>
          </div>
        </div>
      </section>

      {/* Losing Scenarios */}
      <section>
        <h3 className="text-white font-semibold mb-3 text-base">Losing Scenarios</h3>
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="font-medium text-red-400 mb-1">Wrong Side</div>
            <div className="text-xs">You bet on the losing side → You lose your $1.00</div>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="font-medium text-red-400 mb-1">House Wins</div>
            <div className="text-xs">Everyone bets one side, opposite side wins → House keeps the pool</div>
          </div>
        </div>
      </section>

      {/* Special Cases */}
      <section>
        <h3 className="text-white font-semibold mb-3 text-base">Special Cases</h3>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <div className="font-medium text-purple-400 mb-1">Market Voided</div>
          <div className="text-xs">If a market is voided due to disputes or issues → Everyone gets their $1.00 refunded</div>
        </div>
      </section>

      {/* Leaderboard Tiebreaking */}
      <section>
        <h3 className="text-white font-semibold mb-3 text-base">Leaderboard Ranking</h3>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="font-medium text-yellow-400 mb-1">Tiebreaker Rules</div>
          <div className="text-xs">When users have identical win rates & correct predictions, we break the ties using &quot;early participation score&quot; - how early they bet relative to each market&apos;s lifetime. Earlier bettors face more uncertainty and deserve higher ranking.</div>
        </div>
      </section>

      {/* Pro Tip */}
      <section className="pt-2 border-t border-[#3a3a3a]">
        <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg p-3">
          <div className="font-medium text-[#ffffff] mb-1">💡 Pro Tip</div>
          <div className="text-xs text-[#a0a0a0]">
            The more unbalanced the betting, the higher your potential winnings if you pick the minority side correctly!
          </div>
        </div>
      </section>
    </div>
  );
}