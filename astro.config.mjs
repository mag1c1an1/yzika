// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://mag1cian.top",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith("/stream/"),
    }),
  ],
  // Dev-only proxy so /stream and /live can talk to a locally running
  // `cargo run` signal server on 127.0.0.1:3000. Production still goes
  // through nginx; this block does not affect the static build.
  // NOTE: Astro's top-level `server` option ignores `proxy`; WebSocket
  // proxying must go through Vite's `server.proxy`.
  vite: {
    server: {
      proxy: {
        "/signal-admin": {
          target: "ws://127.0.0.1:3000",
          ws: true,
          rewrite: (path) => path.replace(/^\/signal-admin/, ""),
        },
        "/signal": {
          target: "ws://127.0.0.1:3000",
          ws: true,
          rewrite: (path) => path.replace(/^\/signal/, ""),
        },
      },
    },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Atkinson",
      cssVariable: "--font-atkinson",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/atkinson-regular.woff"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/atkinson-bold.woff"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],
});
