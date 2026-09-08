import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "EB Memento",
        short_name: "Memento",
        description:
          "Syllabus-exact maths and physics formulas for European Baccalaureate students.",
        theme_color: "#1c1916",
        background_color: "#f4efe6",
        display: "standalone",
        start_url: "/",
        lang: "en",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
      },
    }),
  ],
});
