// /home/dpwanjala/repositories/cx-studio/next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Your existing configuration for static exports, which is perfect for Electron builds.
  // output: "export",
  assetPrefix: "./",
  // The `rewrites` function allows us to proxy requests during development.
  // This will NOT be included in the production build (`npm run build`).
  rewrites: isDev
    ? async () => {
        return [
          {
            // This rule proxies all WebSocket upgrade requests on the /ws path.
            source: "/ws",
            // ...to the cx-server running on its default port.
            destination: "http://127.0.0.1:8888/ws",
          },
          // You can add more rules here for standard API calls if needed in the future...
          // For example:
          // {
          //   source: '/api/:path*',
          //   destination: 'http://127.0.0.1:8888/api/:path*',
          // }
        ];
      }
    : undefined, // In production, we don't need rewrites, so we set it to undefined.
};

export default nextConfig;
