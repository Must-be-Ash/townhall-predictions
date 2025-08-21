"use client";

import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";
import { useEffect, useState } from "react";

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const [initError, setInitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Always call hooks at the top level
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();

  useEffect(() => {
    // Add a timeout for initialization
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        setInitError("CDP initialization timeout");
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    if (isInitialized) {
      setIsLoading(false);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [isInitialized]);

  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
          <p className="text-xs text-gray-500 mt-2">
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return fallback || <SignInPrompt />;
  }

  return <>{children}</>;
}

function SignInPrompt() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          TownHall Predictions
        </h1>
        <p className="text-gray-600 mb-8">
          Please sign in to participate in prediction markets
        </p>
        {/* CDP AuthButton will be added here */}
      </div>
    </div>
  );
}