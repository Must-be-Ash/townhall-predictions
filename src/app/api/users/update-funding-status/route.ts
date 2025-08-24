import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/lib/models/User';

interface TransactionDetail {
  type: 'ETH' | 'USDC';
  hash: string;
  amount?: string;
  gasUsed?: string;
  blockNumber?: string;
}

interface FundingDetails {
  transactions?: TransactionDetail[];
  funding?: {
    ethAmount?: string;
    usdcAmount?: string;
  };
}

interface UpdateData {
  autoFundingStatus: string;
  lastFundingAttempt: Date;
  $inc: { autoFundingAttempts: number };
  fundingTransactionHashes?: {
    eth?: string;
    usdc?: string;
  };
  fundingAmount?: {
    eth?: string;
    usdc?: string;
  };
  lastFundingError?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress, status, fundingDetails, error } = await request.json();

    if (!userAddress || !status) {
      return NextResponse.json(
        { success: false, error: 'userAddress and status are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by EVM address
    const user = await User.findOne({ evmAddress: userAddress.toLowerCase() });

    if (!user) {
      console.warn(`User not found for address: ${userAddress}`);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: UpdateData = {
      autoFundingStatus: status,
      lastFundingAttempt: new Date(),
      $inc: { autoFundingAttempts: 1 }
    };

    // If funding was successful, store the transaction details
    if (status === 'completed' && fundingDetails) {
      const details = fundingDetails as FundingDetails;
      updateData.fundingTransactionHashes = {
        eth: details.transactions?.find((tx) => tx.type === 'ETH')?.hash,
        usdc: details.transactions?.find((tx) => tx.type === 'USDC')?.hash,
      };
      updateData.fundingAmount = {
        eth: details.funding?.ethAmount,
        usdc: details.funding?.usdcAmount,
      };
    }

    // If funding failed, store the error
    if (status === 'failed' && error) {
      updateData.lastFundingError = error;
    }

    // Update user record
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log(`✅ Updated funding status for user ${userAddress}: ${status}`);

    return NextResponse.json({
      success: true,
      user: {
        evmAddress: updatedUser.evmAddress,
        autoFundingStatus: updatedUser.autoFundingStatus,
        autoFundingAttempts: updatedUser.autoFundingAttempts,
        lastFundingAttempt: updatedUser.lastFundingAttempt
      }
    });

  } catch (error) {
    console.error('Failed to update user funding status:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update funding status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}