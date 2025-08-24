"use client";

import { useState, useEffect } from "react";
import { DesktopDock } from "./DesktopDock";
import { MobileDock } from "./MobileDock";
import { InfoModal } from "@/components/ui/InfoModal";

export function DockNavigation() {
  const [isMobile, setIsMobile] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

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

  const openInfoModal = () => setIsInfoModalOpen(true);
  const closeInfoModal = () => setIsInfoModalOpen(false);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <MobileDock onInfoClick={openInfoModal} />
      ) : (
        <DesktopDock onInfoClick={openInfoModal} />
      )}
      <InfoModal isOpen={isInfoModalOpen} onClose={closeInfoModal} />
    </>
  );
}