import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png", "icons/icon.svg", "licenses.txt"],
      manifest: {
        name: "MoveQuest 微动冒险",
        short_name: "MoveQuest",
        description: "把日常的小片刻，变成身体活动的机会。",
        lang: "zh-CN",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f7f8f2",
        theme_color: "#f7f8f2",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { strictPort: true, proxy: { "/api": "http://127.0.0.1:5176" } },
  preview: { strictPort: true },
  test: { include: ["src/**/*.test.ts"] },
});
