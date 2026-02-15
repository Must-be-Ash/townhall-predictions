# Server-Side Auth Implementation Checklist

## Goal
Protect API routes with server-side CDP access token validation so only authenticated @coinbase.com users can use the app.

## Tasks

- [x] **1. Install @coinbase/cdp-sdk for server-side token validation**
  - Installed `@coinbase/cdp-sdk@^1.44.1`

- [x] **2. Create server-side auth utility (`src/lib/auth.ts`)**
  - Created `src/lib/auth.ts` with `validateCdpToken()`, `requireAuth()`, `requireAdminApiKey()`, `isAllowedEmail()`, `unauthorizedResponse()`
  - Uses singleton `CdpClient` with `CDP_API_KEY` and `CDP_API_SECRET`
  - No type errors

- [x] **3. Add server-side email domain validation to `/api/users/save-email-early`**
  - Added `isAllowedEmail()` check - returns 403 for non-@coinbase.com emails
  - No type errors

- [x] **4. Update frontend to send CDP access token with API requests**
  - Added `useGetAccessToken` to `useAutoFundingAuth.ts`
  - Created `getAuthHeaders()` helper inside the hook
  - All fetch calls to protected routes now include Bearer token
  - No type errors

- [x] **5. Protect USER routes (require logged-in @coinbase.com user)**
  Routes protected with `requireAuth()`:
  - [x] `/api/users/create-or-update` (POST) - also added `isAllowedEmail()` check
  - [x] `/api/faucet/admin-fund` (POST)
  - [x] `/api/users/update-funding-status` (POST)
  - No type errors

- [x] **6. Protect ADMIN routes that currently have no auth**
  Protected with `requireAdminApiKey()`:
  - [x] `/api/admin/trigger-circle-refill` (POST)
  - [x] `/api/admin/sync-status` (GET)
  - No type errors

- [x] **7. Protect INTERNAL routes**
  - [x] `/api/faucet/circle-refill` (POST) - protected with `requireAdminApiKey()`
  - [x] `/api/cron/sync-bet-events` (GET/POST) - protected with CRON_SECRET or ADMIN_API_KEY
  - Note: `tryCircleRefill()` calls Circle API directly (not via route), so internal flow unaffected
  - No type errors

- [x] **8. Verify all changes work end-to-end**
  - Full `npm run build` passes with zero errors
  - All 17 API routes verified with correct auth patterns
  - PUBLIC routes: no auth (7 routes)
  - USER routes: `requireAuth()` + CDP token (3 routes)
  - EMAIL-VALIDATED: `isAllowedEmail()` server-side check (2 routes)
  - ADMIN routes: `requireAdminApiKey()` (5 routes)
  - CRON routes: CRON_SECRET or ADMIN_API_KEY (1 route)
  - Updated `.env.example` with CDP_API_KEY, CDP_API_SECRET, ADMIN_API_KEY, CRON_SECRET

## Route Classification

| Route | Category | Auth Needed |
|-------|----------|-------------|
| GET `/api/markets` | PUBLIC | None (read-only) |
| GET `/api/markets/bulk` | PUBLIC | None (read-only) |
| GET `/api/markets/[id]` | PUBLIC | None (read-only) |
| GET `/api/markets/[id]/bets` | PUBLIC | None (read-only) |
| GET `/api/leaderboard` | PUBLIC | None (read-only) |
| GET `/api/og/market/[id]` | PUBLIC | None (read-only) |
| POST `/api/users/save-email-early` | PUBLIC | Email domain check (no token) |
| POST `/api/users/create-or-update` | USER | CDP access token |
| POST `/api/faucet/admin-fund` | USER | CDP access token |
| POST `/api/users/update-funding-status` | USER | CDP access token |
| POST `/api/admin/sync-bet-events` | ADMIN | ADMIN_API_KEY (already done) |
| POST `/api/admin/update-leaderboard` | ADMIN | ADMIN_API_KEY (already done) |
| POST `/api/admin/trigger-circle-refill` | ADMIN | ADMIN_API_KEY (needs adding) |
| GET `/api/admin/sync-status` | ADMIN | ADMIN_API_KEY (needs adding) |
| POST `/api/faucet/circle-refill` | INTERNAL | Internal-only check |
| GET/POST `/api/cron/sync-bet-events` | INTERNAL | Vercel cron auth |
