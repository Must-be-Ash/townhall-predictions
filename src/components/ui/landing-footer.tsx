"use client"

import { TextShimmer } from "./text-shimmer"
// import Image from "next/image"

export function LandingFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-center py-3 px-4">
        <div className="flex items-center gap-3 text-xs text-[#333333] pointer-events-auto">
          {/* Logo */}
          {/* <Image
            src="/logo.png"
            alt="Prediction Panda"
            width={20}
            height={20}
            className="w-5 h-5"
          /> */}
          
          {/* Privacy Policy Text */}
          <a
            href="https://www.coinbase.com/en-ca/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <TextShimmer 
              className="text-xs [--base-color:#0052FF] [--base-gradient-color:#E6EEFF]"
              duration={2.5}
              spread={1}
            >
              By using this app, you agree to Coinbase&apos;s privacy policy
            </TextShimmer>
          </a>
        </div>
      </div>
    </footer>
  )
}
