import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { getContractAddress } from '@/lib/constants';
import { tryCircleRefill } from '@/lib/circleRefillService';
import { requireAuth } from '@/lib/auth';

// USDC contract ABI (minimal for transfer)
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

// Funding amounts
const USDC_AMOUNT = parseUnits('2', 6); // 2 USDC (6 decimals)
const ETH_AMOUNT = parseUnits('0.0001', 18); // 0.0001 ETH for gas

export async function POST(request: NextRequest) {
  try {
    // Require valid CDP access token
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { userAddress, attemptCount = 1 } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'User address is required' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.ADMIN_PRIVATE_KEY || !process.env.ADMIN_WALLET_ADDRESS) {
      console.error('Admin wallet credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Admin wallet not configured' },
        { status: 500 }
      );
    }

    // Create wallet client with admin private key
    const account = privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http()
    });

    // Create public client for read operations
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    });

    const usdcAddress = getContractAddress('USDC', 84532) as `0x${string}`;
    console.log(`🏦 ${attemptCount > 1 ? `Retry attempt ${attemptCount}:` : 'Starting'} funding for user ${userAddress}`);
    console.log(`💰 Sending ${formatUnits(USDC_AMOUNT, 6)} USDC + ${formatUnits(ETH_AMOUNT, 18)} ETH`);

    // Check if user already has funds (prevent multiple funding)
    const [initialEthBalance, initialUsdcBalance] = await Promise.all([
      publicClient.getBalance({ address: userAddress as `0x${string}` }),
      publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`]
      })
    ]);

    const initialUsdcFormatted = formatUnits(initialUsdcBalance as bigint, 6);
    console.log(`🔍 User current balances: ${formatUnits(initialEthBalance, 18)} ETH, ${initialUsdcFormatted} USDC`);

    // Skip funding if user already has significant USDC (>= 1 USDC suggests they've been funded)
    if ((initialUsdcBalance as bigint) >= parseUnits('1', 6)) {
      console.log('⏭️ User already has funds - skipping funding to prevent duplicates');
      return NextResponse.json({
        success: true,
        message: 'User already funded - skipped to prevent duplicate funding',
        funding: {
          ethAmount: '0',
          usdcAmount: '0',
          totalGasUsed: '0'
        },
        transactions: [],
        userBalances: {
          eth: formatUnits(initialEthBalance, 18),
          usdc: initialUsdcFormatted
        },
        skipped: true
      });
    }

    // Check admin wallet balances first
    const [adminEthBalance, adminUsdcBalance] = await Promise.all([
      publicClient.getBalance({ address: account.address }),
      publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      })
    ]);

    console.log(`🔍 Admin wallet balances: ${formatUnits(adminEthBalance, 18)} ETH, ${formatUnits(adminUsdcBalance as bigint, 6)} USDC`);

    // Check if admin has sufficient funds
    if (adminEthBalance < ETH_AMOUNT + parseUnits('0.001', 18)) { // Extra for gas
      return NextResponse.json(
        { success: false, error: 'Insufficient ETH in admin wallet for funding + gas' },
        { status: 500 }
      );
    }

    if ((adminUsdcBalance as bigint) < USDC_AMOUNT) {
      return NextResponse.json(
        { success: false, error: 'Insufficient USDC in admin wallet' },
        { status: 500 }
      );
    }

    const transactions = [];
    let totalGasUsed = 0n;

    // Get current nonce for the admin wallet
    let currentNonce = await publicClient.getTransactionCount({ 
      address: account.address,
      blockTag: 'pending' // Use pending to get the most up-to-date nonce
    });

    console.log(`🔢 Starting with nonce: ${currentNonce}`);

    // Transaction 1: Send ETH for gas fees
    console.log('📤 Sending ETH...');
    const ethTxHash = await walletClient.sendTransaction({
      to: userAddress as `0x${string}`,
      value: ETH_AMOUNT,
      gas: 21000n, // Standard ETH transfer gas limit
      nonce: currentNonce,
    });

    console.log(`✅ ETH sent: ${ethTxHash}`);
    
    // Wait for ETH transaction to be mined
    const ethReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: ethTxHash,
      timeout: 30000 // 30 second timeout
    });
    
    totalGasUsed += ethReceipt.gasUsed;
    transactions.push({
      hash: ethTxHash,
      type: 'ETH',
      amount: formatUnits(ETH_AMOUNT, 18),
      gasUsed: ethReceipt.gasUsed.toString(),
      blockNumber: ethReceipt.blockNumber.toString()
    });

    // Increment nonce for next transaction
    currentNonce++;
    console.log(`🔢 Using nonce ${currentNonce} for USDC transaction`);
    
    // Small delay to ensure ETH transaction is properly propagated
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Transaction 2: Send USDC
    console.log('📤 Sending USDC...');
    const usdcTxHash = await walletClient.writeContract({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [userAddress as `0x${string}`, USDC_AMOUNT],
      gas: 100000n, // USDC transfer gas limit
      nonce: currentNonce,
    });

    console.log(`✅ USDC sent: ${usdcTxHash}`);
    
    // Wait for USDC transaction to be mined
    const usdcReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: usdcTxHash,
      timeout: 30000 // 30 second timeout
    });
    
    totalGasUsed += usdcReceipt.gasUsed;
    transactions.push({
      hash: usdcTxHash,
      type: 'USDC',
      amount: formatUnits(USDC_AMOUNT, 6),
      gasUsed: usdcReceipt.gasUsed.toString(),
      blockNumber: usdcReceipt.blockNumber.toString()
    });

    // Verify user received the funds
    const [userEthBalance, userUsdcBalance] = await Promise.all([
      publicClient.getBalance({ address: userAddress as `0x${string}` }),
      publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`]
      })
    ]);

    console.log(`🎉 Funding complete! User now has: ${formatUnits(userEthBalance, 18)} ETH, ${formatUnits(userUsdcBalance as bigint, 6)} USDC`);

    // Trigger Circle refill in background (completely fail-safe)
    // This runs asynchronously and won't affect the response
    try {
      tryCircleRefill('user_funded');
    } catch (error) {
      // Even the refill trigger is wrapped in try-catch
      console.warn('⚠️ Circle refill trigger error (ignored):', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Funding completed successfully',
      funding: {
        ethAmount: formatUnits(ETH_AMOUNT, 18),
        usdcAmount: formatUnits(USDC_AMOUNT, 6),
        totalGasUsed: totalGasUsed.toString()
      },
      transactions,
      userBalances: {
        eth: formatUnits(userEthBalance, 18),
        usdc: formatUnits(userUsdcBalance as bigint, 6)
      },
      explorerLinks: {
        eth: `https://sepolia.basescan.org/tx/${ethTxHash}`,
        usdc: `https://sepolia.basescan.org/tx/${usdcTxHash}`
      }
    });

  } catch (error: unknown) {
    console.error('❌ Admin funding failed:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fund user wallet';
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds in admin wallet';
    } else if (errorMsg.includes('nonce') || errorMsg.includes('replacement transaction')) {
      errorMessage = 'Transaction nonce conflict - please try again';
    } else if (errorMsg.includes('gas')) {
      errorMessage = 'Transaction failed due to gas issues';
    } else if (errorMsg.includes('timeout')) {
      errorMessage = 'Transaction timeout - funding may still be processing';
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorMsg || 'Unknown error',
        retryable: !errorMsg.includes('insufficient funds')
      },
      { status: 500 }
    );
  }
}