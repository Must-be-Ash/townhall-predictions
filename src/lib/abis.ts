// Town Hall Predictions Contract ABI
export const TOWN_HALL_PREDICTIONS_ABI = [
  {
    "type": "function",
    "name": "createMarket",
    "inputs": [
      {"name": "question", "type": "string"},
      {"name": "closeTime", "type": "uint256"}
    ],
    "outputs": [{"name": "marketId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function", 
    "name": "placeBet",
    "inputs": [
      {"name": "marketId", "type": "uint256"},
      {"name": "outcome", "type": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveMarket", 
    "inputs": [
      {"name": "marketId", "type": "uint256"},
      {"name": "winningOutcome", "type": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "voidMarket",
    "inputs": [
      {"name": "marketId", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawWinnings",
    "inputs": [
      {"name": "marketId", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawRefund",
    "inputs": [
      {"name": "marketId", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markets",
    "inputs": [
      {"name": "marketId", "type": "uint256"}
    ],
    "outputs": [
      {"name": "question", "type": "string"},
      {"name": "closeTime", "type": "uint256"},
      {"name": "resolved", "type": "bool"},
      {"name": "winningOutcome", "type": "bool"},
      {"name": "yesTotal", "type": "uint256"},
      {"name": "noTotal", "type": "uint256"},
      {"name": "yesCount", "type": "uint256"},
      {"name": "noCount", "type": "uint256"},
      {"name": "voided", "type": "bool"},
      {"name": "createdAt", "type": "uint256"},
      {"name": "creator", "type": "address"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "userBets",
    "inputs": [
      {"name": "marketId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "outputs": [
      {"name": "hasBet", "type": "bool"},
      {"name": "outcome", "type": "bool"},
      {"name": "withdrawn", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "calculateWinnings",
    "inputs": [
      {"name": "marketId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "outputs": [{"name": "winnings", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "marketCounter",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "BET_AMOUNT",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPayoutMultiplier",
    "inputs": [
      {"name": "marketId", "type": "uint256"},
      {"name": "outcome", "type": "bool"}
    ],
    "outputs": [{"name": "multiplier", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDynamicCap",
    "inputs": [
      {"name": "marketId", "type": "uint256"},
      {"name": "outcome", "type": "bool"}
    ],
    "outputs": [{"name": "cap", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "BASE_MAX_BETS_PER_SIDE",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MULTIPLIER_BASE",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "MarketCreated",
    "inputs": [
      {"name": "marketId", "type": "uint256", "indexed": true},
      {"name": "creator", "type": "address", "indexed": true},
      {"name": "question", "type": "string", "indexed": false},
      {"name": "closeTime", "type": "uint256", "indexed": false},
      {"name": "createdAt", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "BetPlaced",
    "inputs": [
      {"name": "marketId", "type": "uint256", "indexed": true},
      {"name": "user", "type": "address", "indexed": true},
      {"name": "outcome", "type": "bool", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "MarketResolved",
    "inputs": [
      {"name": "marketId", "type": "uint256", "indexed": true},
      {"name": "winningOutcome", "type": "bool", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "MarketVoided",
    "inputs": [
      {"name": "marketId", "type": "uint256", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "WinningsWithdrawn",
    "inputs": [
      {"name": "marketId", "type": "uint256", "indexed": true},
      {"name": "user", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  }
] as const;

// USDC Contract ABI (ERC20 standard functions we need)
export const USDC_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {"name": "account", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      {"name": "from", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  }
] as const;