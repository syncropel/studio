"use client";

import { useState, useEffect } from "react";

/**
 * A simple hook that returns true only after the component has mounted on the client.
 * This is used to prevent hydration mismatches by ensuring that components that
 * depend on client-side information (like theme or window size) do not render
 * on the server and only render on the client after the initial hydration is complete.
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
