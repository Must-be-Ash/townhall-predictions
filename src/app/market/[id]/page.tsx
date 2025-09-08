import { CDPProvider } from "@/components/providers/CDPProvider";
import { MarketProvider } from "@/contexts/MarketContext";
import MarketContent from "./MarketContent";
import { Metadata } from 'next';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

async function getMarketData(marketId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/markets/${marketId}`, {
      headers: {
        'User-Agent': 'Townhall-OG-Generator',
      },
      // Add cache headers to prevent stale data
      next: { revalidate: 60 } // Revalidate every minute
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.market;
  } catch (error) {
    console.error('Error fetching market data for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { id } = await params;
  const marketData = await getMarketData(id);
  
  if (!marketData) {
    return {
      title: "Market Not Found | Townhall",
      description: "The requested prediction market could not be found.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ogImageUrl = `${baseUrl}/api/og/market/${id}`;
  
  const title = `${marketData.question} | Townhall`;
  const description = `Join the prediction market: "${marketData.question}". Place your bets and see what the community thinks!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/market/${id}`,
      siteName: "Townhall",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: marketData.question,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@must_be_ash",
      images: [ogImageUrl],
    },
  };
}

export default function MarketPage({}: MarketPageProps) {
  return (
    <CDPProvider>
      <MarketProvider>
        <MarketContent />
      </MarketProvider>
    </CDPProvider>
  );
}