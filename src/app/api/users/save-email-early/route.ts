import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { extractUsernameFromEmail, User } from '@/lib/models/User';
import { isAllowedEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'email is required' },
        { status: 400 }
      );
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'This application is restricted to invite only.' },
        { status: 403 }
      );
    }

    await connectDB();

    const username = extractUsernameFromEmail(email);
    const lowerEmail = email.toLowerCase();

    // Check if user already exists by email
    let user = await User.findOne({ email: lowerEmail });

    if (user) {
      // User already exists, just update last active
      user.lastActive = new Date();
      await user.save();
      
      console.log(`✅ Email already exists for user: ${user.username}`);
      
      return NextResponse.json({
        success: true,
        message: `Email already registered for user: ${username}`,
        user: {
          email: user.email,
          username: user.username,
          isNewUser: false
        }
      });
    } else {
      // Create new user with email only (wallet will be added later)
      user = new User({
        email: lowerEmail,
        evmAddress: `pending_${Date.now()}`, // Temporary address until wallet is connected
        username,
        displayName: username,
        isAdmin: false,
        totalBets: 0,
        totalWinnings: "0"
      });
      
      await user.save();
      
      console.log(`✅ Created early user record: ${username} (${lowerEmail})`);

      return NextResponse.json({
        success: true,
        message: `Email saved for new user: ${username}`,
        user: {
          email: user.email,
          username: user.username,
          isNewUser: true
        }
      });
    }

  } catch (error) {
    console.error('Failed to save email early:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}