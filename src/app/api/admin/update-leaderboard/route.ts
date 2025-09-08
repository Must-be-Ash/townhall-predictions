import { NextRequest, NextResponse } from 'next/server';
import { updateLeaderboardCache } from '@/lib/services/leaderboardSync';

export async function POST(request: NextRequest) {
  try {
    // Simple admin check - in production you'd want proper auth
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.ADMIN_API_KEY;
    
    if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🏆 Manual leaderboard cache update triggered...');
    
    await updateLeaderboardCache();
    
    return NextResponse.json({
      success: true,
      message: 'Leaderboard cache updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to update leaderboard cache:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update leaderboard cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
