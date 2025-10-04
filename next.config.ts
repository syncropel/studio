// /home/dpwanjala/repositories/cx-studio/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // --- START OF DEFINITIVE FIX ---
  // This tells Next.js to use relative paths for assets,
  // making the exported build portable and compatible with file:// URLs.
  assetPrefix: "./",
  // --- END OF DEFINITIVE FIX ---
};

export default nextConfig;
