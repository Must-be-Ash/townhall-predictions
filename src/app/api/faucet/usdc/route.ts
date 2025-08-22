import { NextRequest, NextResponse } from 'next/server';
import { Coinbase, ExternalAddress } from '@coinbase/coinbase-sdk';

// Initialize Coinbase SDK
Coinbase.configure({
  apiKeyName: process.env.CDP_API_KEY!,
  privateKey: process.env.CDP_API_SECRET!
});

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Create external address object for Base Sepolia
    const externalAddress = new ExternalAddress("base-sepolia", address);

    // Create faucet request for USDC
    const faucetTransaction = await externalAddress.faucet("usdc");
    
    // Wait for the transaction to complete
    await faucetTransaction.wait();

    return NextResponse.json({
      success: true,
      transactionHash: faucetTransaction.getTransactionHash(),
      transactionLink: `https://sepolia.basescan.org/tx/${faucetTransaction.getTransactionHash()}`,
      amount: "1 USDC"
    });

  } catch (error) {
    console.error('Faucet USDC request failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to request USDC from faucet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}