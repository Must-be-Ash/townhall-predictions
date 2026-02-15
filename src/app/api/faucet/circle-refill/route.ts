import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiKey } from '@/lib/auth';

// Circle faucet configuration
const CIRCLE_API_URL = 'https://api.circle.com/v1/faucet/drips';

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminApiKey(request);
    if (authResult instanceof NextResponse) return authResult;

    console.log('🏦 Attempting Circle faucet refill for admin wallet...');

    // Use admin wallet address and Circle token from environment
    const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
    const circleToken = process.env.CIRCLE_AUTH_TOKEN;
    
    if (!adminAddress) {
      console.warn('⚠️ Circle refill skipped: No admin wallet address configured');
      return NextResponse.json({
        success: false,
        error: 'Admin wallet address not configured',
        skipped: true
      });
    }

    if (!circleToken) {
      console.warn('⚠️ Circle refill skipped: No Circle auth token configured');
      return NextResponse.json({
        success: false,
        error: 'Circle auth token not configured',
        skipped: true
      });
    }

    // Check rate limiting - Circle allows 10 requests per day
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // In a real app, you'd use Redis or similar. For now, we'll just log and proceed
    // since this is fail-safe and Circle will handle their own rate limiting
    console.log(`📊 Circle faucet attempt for ${today}`);

    const requestBody = {
      usdc: true,
      native: true,
      blockchain: 'BASE-SEPOLIA',
      address: adminAddress
    };

    console.log('📤 Requesting Circle faucet funds:', requestBody);

    const response = await fetch(CIRCLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': circleToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('🎉 Circle faucet refill successful:', result);
      return NextResponse.json({
        success: true,
        message: 'Circle faucet refill successful',
        data: result,
        adminAddress
      });
    } else {
      // Circle API returned an error, but this shouldn't break anything
      console.warn('⚠️ Circle faucet refill failed (but app continues):', result);
      return NextResponse.json({
        success: false,
        error: result.message || 'Circle faucet request failed',
        details: result,
        retryable: response.status === 429 // Rate limited
      });
    }

  } catch (error) {
    // Complete fail-safe: any error is just logged, main app unaffected
    console.warn('⚠️ Circle faucet refill error (but app continues):', error);
    
    return NextResponse.json({
      success: false,
      error: 'Circle faucet request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    });
  }
}