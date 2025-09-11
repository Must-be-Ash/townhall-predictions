import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { BetEvent } from '@/lib/models/BetEvent';
import { User, getUserDisplayName, IUser } from '@/lib/models/User';

interface BetEventWithUser {
  userAddress: string;
  displayName: string;
  outcome: boolean;
  amount: string;
  timestamp: Date;
  transactionHash: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const marketId = parseInt(id);
    
    if (isNaN(marketId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid market ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch all bet events for this market
    const betEvents = await BetEvent.find({ marketId })
      .sort({ timestamp: -1 }) // Most recent first
      .lean();

    if (betEvents.length === 0) {
      return NextResponse.json({
        success: true,
        bets: [],
        totalBets: 0
      });
    }

    // Get unique user addresses
    const userAddresses = [...new Set(betEvents.map(bet => bet.userAddress))];
    
    // Fetch user data for display names
    const users = await User.find({
      evmAddress: { $in: userAddresses }
    }).lean();

    // Create user lookup map
    const userMap = new Map(
      users.map(user => [user.evmAddress.toLowerCase(), user])
    );

    // Combine bet events with user display information
    const betsWithUserInfo: BetEventWithUser[] = betEvents.map(bet => {
      const user = userMap.get(bet.userAddress.toLowerCase());
      
      return {
        userAddress: bet.userAddress,
        displayName: user ? getUserDisplayName(user as unknown as IUser) : `${bet.userAddress.slice(0, 6)}...${bet.userAddress.slice(-4)}`,
        outcome: bet.outcome,
        amount: bet.amount,
        timestamp: bet.timestamp,
        transactionHash: bet.transactionHash
      };
    });

    return NextResponse.json({
      success: true,
      bets: betsWithUserInfo,
      totalBets: betsWithUserInfo.length
    });

  } catch (error) {
    console.error('Failed to fetch market bet events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bet events' },
      { status: 500 }
    );
  }
}