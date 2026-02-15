import { NextRequest, NextResponse } from 'next/server';
import { syncNewBetEvents } from '@/lib/services/betEventSync';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify Vercel cron secret or admin API key
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const adminApiKey = process.env.ADMIN_API_KEY;

    const isValidCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isValidAdmin = adminApiKey && authHeader === `Bearer ${adminApiKey}`;

    if (!isValidCron && !isValidAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 [CRON] Starting automatic bet event sync...');

    // Run the sync operation
    const result = await syncNewBetEvents('cron');

    const duration = Date.now() - startTime;
    const logMessage = `✅ [CRON] Bet event sync completed in ${duration}ms: ${result.success} successful, ${result.failed} failed, ${result.skipped} skipped`;

    console.log(logMessage);

    // Return success response with sync statistics
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      result,
      message: 'Automatic bet event sync completed successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = `❌ [CRON] Bet event sync failed after ${duration}ms`;

    console.error(errorMessage, error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: 'Automatic bet event sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support POST method for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}