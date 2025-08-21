"use client";

export interface FilterOptions {
  search: string;
  sortBy: 'newest' | 'mostActive' | 'highestPool' | 'closingSoon';
}

interface SearchAndFilterProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  totalMarkets: number;
}

export function SearchAndFilter({ filters, onFiltersChange, totalMarkets }: SearchAndFilterProps) {
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-[#808080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search prediction markets..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl text-[#ffffff] placeholder-[#808080] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-[#c0c0c0] whitespace-nowrap">Sort by</span>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl px-4 py-2 text-[#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-w-[120px]"
            >
              <option value="newest">Newest</option>
              <option value="mostActive">Most Active</option>
              <option value="highestPool">Highest Pool</option>
              <option value="closingSoon">Closing Soon</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center space-x-2">
            <div className="h-4 w-px bg-[#3a3a3a]"></div>
            <span className="text-sm text-[#808080] whitespace-nowrap font-medium">
              {totalMarkets} market{totalMarkets !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Clear Search */}
      {filters.search && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-[#808080]">
            Showing results for &ldquo;<span className="text-[#ffffff] font-medium">{filters.search}</span>&rdquo;
          </span>
          <button
            onClick={() => updateFilter('search', '')}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}