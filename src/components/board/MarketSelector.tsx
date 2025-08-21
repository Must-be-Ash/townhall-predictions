"use client";

interface MarketSelectorProps {
  markets: number[];
  selectedMarket: number;
  onMarketChange: (marketId: number) => void;
}

export function MarketSelector({ markets, selectedMarket, onMarketChange }: MarketSelectorProps) {
  if (markets.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <label htmlFor="market-select" className="text-sm text-[#808080]">
        Market:
      </label>
      <select
        id="market-select"
        value={selectedMarket}
        onChange={(e) => onMarketChange(parseInt(e.target.value))}
        className="bg-[#1a1a1a] border border-[#3a3a3a] text-[#ffffff] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
      >
        {markets.map((marketId) => (
          <option key={marketId} value={marketId}>
            Market #{marketId}
          </option>
        ))}
      </select>
    </div>
  );
}