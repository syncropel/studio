// /home/dpwanjala/repositories/syncropel/studio/next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // output: "export",
  assetPrefix: "./",

  // The `rewrites` function allows us to proxy requests during development.
  // This will NOT be included in the production build (`npm run build`).
  rewrites: isDev
    ? async () => {
        return [
          // {
          //   // This rule proxies WebSocket requests on the /ws path...
          //   source: "/ws",
          //   // ...to the mock WebSocket server.
          //   destination: "http://127.0.0.1:8889/ws",
          // },
          // --- THIS IS THE FIX ---
          // Add this new rule to proxy all Data Plane requests.
          {
            // It matches any path that starts with /artifacts/...
            source: "/artifacts/:path*",
            // ...and forwards it to our mock HTTP server on port 8888.
            destination: "http://127.0.0.1:8888/artifacts/:path*",
          },
        ];
      }
    : undefined,
};

export default nextConfig;
