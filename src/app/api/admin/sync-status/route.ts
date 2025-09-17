import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { SyncLog, ISyncLog } from '@/lib/models/SyncLog';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const operation = searchParams.get('operation'); // 'bet-sync' or 'market-sync'

    // Build query filter
    const filter: Record<string, unknown> = {};
    if (operation) {
      filter.operation = operation;
    }

    // Get recent sync logs
    const recentLogs = await SyncLog.find(filter)
      .sort({ startTime: -1 })
      .limit(limit)
      .lean() as unknown as ISyncLog[];

    // Get sync statistics for the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await SyncLog.aggregate([
      {
        $match: {
          startTime: { $gte: last24Hours },
          ...(operation && { operation })
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          totalEventsProcessed: { $sum: '$metadata.eventsProcessed' }
        }
      }
    ]);

    // Get latest sync status
    const latestSync = await SyncLog.findOne(filter)
      .sort({ startTime: -1 })
      .lean() as unknown as ISyncLog | null;

    // Calculate health status
    const recentFailures = await SyncLog.countDocuments({
      ...filter,
      status: 'failure',
      startTime: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    const healthStatus = recentFailures === 0 ? 'healthy' :
                        recentFailures < 3 ? 'warning' : 'critical';

    return NextResponse.json({
      success: true,
      healthStatus,
      latestSync: latestSync ? {
        ...latestSync,
        timeAgo: latestSync.startTime ?
          Math.round((Date.now() - new Date(latestSync.startTime).getTime()) / 1000 / 60) :
          null
      } : null,
      stats: {
        last24Hours: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgDuration: Math.round(stat.avgDuration || 0),
            totalEventsProcessed: stat.totalEventsProcessed || 0
          };
          return acc;
        }, {} as Record<string, { count: number; avgDuration: number; totalEventsProcessed: number }>),
        recentFailures
      },
      recentLogs: recentLogs.map(log => ({
        ...log,
        timeAgo: Math.round((Date.now() - new Date(log.startTime).getTime()) / 1000 / 60)
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}