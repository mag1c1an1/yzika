// @ts-check

import fs from "node:fs";
import path from "node:path";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

/**
 * Dev-only fix for directory-index HTML in `public/`.
 *
 * Vite 7 snapshots `public/` **once at dev-server startup** and only serves
 * requests whose exact path is in that snapshot:
 *
 *   if (publicFiles && !publicFiles.has(toFilePath(req.url))) return next();
 *
 * So `/typst/index.html` works but the clean URL `/typst/` falls through to the
 * Astro router and 404s — even though nginx serves it fine in production
 * (`try_files $uri $uri/ =404` + `index index.html`). It also means files
 * generated after startup (e.g. by `npm run build:typst`) 404 until a restart.
 *
 * This middleware runs before Vite's internal ones and serves those `.html`
 * files directly, so dev matches production and `build:typst` + refresh works.
 * Skipped for `/` so the Astro home page is never shadowed.
 */
const servePublicHtml = () => ({
  name: "serve-public-html",
  apply: "serve",
  configureServer(server) {
    const publicDir = path.resolve(server.config.publicDir ?? "public");

    server.middlewares.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();

      const url = req.url ?? "";
      if (!url.startsWith("/") || url.startsWith("/@")) return next();

      const pathname = decodeURIComponent(url.split("?")[0]);
      if (pathname === "/") return next();

      // `/typst/` -> <public>/typst/index.html, `/typst` -> the same, so a
      // trailing slash is optional exactly like nginx's `try_files $uri $uri/`.
      const candidates = [
        path.join(publicDir, pathname),
        path.join(publicDir, pathname, "index.html"),
      ];

      for (const file of candidates) {
        if (!file.startsWith(publicDir + path.sep)) continue; // 防目录穿越
        if (!file.endsWith(".html")) continue;
        if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) continue;

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");

        if (req.method === "HEAD") return res.end();
        fs.createReadStream(file).pipe(res);
        return;
      }

      return next();
    });
  },
});

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
    plugins: [servePublicHtml()],
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
