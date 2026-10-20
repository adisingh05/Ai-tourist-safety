import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Standalone tourist app. Unlike the police dashboard it does NOT proxy the
// API: it calls VITE_API_BASE cross-origin, which the backend allows via
// CORS_ORIGINS. That keeps the dev server and the deployed app identical.
//
// `host: true` binds all interfaces so a phone on the same Wi-Fi can load it.
// Note: browsers only expose geolocation on secure origins, so on a real
// device serve this through an https tunnel (see README).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Tourist Safety Companion",
        short_name: "Safety",
        description:
          "Live safety monitoring, route risk and emergency SOS for tourists.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["travel", "navigation", "health"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Map tiles: cache what we've seen so the map still renders offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Never cache API calls — safety data must always be live.
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: true,
    port: 8081,
    strictPort: true,
  },
});
