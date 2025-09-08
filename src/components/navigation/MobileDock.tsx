"use client";

import { usePathname } from "next/navigation";
import { useSignOut } from "@coinbase/cdp-hooks";
import Link from "next/link";

function SignOutButton() {
  const { signOut } = useSignOut();

  return (
    <button
      onClick={signOut}
      className="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[48px] text-[#c0c0c0] hover:text-[#ffffff] hover:bg-[#3a3a3a]"
    >
      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="text-xs font-medium">Sign Out</span>
    </button>
  );
}

interface MobileDockProps {
  onInfoClick: () => void;
}

export function MobileDock({ onInfoClick }: MobileDockProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#2a2a2a] border-t border-[#3a3a3a] pb-safe">
      <div className="max-w-md mx-auto px-8 py-3 pb-8">
        <div className="flex items-center justify-between">
          

          {/* Home */}
          <Link 
            href="/"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[48px] ${
              isActive('/') && pathname === '/' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-[#c0c0c0] hover:text-[#ffffff] hover:bg-[#3a3a3a]'
            }`}
          >
            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* Leaderboard */}
          <Link 
            href="/leaderboard"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[48px] ${
              isActive('/leaderboard') 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'text-[#c0c0c0] hover:text-[#ffffff] hover:bg-[#3a3a3a]'
            }`}
          >
            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-xs font-medium">Rankings</span>
          </Link>

          {/* Admin/Create */}
          <Link 
            href="/admin"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[48px] ${
              isActive('/admin') 
                ? 'bg-green-500/20 text-green-400' 
                : 'text-[#c0c0c0] hover:text-[#ffffff] hover:bg-[#3a3a3a]'
            }`}
          >
            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">Create</span>
          </Link>

          {/* Info */}
          <button
            onClick={onInfoClick}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[48px] text-[#c0c0c0] hover:text-[#ffffff] hover:bg-[#3a3a3a]"
          >
            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">Info</span>
          </button>

          {/* Sign Out */}
          <SignOutButton />

        </div>
      </div>
    </div>
  );
}