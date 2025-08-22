"use client";

import Image from "next/image";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { TextShimmer } from "@/components/ui/text-shimmer";

export function LandingPage() {
  const handleFooterClick = () => {
    window.open('https://x.com/Must_be_Ash', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-between px-4 py-8">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/white-logo.png"
              alt="Town Hall Predictions"
              width={120}
              height={120}
              className="w-auto h-auto"
              priority
            />
          </div>
          
          {/* Hero Title */}
          <h1 className="text-3xl md:text-2xl font-bold text-[#ffffff] leading-tight">
            Friendly match of prediction market
          </h1>
          <p className="text-[#808080]">
          prediction market fun without the risks
          </p>
          {/* Login Button */}
          <div className="w-full">
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Shimmer Footer */}
      <footer className="w-full text-center">
        <button
          onClick={handleFooterClick}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <TextShimmer 
            className="text-sm text-[#ffffff] dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff]"
            duration={3}
          >
            made by @must_be_ash
          </TextShimmer>
        </button>
      </footer>
    </div>
  );
}