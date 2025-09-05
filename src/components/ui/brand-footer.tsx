"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { useIsSignedIn } from "@coinbase/cdp-hooks"

export function BrandFooter() {
  const pathname = usePathname()
  const { isSignedIn } = useIsSignedIn()
  
  // Don't show on landing page (root path when not signed in)
  if (pathname === '/' && !isSignedIn) {
    return null
  }
  
  return (
    <footer className="hidden md:block fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-center py-4 px-4 bg-[#1a1a1a]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-xs text-[#DBDBDB] pointer-events-auto">
          {/* Logo */}
          <Image
            src="/logo.png"
            alt="Prediction Panda"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          
          {/* Copyright Text */}
          <p className="text-center">
            © 2025 Townhall.lol
          </p>
        </div>
      </div>
    </footer>
  )
}
