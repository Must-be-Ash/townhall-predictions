// Circle Faucet Auto-Refill Service
// This runs completely independently from the main funding system
// If it fails, it won't affect user funding at all

let refillInProgress = false;
let lastRefillAttempt = 0;
const REFILL_COOLDOWN = 60 * 60 * 1000; // 1 hour between attempts

export async function tryCircleRefill(reason: string = 'user_funded') {
  // Completely fail-safe: never throw errors, never block main flow
  try {
    // Skip if already in progress or too recent
    const now = Date.now();
    if (refillInProgress || (now - lastRefillAttempt) < REFILL_COOLDOWN) {
      console.log('🔄 Circle refill skipped (cooldown or in progress)');
      return;
    }

    // Check for required environment variables
    const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
    const circleToken = process.env.CIRCLE_AUTH_TOKEN;
    
    if (!adminAddress || !circleToken) {
      console.log('🔄 Circle refill skipped (missing config)');
      return;
    }

    refillInProgress = true;
    lastRefillAttempt = now;

    console.log(`💰 Triggering Circle refill (reason: ${reason})`);

    // Call Circle API directly - no internal round-trip
    const requestBody = {
      usdc: true,
      native: true,
      blockchain: 'BASE-SEPOLIA',
      address: adminAddress
    };

    console.log('📤 Requesting Circle faucet funds:', requestBody);

    // Fire and forget - don't await this
    fetch('https://api.circle.com/v1/faucet/drips', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${circleToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    .then(async response => {
      console.log(`📊 Circle API response: ${response.status} ${response.statusText}`);
      
      // Check if response is ok and has content
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('⚠️ Circle API error response:', errorText);
        return { error: `HTTP ${response.status}: ${errorText}` };
      }

      // Try to parse JSON, fallback to text if it fails
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          return await response.json();
        } catch {
          const responseText = await response.text();
          console.warn('⚠️ Failed to parse JSON response:', responseText);
          return { error: 'Invalid JSON response', responseText };
        }
      } else {
        const responseText = await response.text();
        console.log('📄 Circle API text response:', responseText);
        return { success: true, responseText };
      }
    })
    .then(result => {
      if (result?.error) {
        console.warn('⚠️ Circle refill failed but continuing normally:', result.error);
      } else if (result && !result.code) {
        console.log('✅ Circle refill completed successfully:', result);
      } else {
        console.warn('⚠️ Circle refill failed but continuing normally:', result?.message || 'Unknown error');
      }
    })
    .catch(error => {
      console.warn('⚠️ Circle refill error but continuing normally:', error);
    })
    .finally(() => {
      refillInProgress = false;
    });

  } catch (error) {
    // Triple fail-safe: catch any unexpected errors
    console.warn('⚠️ Circle refill service error but continuing normally:', error);
    refillInProgress = false;
  }
}

// Check if we should refill based on usage patterns
export function shouldTriggerRefill(fundedCount: number = 0): boolean {
  try {
    // Simple heuristic: refill every 5 users funded, but respect rate limits
    return fundedCount > 0 && fundedCount % 5 === 0;
  } catch (error) {
    console.warn('⚠️ Refill check error:', error);
    return false;
  }
}