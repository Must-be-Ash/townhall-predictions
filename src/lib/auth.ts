import { NextRequest, NextResponse } from 'next/server';
import { CdpClient } from '@coinbase/cdp-sdk';

let cdpClient: CdpClient | null = null;

function getCdpClient(): CdpClient {
  if (!cdpClient) {
    if (!process.env.CDP_API_KEY || !process.env.CDP_API_SECRET) {
      throw new Error('CDP_API_KEY and CDP_API_SECRET must be set');
    }
    cdpClient = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY,
      apiKeySecret: process.env.CDP_API_SECRET,
    });
  }
  return cdpClient;
}

export interface AuthenticatedUser {
  userId: string;
  walletAddress: string;
}

/**
 * Validates a CDP access token from the Authorization header.
 * Returns the authenticated user info or null if invalid.
 */
export async function validateCdpToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authHeader.slice(7);
  if (!accessToken) {
    return null;
  }

  try {
    const client = getCdpClient();
    const endUser = await client.endUser.validateAccessToken({ accessToken });
    return endUser as unknown as AuthenticatedUser;
  } catch {
    return null;
  }
}

/**
 * Checks if an email belongs to the allowed domain.
 */
export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@coinbase.com');
}

/**
 * Returns a 401 JSON response.
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

/**
 * Validates that the request has a valid CDP access token.
 * Returns the user or a 401 response.
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const user = await validateCdpToken(request);
  if (!user) {
    return unauthorizedResponse('Valid CDP access token required');
  }
  return user;
}

/**
 * Validates admin API key from Authorization header.
 * Used for admin-only endpoints that use ADMIN_API_KEY.
 */
export function requireAdminApiKey(request: NextRequest): true | NextResponse {
  const authHeader = request.headers.get('authorization');
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey || authHeader !== `Bearer ${adminApiKey}`) {
    return unauthorizedResponse('Admin API key required');
  }
  return true;
}
