import { NextRequest, NextResponse } from 'next/server';
import { syncAllBetEvents, syncNewBetEvents, validateBetEventIntegrity } from '@/lib/services/betEventSync';

export async function POST(request: NextRequest) {
  try {
    // Basic auth check - you might want to add proper authentication
    const authHeader = request.headers.get('authorization');
    const adminApiKey = process.env.ADMIN_API_KEY;
    
    if (!adminApiKey || authHeader !== `Bearer ${adminApiKey}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'all'; // 'all', 'new', or 'validate'

    console.log(`🎯 Bet event sync triggered with mode: ${mode}`);

    let result;
    
    switch (mode) {
      case 'all':
        result = await syncAllBetEvents();
        break;
      case 'new':
        result = await syncNewBetEvents();
        break;
      case 'validate':
        result = await validateBetEventIntegrity();
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Invalid mode: ${mode}. Use 'all', 'new', or 'validate'`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mode,
      result,
      timestamp: new Date().toISOString(),
      message: `Bet event sync completed with mode: ${mode}`
    });

  } catch (error) {
    console.error('Failed to sync bet events:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to sync bet events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}