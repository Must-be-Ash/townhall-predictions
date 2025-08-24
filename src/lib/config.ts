/**
 * Configuration utilities for environment-specific URLs and settings
 */

/**
 * Get the base URL for the application
 * Falls back to localhost:3000 in development if not set
 */
export function getBaseUrl(): string {
  // Use NEXT_PUBLIC_BASE_URL if set
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Production fallback - should not happen if env vars are set correctly
  return 'https://www.townhall.lol';
}

/**
 * Get an absolute URL by combining base URL with a path
 */
export function getAbsoluteUrl(path: string = ''): string {
  const baseUrl = getBaseUrl();
  // Remove leading slash from path to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}${cleanPath ? `/${cleanPath}` : ''}`;
}