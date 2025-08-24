# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

**The ultimate goal is to implement the full application as specified in `/Users/ashnouruzi/TECHNICAL_SPECIFICATION.md`**. This technical specification document contains the complete roadmap, architecture, and implementation details for the Town Hall Predictions application. All development work should align with and progress toward completing the phases outlined in that specification.

## Project Overview

Town Hall Predictions is a binary prediction market application for internal company town halls built with Next.js, Solidity smart contracts, and Coinbase Developer Platform (CDP) for wallet authentication. Users place fixed $1.00 USDC bets on Yes/No outcomes for town hall events.

## Architecture

This is a full-stack Web3 application with three main components:

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router and TypeScript
- **Authentication**: CDP Embedded Wallets with email OTP
- **Blockchain Integration**: Viem for contract interactions on Base Sepolia
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB with Mongoose ODM

### Smart Contracts (Foundry)
- **Framework**: Foundry with Solidity 0.8.26
- **Deployed Contract**: `TownHallPredictions.sol` at `0xD29171878ae652B72b140706A8AcB1E1C39A29c9` on Base Sepolia
- **Token**: USDC at `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- **Dependencies**: OpenZeppelin contracts for security patterns

### Key Application Flow
1. Users authenticate via CDP email OTP
2. Admin creates markets with questions and close times
3. Users place fixed $1.00 USDC bets (Yes/No)
4. Admin resolves markets after close time
5. Winners claim pro-rata winnings, losers get nothing

## Development Commands

### Frontend
```bash
# Development server with Turbopack
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

### Smart Contracts
```bash
# Navigate to contracts directory first
cd contracts

# Build contracts
forge build

# Run all tests
forge test

# Run tests with verbosity
forge test -vvv

# Run specific test
forge test --match-test testMarketCreation

# Format Solidity code
forge fmt

# Deploy to Base Sepolia (with environment variables set)
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

## Key Components and Patterns

### CDP Embedded Wallets Integration

**IMPORTANT**: For all embedded wallet-related development, **always refer to the comprehensive documentation in the `embedded-docs/` directory** instead of making assumptions or jumping to conclusions. These documents contain authoritative guidance:

- `embedded-docs/overview.md` - High-level overview and concepts
- `embedded-docs/quickstart.md` - Getting started guide
- `embedded-docs/nextjs.md` - Next.js specific integration patterns
- `embedded-docs/end-user-authentication.md` - Authentication flow details
- `embedded-docs/react-components.md` - Available React components
- `embedded-docs/react-hooks.md` - React hooks for wallet operations
- `embedded-docs/react-hooks-auth-and-user-management.md` - Auth-specific hooks
- `embedded-docs/cors-configuration.md` - CORS setup requirements
- `embedded-docs/wagmi.md` - Wagmi integration patterns

Current implementation:
- Configuration in `src/components/providers/CDPProvider.tsx`
- Authentication flows in `src/components/auth/`
- Contract interactions via `useContract` hook using CDP's `useSendEvmTransaction`

### Contract Interaction Pattern
All contract calls follow this pattern in `src/hooks/useContract.ts`:
1. Encode function data with Viem
2. Send via CDP's `sendEvmTransaction` 
3. Handle gas estimation and transaction status
4. Use `publicClient` for read-only calls

### Database Models
MongoDB schemas are defined in `src/lib/models/`:
- `User.ts` - User profiles and admin status
- `MarketCache.ts` - Cached market data for performance
- `BetEvent.ts` - Bet history and activity tracking

### Smart Contract Architecture
The `TownHallPredictions.sol` contract implements:
- Fixed-amount betting (1.0 USDC per bet)
- Maximum 100 participants per market (50 per side)
- Dynamic betting caps to prevent extreme imbalances
- Admin-only market creation and resolution
- Pro-rata winner payouts
- Market voiding for disputes
- Reentrancy protection and access controls

## Environment Variables

Required environment variables:
```bash
# CDP Configuration
NEXT_PUBLIC_CDP_PROJECT_ID=your_cdp_project_id

# Application URLs
NEXT_PUBLIC_BASE_URL=https://www.townhall.lol  # Production URL
# NEXT_PUBLIC_BASE_URL=http://localhost:3000   # Development override in .env.local

# Database
MONGODB_URI=mongodb://localhost:27017/townhall-predictions

# Authentication
JWT_SECRET=your_jwt_secret

# Contract Deployment (for deployment only)
PRIVATE_KEY=admin_wallet_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Important**: The `NEXT_PUBLIC_BASE_URL` is used for CDP provider configuration and other absolute URL references. Set this to your production domain in `.env` and optionally override with localhost in `.env.local` for development.

## Contract Addresses

Current deployment on Base Sepolia (Chain ID: 84532):
- **TownHallPredictions**: `0x40B607DAed835Bf2126CB1f8762f3B09D1dde710`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

Previous deployments:
- Old contract (deprecated): `0xD29171878ae652B72b140706A8AcB1E1C39A29c9`

These are defined in `src/lib/constants.ts`.

## Important Files

### Configuration
- `src/lib/constants.ts` - Contract addresses and app constants
- `src/lib/abis.ts` - Contract ABIs for frontend interaction
- `src/components/providers/CDPProvider.tsx` - CDP configuration

### Core Logic
- `src/hooks/useContract.ts` - All contract interaction logic
- `contracts/src/TownHallPredictions.sol` - Main smart contract
- `contracts/test/TownHallPredictions.t.sol` - Contract test suite

### UI Components
- `src/components/market/BettingInterface.tsx` - Main betting interface
- `src/components/admin/MarketCreationForm.tsx` - Admin market creation
- `src/app/market/[id]/page.tsx` - Individual market pages

## Testing

The project has comprehensive smart contract tests. Run with:
```bash
cd contracts && forge test
```

Tests cover:
- Market creation and resolution
- Bet placement and validation
- Winning calculations and withdrawals
- Access control and security
- Edge cases and error conditions

## Common Development Patterns

### Adding New Contract Functions
1. Add function to `TownHallPredictions.sol`
2. Add corresponding test in `TownHallPredictions.t.sol`
3. Update ABI in `src/lib/abis.ts`
4. Add hook function in `src/hooks/useContract.ts`
5. Implement UI in relevant components

### Database Operations
- Use existing models in `src/lib/models/`
- Connection utility is in `src/lib/db.ts`
- Follow existing patterns for caching blockchain data

### Adding New Pages
- Use App Router structure in `src/app/`
- Wrap with CDP authentication where needed
- Follow existing layout patterns

## Project Status

**Current Progress**: Phase 1 (Foundation) is complete with:
- ✅ Full Next.js application setup
- ✅ Smart contract deployed and verified on Base Sepolia  
- ✅ CDP authentication working with email OTP
- ✅ Database schemas designed and ready for implementation

**Next Steps**: Progress through the remaining phases as outlined in `TECHNICAL_SPECIFICATION.md`:
- Phase 2: Core Functionality (UI Development)
- Phase 3: Real-time Features (Live Updates & Display Board)
- Phase 4: Production Ready (Testing & Deployment)

Refer to the technical specification for detailed implementation plans and deliverables for each phase.