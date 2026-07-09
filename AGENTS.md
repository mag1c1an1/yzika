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

## Orphaned files (ignore)

Root files `index.js`, `config.js`, `style.js`, and `components/` are leftover Next.js (Nobelium) theme files — not used by the Astro build. Do not edit them unless explicitly asked.

## Environment

`.envrc` contains legacy Notion API and ICP备案 env vars from a prior theme. Not consumed by the current Astro code.
