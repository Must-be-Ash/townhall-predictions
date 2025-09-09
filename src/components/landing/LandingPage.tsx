"use client";

import Image from "next/image";
import { AuthWithAutoFunding } from "@/components/auth/AuthWithAutoFunding";
import { TextShimmer } from "@/components/ui/text-shimmer";

export function LandingPage() {
  const handleFooterClick = () => {
    window.open('https://www.coinbase.com/en-ca/legal/privacy', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-between px-4 py-8">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4">
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
          <h1 className="text-3xl md:text-2xl font-bold text-[#ffffff] leading-tight mt-2">
            Townhall <br/> Predictions
          </h1>
          <div className="mb-12">
            <TextShimmer 
              className="text-[#808080] dark:[--base-color:#808080] dark:[--base-gradient-color:#ffffff]"
              duration={3}
            >
              prediction market fun without the risks
            </TextShimmer>
          </div>
          {/* Login Form */}
          <div className="w-full">
            <AuthWithAutoFunding onAuthSuccess={() => window.location.reload()} />
          </div>
        </div>
      </div>

      {/* Shimmer Footer */}
      <footer className="w-full text-center">
        <button
          onClick={handleFooterClick}
          className="cursor-pointer text-sm text-[#969696] hover:text-[#FFFFFF] transition-colors duration-200"
        >
          By using this app, you agree to Coinbase&apos;s privacy policy
        </button>
      </footer>
    </div>
  );
}