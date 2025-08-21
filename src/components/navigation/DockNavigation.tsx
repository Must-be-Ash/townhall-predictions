"use client";

import { useState, useEffect } from "react";
import { DesktopDock } from "./DesktopDock";
import { MobileDock } from "./MobileDock";

export function DockNavigation() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkDevice();

    // Listen for resize events
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Render nothing on initial server render to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return isMobile ? <MobileDock /> : <DesktopDock />;
}