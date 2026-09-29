## Development

Start the dev server in background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview production build |

No test, lint, or typecheck scripts exist.

## Requirements

- Node >=22.12.0 (per `package.json` engines)
- TypeScript: `astro/tsconfigs/strict` with `strictNullChecks`

## Architecture

- **Astro 7** blog using `@astrojs/mdx`, `@astrojs/rss`, `@astrojs/sitemap`
- Content lives in `src/content/blog/` (Markdown + MDX), loaded via content collections (`src/content.config.ts`)
- Blog frontmatter schema (`title`, `description`, `pubDate`, optional `updatedDate` + `heroImage`) defined in `src/content.config.ts`
- Dynamic blog routes in `src/pages/blog/[...slug].astro`
- Blog index at `src/pages/blog/index.astro`
- **Private posts:** `pubDate: ''` (or omitted) is normalized by schema to `undefined` and treated as private. Private posts are filtered out of the home page (latest 2), `/blog/` index, single-page routes (URL returns 404), and RSS. Visibility helpers live in `src/content/utils.ts`: `isPostVisible(post)` and `visibleBlogPosts()` (sorted by `pubDate` desc).
- Layouts in `src/layouts/`, components in `src/components/`
- Site metadata in `src/consts.ts` (`SITE_TITLE`, `SITE_DESCRIPTION`)

## Raw HTML pages

- Any `.html` dropped under `public/` is served verbatim at the matching root
  path (`public/typst/index.html` → `/typst/`) and is **auto-discovered** into
  the home page (latest 2) and `/blog/` list — no registry to update.
- Metadata comes from the page's own `<head>`: `<title>`, and
  `<meta name="description|date|private">`. `private: true` (or a leading `_`
  in any path segment) keeps it out of the lists while leaving the URL live.
- Discovery lives in `src/lib/raw-pages.ts` (rescans `public/` on every call,
  so new files show up on refresh), merged with posts and manual external links
  by `src/lib/entries.ts` (used by `src/pages/index.astro` and
  `src/pages/blog/index.astro`).

## Typst → HTML pipeline

- Sources live in `typst/`; `scripts/build-typst.mjs` compiles them to
  `public/typst/` and injects the `<meta>` tags above. Leading `// title: …`
  style comments in the `.typ` file are the metadata source of truth.
- `npm run build:typst` (aliased to `prebuild`, so `npm run build` runs it).
  Skips silently when the `typst` binary is missing, and aborts without
  touching existing output when a file fails to compile. `typst` 0.15+ needs
  `--features html`; the script falls back for older versions.
- Generated `public/typst/` output **is committed** so CI (which has no
  `typst` binary) can deploy it.

## Dev-only notes

- Vite 7 snapshots `public/` at dev-server startup and refuses to serve
  directory-index URLs, so `astro.config.mjs` adds a dev-only `servePublicHtml`
  Vite plugin to make `/typst/` behave like production nginx. Files generated
  after startup (e.g. by `build:typst`) work without a restart because of it.
- `import.meta.glob` must **not** be pointed at `public/` — Vite blocks module
  imports from that directory in dev (works in build, 404s in dev).

## Orphaned files (ignore)

Root files `index.js`, `config.js`, `style.js`, and `components/` are leftover Next.js (Nobelium) theme files — not used by the Astro build. Do not edit them unless explicitly asked.

## Environment

`.envrc` contains legacy Notion API and ICP备案 env vars from a prior theme. Not consumed by the current Astro code.
