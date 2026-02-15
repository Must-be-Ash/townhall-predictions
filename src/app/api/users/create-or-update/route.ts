import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { createOrUpdateUserOnLogin, getUserDisplayName } from '@/lib/models/User';
import { requireAuth, isAllowedEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Require valid CDP access token
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { email, evmAddress } = await request.json();

    if (!email || !evmAddress) {
      return NextResponse.json(
        { success: false, error: 'email and evmAddress are required' },
        { status: 400 }
      );
    }

    // Server-side email domain check
    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'This application is restricted to invite only.' },
        { status: 403 }
      );
    }

    await connectDB();

    // Use the new createOrUpdateUserOnLogin function
    const user = await createOrUpdateUserOnLogin(email, evmAddress);

    const isNewUser = user.createdAt.getTime() > (Date.now() - 5000); // Created within last 5 seconds

    console.log(`✅ ${isNewUser ? 'Created new' : 'Updated existing'} user: ${user.username} (${user.email})`);

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        evmAddress: user.evmAddress,
        username: user.username,
        displayName: getUserDisplayName(user),
        isAdmin: user.isAdmin,
        autoFundingStatus: user.autoFundingStatus,
        isNewUser
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