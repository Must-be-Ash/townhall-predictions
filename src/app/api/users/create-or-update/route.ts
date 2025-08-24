import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const { email, evmAddress, displayName } = await request.json();

    if (!email || !evmAddress) {
      return NextResponse.json(
        { success: false, error: 'email and evmAddress are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Try to find existing user by email or evmAddress
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { evmAddress: evmAddress.toLowerCase() }
      ]
    });

    if (user) {
      // Update existing user
      user.email = email.toLowerCase();
      user.evmAddress = evmAddress.toLowerCase();
      user.displayName = displayName || user.displayName;
      user.lastActive = new Date();
      await user.save();
      
      console.log(`✅ Updated existing user: ${evmAddress}`);
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        evmAddress: evmAddress.toLowerCase(),
        displayName: displayName,
        isAdmin: false,
        totalBets: 0,
        totalWinnings: "0",
        autoFundingStatus: 'pending'
      });
      await user.save();
      
      console.log(`✅ Created new user: ${evmAddress}`);
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        evmAddress: user.evmAddress,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        autoFundingStatus: user.autoFundingStatus,
        isNewUser: !user.lastActive || user.autoFundingStatus === 'pending'
      }
    });

  } catch (error) {
    console.error('Failed to create/update user:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create/update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}