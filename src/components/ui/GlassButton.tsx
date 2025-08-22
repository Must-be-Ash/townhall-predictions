"use client";

import { useState, useRef } from "react";

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "green" | "red" | "blue" | "gray";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function GlassButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "gray",
  className = "",
  size = "md"
}: GlassButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const variants = {
    green: {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.8) 50%, rgba(4, 120, 87, 0.9) 100%)',
      hoverBackground: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(16, 185, 129, 0.9) 50%, rgba(5, 150, 105, 0.95) 100%)',
      shadow: '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
      activeShadow: '0 4px 16px rgba(16, 185, 129, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      disabledBackground: 'linear-gradient(135deg, rgba(75, 85, 99, 0.3) 0%, rgba(55, 65, 81, 0.3) 100%)'
    },
    red: {
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.8) 50%, rgba(185, 28, 28, 0.9) 100%)',
      hoverBackground: 'linear-gradient(135deg, rgba(248, 113, 113, 0.95) 0%, rgba(239, 68, 68, 0.9) 50%, rgba(220, 38, 38, 0.95) 100%)',
      shadow: '0 8px 32px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
      activeShadow: '0 4px 16px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      disabledBackground: 'linear-gradient(135deg, rgba(75, 85, 99, 0.3) 0%, rgba(55, 65, 81, 0.3) 100%)'
    },
    blue: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.8) 50%, rgba(29, 78, 216, 0.9) 100%)',
      hoverBackground: 'linear-gradient(135deg, rgba(96, 165, 250, 0.95) 0%, rgba(59, 130, 246, 0.9) 50%, rgba(37, 99, 235, 0.95) 100%)',
      shadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
      activeShadow: '0 4px 16px rgba(59, 130, 246, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      disabledBackground: 'linear-gradient(135deg, rgba(75, 85, 99, 0.3) 0%, rgba(55, 65, 81, 0.3) 100%)'
    },
    gray: {
      background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.9) 0%, rgba(75, 85, 99, 0.8) 50%, rgba(55, 65, 81, 0.9) 100%)',
      hoverBackground: 'linear-gradient(135deg, rgba(156, 163, 175, 0.95) 0%, rgba(107, 114, 128, 0.9) 50%, rgba(75, 85, 99, 0.95) 100%)',
      shadow: '0 8px 32px rgba(107, 114, 128, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
      activeShadow: '0 4px 16px rgba(107, 114, 128, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      disabledBackground: 'linear-gradient(135deg, rgba(75, 85, 99, 0.3) 0%, rgba(55, 65, 81, 0.3) 100%)'
    }
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base'
  };

  const currentVariant = variants[variant];
  const currentSize = sizes[size];

  const triggerShimmer = () => {
    if (!buttonRef.current || disabled) return;
    
    buttonRef.current.style.animation = 'glass-shimmer 0.6s ease-in-out';
    
    setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.style.animation = '';
      }
    }, 600);
  };

  return (
    <>
      <style jsx>{`
        @keyframes glass-shimmer {
          0% { 
            box-shadow: ${currentVariant.shadow};
          }
          50% { 
            box-shadow: ${currentVariant.shadow}, 0 0 30px rgba(255, 255, 255, 0.4);
          }
          100% { 
            box-shadow: ${currentVariant.shadow};
          }
        }
      `}</style>
      <button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled}
        className={`
          relative font-semibold text-white rounded-xl
          backdrop-blur-sm border border-white/20
          transition-all duration-200 ease-out
          transform hover:scale-[1.02] active:scale-[0.98]
          disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100
          ${currentSize}
          ${className}
        `}
        style={{
          background: disabled 
            ? currentVariant.disabledBackground 
            : currentVariant.background,
          boxShadow: disabled 
            ? '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
            : isPressed 
              ? currentVariant.activeShadow 
              : currentVariant.shadow,
        }}
        onMouseDown={() => !disabled && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = currentVariant.hoverBackground;
            triggerShimmer();
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = currentVariant.background;
            setIsPressed(false);
          }
        }}
      >
        {/* Glass reflection overlay */}
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(255, 255, 255, 0.05) 100%)',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </button>
    </>
  );
}