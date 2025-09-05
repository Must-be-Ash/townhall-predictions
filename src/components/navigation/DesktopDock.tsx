"use client";

import { usePathname } from "next/navigation";
import { useSignOut } from "@coinbase/cdp-hooks";
import Link from "next/link";

function SignOutButton() {
  const { signOut } = useSignOut();

  return (
    <button
      onClick={signOut}
      className="flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 hover:bg-white/10 text-[#c0c0c0] hover:text-[#ffffff]"
      title="Sign Out"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="text-xs font-medium mt-2">Sign Out</span>
    </button>
  );
}

interface DesktopDockProps {
  onInfoClick: () => void;
}

export function DesktopDock({ onInfoClick }: DesktopDockProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="backdrop-blur-md bg-[#2a2a2a]/95 border border-[#3a3a3a] shadow-2xl rounded-2xl px-4 py-3">
        <div className="flex items-center space-x-6">
          

          {/* Home */}
          <Link 
            href="/"
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 ${
              isActive('/') && pathname === '/' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'hover:bg-white/10 text-[#c0c0c0] hover:text-[#ffffff]'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium mt-2">Home</span>
          </Link>

          {/* Admin/Create Market */}
          <Link 
            href="/admin"
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 ${
              isActive('/admin') 
                ? 'bg-green-500/20 text-green-400' 
                : 'hover:bg-white/10 text-[#c0c0c0] hover:text-[#ffffff]'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium mt-2">Create</span>
          </Link>

          {/* Info */}
          <button
            onClick={onInfoClick}
            className="flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 hover:bg-white/10 text-[#c0c0c0] hover:text-[#ffffff]"
            title="How it works"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium mt-2">Info</span>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-[#3a3a3a]"></div>

          {/* Sign Out */}
          <SignOutButton />

        </div>
      </div>
    </div>
  );
}