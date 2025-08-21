import { type ClassValue, clsx } from "clsx";
import { formatUnits, parseUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format USDC amount from wei (6 decimals) to display string
 */
export function formatUSDC(amount: bigint | string): string {
  const amountBigInt = typeof amount === "string" ? BigInt(amount) : amount;
  return formatUnits(amountBigInt, 6);
}

/**
 * Parse USDC amount from display string to wei (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

/**
 * Format wallet address for display (truncated)
 */
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: Date | number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate time remaining until a given timestamp
 */
export function getTimeRemaining(timestamp: Date | number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const now = Date.now();
  const target = new Date(timestamp).getTime();
  const total = target - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total };
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate percentage with 1 decimal place
 */
export function calculatePercentage(part: bigint | number, total: bigint | number): number {
  const partNum = typeof part === "bigint" ? Number(part) : part;
  const totalNum = typeof total === "bigint" ? Number(total) : total;
  
  if (totalNum === 0) return 0;
  return Math.round((partNum / totalNum) * 1000) / 10; // 1 decimal place
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Generate random ID for temporary use
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}