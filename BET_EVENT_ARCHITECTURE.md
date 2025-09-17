# Bet Event Recording Architecture Report

## Overview

The Town Hall Predictions application implements a comprehensive bet event recording system that captures, stores, and displays user betting activity. This system bridges blockchain events with a traditional database to provide real-time activity feeds and user engagement metrics.

## Architecture Components

### 1. Smart Contract Events (Source of Truth)

**File:** `contracts/src/TownHallPredictions.sol`

The smart contract emits a `BetPlaced` event whenever a user places a bet:

```solidity
event BetPlaced(
    uint256 indexed marketId,
    address indexed user,
    bool outcome,
    uint256 amount
);
```

**Event Emission Location:** Line 231 in `placeBet()` function
- **Parameters:**
  - `marketId`: The ID of the market being bet on
  - `user`: The wallet address placing the bet
  - `outcome`: true for YES, false for NO
  - `amount`: Always 1000000 (1.0 USDC with 6 decimals)

**Contract Address:** `0x7fDc0208956aCDB444dD9130f2F11553f02C96E0` (Base Sepolia)

### 2. Database Models

**File:** `src/lib/models/BetEvent.ts`

The MongoDB schema stores bet events with the following structure:

```typescript
interface IBetEvent {
  marketId: number;
  userAddress: string;
  outcome: boolean;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
}
```

**Key Features:**
- **Unique constraint** on `transactionHash` to prevent duplicate entries
- **Indexes** on `marketId + timestamp`, `userAddress`, and `timestamp` for query optimization
- **Amount stored as string** to avoid precision issues with large numbers

**Related Models:**
- `User.ts`: Stores user profile data including display names
- `MarketCache.ts`: Caches market data for performance

### 3. Event Synchronization Service

**File:** `src/lib/services/betEventSync.ts`

This service handles fetching blockchain events and storing them in the database.

#### Core Functions:

1. **`syncAllBetEvents()`**
   - Fetches all `BetPlaced` events from block 17000000 onwards
   - Processes each event and stores it in MongoDB
   - Skips already processed events (based on transaction hash)

2. **`syncNewBetEvents()`**
   - Incremental sync from the last processed block
   - More efficient for regular updates

3. **`syncBetEventsForMarket(marketId)`**
   - Syncs events for a specific market only
   - Used when focusing on particular market data

4. **`validateBetEventIntegrity()`**
   - Cross-references database records with on-chain data
   - Ensures data consistency

**Data Flow:**
1. Connect to blockchain using Viem client
2. Fetch events using `publicClient.getLogs()`
3. For each event:
   - Extract event data (marketId, user, outcome)
   - Get block timestamp for chronological ordering
   - Check for existing record (prevent duplicates)
   - Save to MongoDB

### 4. API Endpoints

#### A. Market Bet Events API
**File:** `src/app/api/markets/[id]/bets/route.ts`

**Endpoint:** `GET /api/markets/{marketId}/bets`

**Functionality:**
- Fetches all bet events for a specific market
- Joins with User model to get display names
- Returns sorted list (most recent first)
- Provides fallback display for unknown users

**Response Format:**
```typescript
{
  success: true,
  bets: BetEventWithUser[],
  totalBets: number
}
```

#### B. Admin Sync API
**File:** `src/app/api/admin/sync-bet-events/route.ts`

**Endpoint:** `POST /api/admin/sync-bet-events`

**Authentication:** Bearer token required
**Modes:**
- `all`: Full sync from deployment block
- `new`: Incremental sync
- `validate`: Data integrity check

### 5. Frontend Integration

#### A. Contract Interaction Hook
**File:** `src/hooks/useContract.ts`

**Key Functions:**
- `placeBet()`: Handles bet placement transactions
- `getMarket()`: Fetches market data
- `getUserBet()`: Gets user's bet status

**Transaction Flow:**
1. Check USDC allowance
2. Approve USDC if needed
3. Call `placeBet()` on contract
4. Wait for transaction confirmation
5. Refresh UI data

#### B. Betting Interface Component
**File:** `src/components/market/BettingInterface.tsx`

**Responsibilities:**
- Display betting options with dynamic caps
- Handle bet placement workflow
- Show user's existing bets
- Real-time market data updates

**Lines 126-128:** Bet placement triggers database sync indirectly through blockchain events

#### C. Recent Activity Component
**File:** `src/components/board/RecentActivity.tsx`

**Key Features:**
- Fetches bet events via API call (line 76)
- Displays participant activity with timestamps
- Shows user display names and bet amounts
- Real-time polling every 10 seconds (line 114)

**Data Fetching:**
```typescript
// Line 76
const response = await fetch(`/api/markets/${marketId}/bets`);
```

## Data Flow Architecture

### Complete Bet Recording Flow:

1. **User Places Bet**
   - User clicks betting button in `BettingInterface.tsx`
   - Frontend calls `useContract.placeBet()`
   - Transaction sent to smart contract

2. **Smart Contract Processing**
   - Contract validates bet (amount, timing, caps)
   - Transfers USDC from user to contract
   - Emits `BetPlaced` event with bet details
   - Updates market state (yesCount, noCount, totals)

3. **Event Indexing & Storage**
   - Event sync service (`betEventSync.ts`) periodically scans blockchain
   - Fetches new `BetPlaced` events using Viem client
   - Extracts event data and block timestamp
   - Stores in MongoDB `BetEvent` collection

4. **API Data Retrieval**
   - Frontend components call `/api/markets/{id}/bets`
   - API queries MongoDB for bet events
   - Joins with User data for display names
   - Returns formatted bet activity data

5. **UI Display**
   - `RecentActivity.tsx` receives bet data
   - Displays chronological list of participants
   - Updates in real-time via polling
   - Shows user names, outcomes, and timestamps

## Performance Optimizations

### Database Indexing
- **Primary index:** `{ marketId: 1, timestamp: -1 }` for efficient market queries
- **User index:** `{ userAddress: 1 }` for user-specific lookups
- **Temporal index:** `{ timestamp: -1 }` for chronological ordering

### Caching Strategy
- Market data cached in `MarketCache` model
- User display names cached to avoid repeated lookups
- Transaction hash uniqueness prevents duplicate processing

### Incremental Syncing
- Tracks last processed block number
- Only fetches new events since last sync
- Reduces blockchain RPC calls and processing time

## Error Handling & Resilience

### Sync Service
- Retries on RPC failures with exponential backoff
- Skips corrupted events and continues processing
- Validates event data before database insertion
- Detailed logging for debugging

### Frontend
- Graceful degradation when API calls fail
- Loading states during data fetching
- Fallback display names for unknown users
- Silent background updates to prevent UI disruption

## Security Considerations

### Authentication
- Admin sync endpoints protected with API keys
- Rate limiting on public endpoints
- Input validation on all parameters

### Data Integrity
- Transaction hash uniqueness prevents duplicates
- Cross-validation with on-chain data
- Immutable event source (blockchain)

## Current Status & Known Issues

### Implementation Status
✅ **Complete:**
- Smart contract event emission
- Database models and indexing
- Event synchronization service
- API endpoints for data retrieval
- Frontend display components

### Sync Configuration
- **Starting Block:** 17000000 (may need adjustment)
- **Polling Interval:** 10 seconds for UI updates
- **Batch Processing:** Handles multiple events efficiently

### Potential Improvements
1. **Real-time Updates:** WebSocket connections for live activity feeds
2. **Event Filtering:** More granular event queries by date/user
3. **Analytics:** Aggregated betting statistics and trends
4. **Notification System:** Alert users to new activity on their markets

## File Dependencies

### Core Files:
- `contracts/src/TownHallPredictions.sol` - Event source
- `src/lib/models/BetEvent.ts` - Data model
- `src/lib/services/betEventSync.ts` - Sync logic
- `src/app/api/markets/[id]/bets/route.ts` - Data API
- `src/components/board/RecentActivity.tsx` - UI display

### Supporting Files:
- `src/hooks/useContract.ts` - Blockchain interaction
- `src/lib/constants.ts` - Contract addresses
- `src/lib/abis.ts` - Contract interfaces
- `src/lib/db.ts` - Database connection

This architecture provides a robust, scalable system for recording and displaying bet events while maintaining data consistency between blockchain state and the application database.