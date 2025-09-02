export const BET_AMOUNT = 1000000n; // 1.0 USDC in 6-decimal format
export const BET_AMOUNT_DISPLAY = "1.00"; // Display format

export const MARKET_STATUS = {
  ACTIVE: "active",
  CLOSED: "closed",
  RESOLVED: "resolved",
  VOIDED: "voided",
} as const;

export const OUTCOME_LABELS = {
  true: "YES",
  false: "NO",
} as const;

export const COLORS = {
  yes: {
    primary: "#10B981", // green-500
    light: "#D1FAE5",   // green-100
    dark: "#059669",    // green-600
  },
  no: {
    primary: "#EF4444", // red-500
    light: "#FEE2E2",   // red-100
    dark: "#DC2626",    // red-600
  },
  neutral: {
    primary: "#6B7280", // gray-500
    light: "#F3F4F6",   // gray-100
    dark: "#374151",    // gray-700
  },
} as const;

export const REFRESH_INTERVALS = {
  MARKET_DATA: 5000,      // 5 seconds
  USER_BALANCE: 10000,    // 10 seconds
  BOARD_DISPLAY: 3000,    // 3 seconds for live board
} as const;

export const TRANSACTION_CONFIRMATIONS = 1; // Number of confirmations to wait for

export const MAX_MARKETS_PER_PAGE = 20;
export const MAX_RECENT_BETS = 10;

// Markets to hide from public display
export const HIDDEN_MARKETS = [0];

// Contract addresses
export const CONTRACT_ADDRESSES = {
  USDC: {
    // Base Sepolia testnet
    84532: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    // Base mainnet
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  TOWN_HALL_PREDICTIONS: {
    // Base Sepolia testnet - deployed address
    84532: process.env.NEXT_PUBLIC_PREDICTIONS_CONTRACT_ADDRESS || "0x7fDc0208956aCDB444dD9130f2F11553f02C96E0",
    // Base mainnet  
    8453: "",
  },
} as const;

export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES.USDC;

export function getContractAddress(
  contractName: keyof typeof CONTRACT_ADDRESSES,
  chainId: SupportedChainId
): string {
  const address = CONTRACT_ADDRESSES[contractName][chainId];
  if (!address || address === "") {
    throw new Error(`Contract ${contractName} not deployed on chain ${chainId}`);
  }
  return address;
}

// Format USDC amount (6 decimals) for display
export function formatUSDC(amount: bigint): string {
  return `$${(Number(amount) / 1000000).toFixed(2)}`;
}

// Convert display amount to USDC amount (6 decimals)
export function parseUSDC(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 1000000));
}