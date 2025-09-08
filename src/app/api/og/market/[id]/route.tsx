import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function formatTimeRemaining(closeTime: string): string {
  const now = new Date().getTime();
  const target = new Date(closeTime).getTime();
  const total = target - now;

  if (total <= 0) {
    return 'Ended';
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m`;
}

function formatUSDC(amount: number): string {
  return amount.toFixed(2);
}

async function getMarketData(marketId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/markets/${marketId}`, {
      headers: {
        'User-Agent': 'OG-Image-Generator',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.status}`);
    }
    
    const data = await response.json();
    return data.market;
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const marketData = await getMarketData(id);
    
    if (!marketData) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1a1a1a',
              fontSize: 32,
              fontWeight: 600,
              color: 'white',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 20, display: 'flex' }}>🏛️</div>
            <div style={{ display: 'flex' }}>Townhall</div>
            <div style={{ fontSize: 24, fontWeight: 400, marginTop: 10, display: 'flex' }}>
              Prediction market not found
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    // Convert from wei to USDC (6 decimals)
    const yesTotal = parseFloat(marketData.yesTotal) / 1000000;
    const noTotal = parseFloat(marketData.noTotal) / 1000000;
    const totalPool = yesTotal + noTotal;
    
    const yesPercentage = totalPool > 0 ? Math.round((yesTotal / totalPool) * 100) : 50;
    const noPercentage = totalPool > 0 ? Math.round((noTotal / totalPool) * 100) : 50;
    
    const question = truncateText(marketData.question, 120);
    const timeRemaining = formatTimeRemaining(marketData.closeTime);
    const totalPoolFormatted = formatUSDC(totalPool);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1a1a1a',
            padding: '80px',
            fontFamily: 'system-ui',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '60px',
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#ffffff',
                display: 'flex',
              }}
            >
              🏛️ Townhall
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#808080',
                display: 'flex',
              }}
            >
              ${totalPoolFormatted} • {timeRemaining}
            </div>
          </div>
          
          <div
            style={{
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#ffffff',
              marginBottom: '80px',
              display: 'flex',
            }}
          >
            {question}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#10b981',
                backgroundColor: '#065f46',
                padding: '20px 40px',
                borderRadius: '20px',
                display: 'flex',
              }}
            >
              YES {yesPercentage}%
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#ef4444',
                backgroundColor: '#7f1d1d',
                padding: '20px 40px',
                borderRadius: '20px',
                display: 'flex',
              }}
            >
              NO {noPercentage}%
            </div>
          </div>

          <div
            style={{
              fontSize: 20,
              color: '#808080',
              textAlign: 'center',
              marginTop: '40px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            prediction market fun without the risks
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            fontSize: 32,
            fontWeight: 600,
            color: 'white',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 20, display: 'flex' }}>🏛️</div>
          <div style={{ display: 'flex' }}>Townhall</div>
          <div style={{ fontSize: 24, fontWeight: 400, marginTop: 10, display: 'flex' }}>
            prediction market fun without the risks
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}