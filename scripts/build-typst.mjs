#!/usr/bin/env node
/**
 * 把 `typst/` 下的 `.typ` 编译成 HTML 放进 `public/typst/`。
 *
 * 这样 typst 文档就同时具备两件事：
 *   1. 能被站点直接访问（`public/` 下的文件原样复制到 dist）
 *   2. 能被首页/列表自动发现（见 `src/lib/raw-pages.ts`）
 *
 * 用法：
 *   npm run build:typst    # 手动编译
 *   npm run build          # prebuild 自动跑一遍
 *
 * 没装 typst 时直接跳过（CI 上没有 typst，用仓库里已提交的产物即可）。
 * 装了 typst 但某个文件编译失败时会报错退出，避免静默产出旧页面。
 *
 * 元数据写在 .typ 文件开头的注释块里，会被注入到生成的 HTML <head>：
 *
 *   // title: Typst 排版示例
 *   // description: 用 typst 导出的 HTML 文档
 *   // date: 2025-01-01
 *   // private: true
 *
 *   #set document(title: "…")   // 生成 <title>，会被上面的 title 覆盖
 *
 * 输出路径约定（`main.typ` / `index.typ` 当作该目录的首页）：
 *   typst/main.typ          → public/typst/index.html        → /typst/
 *   typst/notes/a.typ       → public/typst/notes/a/index.html → /typst/notes/a/
 *   typst/notes/main.typ    → public/typst/notes/index.html  → /typst/notes/
 * 目录内外不以 `.typ` 结尾的文件（图片等）会原样复制到对应输出目录。
 * 文件名以 `_` 开头的会被跳过。
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "typst");
const OUT_DIR = path.join(ROOT, "public", "typst");
const URL_PREFIX = "/typst";

const log = (msg) => console.log(`[typst] ${msg}`);
const warn = (msg) => console.warn(`[typst] ${msg}`);

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

/** 读取文件开头的 `// key: value` 注释块，遇到第一条非注释行就停。 */
function parseDirectives(source) {
  const directives = {};

  for (const line of source.split(/\r?\n/)) {
    if (line.trim() === "") continue;

    const match = line.match(/^\s*\/\/\s*([A-Za-z_-]+)\s*:\s*(.*)$/);
    if (!match) break;

    directives[match[1].toLowerCase()] = match[2].trim();
  }

  return directives;
}

function insertIntoHead(html, snippet) {
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${snippet}</head>`);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (tag) => `${tag}${snippet}`);
  }
  // typst 一定会输出 <head>，这里只是兜底
  return snippet + html;
}

function applyMetadata(html, name, directives) {
  let out = html;

  // typst 只会从 `#set document(title: ...)` 生成 <title>；
  // 这里允许用注释指令覆盖，并在完全没有 <title> 时补一个兜底，
  // 免得首页卡片的标题退化成文件名。
  const titleTag = out.match(/<title[^>]*>[\s\S]*?<\/title>/i);

  if (titleTag) {
    if (directives.title) {
      out = out.replace(
        titleTag[0],
        `<title>${escapeHtml(directives.title)}</title>`,
      );
    }
  } else {
    out = insertIntoHead(
      out,
      `<title>${escapeHtml(directives.title ?? name)}</title>`,
    );
  }

  // typst 没有描述/日期语法，只能注入
  const metas = [
    ["description", directives.description],
    ["date", directives.date],
    ["private", directives.private && "true"],
  ]
    .filter(([, value]) => Boolean(value))
    .map(
      ([key, value]) =>
        `<meta name="${key}" content="${escapeAttr(value)}">`,
    );

  if (metas.length > 0) out = insertIntoHead(out, metas.join(""));

  return out;
}

/** 输出文件相对 `public/typst/` 的路径（由 href 反推，保证两者一致）。 */
function outputRelativePath(relativeSource) {
  return path.join(
    publicHref(relativeSource).slice(URL_PREFIX.length).replace(/^\//, ""),
    "index.html",
  );
}

function publicHref(relativeSource) {
  const parsed = path.parse(relativeSource);
  const isIndex = parsed.name === "main" || parsed.name === "index";
  const segments = [parsed.dir, isIndex ? "" : parsed.name].filter(Boolean);

  return `${URL_PREFIX}/${segments.join("/")}${segments.length > 0 ? "/" : ""}`;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) return [];

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() ? [full] : [];
  });
}

function typstVersion() {
  try {
    return execFileSync("typst", ["--version"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/** typst 0.15+ 需要 `--features html`，老版本加了会报未知参数，所以试一次再回退。 */
function compile(source, destination) {
  const base = ["compile", "--format", "html", source, destination];

  try {
    execFileSync("typst", ["compile", "--features", "html", ...base.slice(1)], {
      stdio: "pipe",
    });
    return;
  } catch (error) {
    const output = `${error.stderr ?? ""}${error.stdout ?? ""}`;
    if (!output.includes("--features")) {
      throw new Error(output.trim() || error.message);
    }
  }

  execFileSync("typst", base, { stdio: "pipe" });
}

function main() {
  if (!statSync(SRC_DIR, { throwIfNoEntry: false })?.isDirectory()) {
    log("没有 typst/ 目录，跳过");
    return;
  }

  const version = typstVersion();
  if (version === null) {
    warn("没找到 typst 命令，跳过（CI 上用仓库里已提交的 public/typst/ 产物）");
    return;
  }

  const files = walk(SRC_DIR);
  const sources = files.filter((file) => file.endsWith(".typ"));

  if (sources.length === 0) {
    log("typst/ 下没有 .typ 文件，跳过");
    return;
  }

  // 先全部编译到临时目录，任何一个失败都不动现有产物
  const staging = mkdtempSync(path.join(tmpdir(), "typst-html-"));
  const generated = [];

  try {
    for (const source of sources) {
      const relative = path.relative(SRC_DIR, source);
      const destination = path.join(staging, outputRelativePath(relative));

      mkdirSync(path.dirname(destination), { recursive: true });

      try {
        compile(source, destination);
      } catch (error) {
        throw new Error(`编译失败：typst/${relative}\n${error.message}`);
      }

      const directives = parseDirectives(readFileSync(source, "utf8"));
      const html = applyMetadata(
        readFileSync(destination, "utf8"),
        path.parse(relative).name,
        directives,
      );

      writeFileSync(destination, html);
      generated.push({
        from: `typst/${relative}`,
        href: publicHref(relative),
        title: directives.title ?? path.parse(relative).name,
        date: directives.date,
        private: Boolean(directives.private),
      });
    }

    // 图片等附属文件原样带上
    for (const file of files) {
      if (file.endsWith(".typ")) continue;

      const relative = path.relative(SRC_DIR, file);
      const destination = path.join(staging, relative);

      mkdirSync(path.dirname(destination), { recursive: true });
      cpSync(file, destination);
    }

    rmSync(OUT_DIR, { recursive: true, force: true });
    mkdirSync(path.dirname(OUT_DIR), { recursive: true });
    cpSync(staging, OUT_DIR, { recursive: true });
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }

  log(`${version} → public/typst/`);
  for (const page of generated) {
    const flags = [
      page.date ? `date=${page.date}` : "无日期（排在最后）",
      page.private ? "private" : null,
    ].filter(Boolean);

    log(`  ${page.from}  →  ${page.href}  「${page.title}」 (${flags.join(", ")})`);
  }
  log(`完成，共 ${generated.length} 个页面`);
}

try {
  main();
} catch (error) {
  warn(error instanceof Error ? error.message : String(error));
  warn("已保留上一次的 public/typst/ 产物");
  process.exit(1);
}
