import { NextRequest, NextResponse } from 'next/server';
import { tryCircleRefill } from '@/lib/circleRefillService';
import { requireAdminApiKey } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminApiKey(request);
    if (authResult instanceof NextResponse) return authResult;

    console.log('🔧 Manual Circle refill triggered by admin');
    
    // Trigger the refill (fire and forget, completely fail-safe)
    tryCircleRefill('admin_manual');
    
    return NextResponse.json({
      success: true,
      message: 'Circle refill triggered - check logs for results'
    });
    
  } catch (error) {
    console.warn('⚠️ Manual refill trigger error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger Circle refill',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}