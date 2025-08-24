import { NextResponse } from 'next/server';
import { tryCircleRefill } from '@/lib/circleRefillService';

export async function POST() {
  try {
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