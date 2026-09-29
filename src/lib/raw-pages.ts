/**
 * 自动发现 `public/` 下的裸 HTML 页面（typst 导出、生成报告等），
 * 让它们能出现在首页/列表里，而不需要在哪儿手动登记一遍。
 *
 * 用 `fs` 而不是 `import.meta.glob`：Vite 在 dev 下禁止从 public 目录 import
 * 模块（glob 只会翻译成 `/public/x.html?raw` 然后 404），build 才会成功。
 * 改成每次调用都重新扫盘，代价极小，好处是 dev 下新增/删除文件刷新即生效。
 *
 * 约定（都写在 HTML 自己的 <head> 里，不需要额外清单）：
 *   <title>                                 → 卡片标题（缺省用文件名/目录名）
 *   <meta name="description" content="..."> → 卡片描述（可省略）
 *   <meta name="date" content="YYYY-MM-DD"> → 排序用日期（可省略，省略则排最后）
 *   <meta name="private" content="true">    → 不登记进列表，但 URL 仍可访问
 *
 * 另外：文件名或目录名以 `_` 开头的会被跳过（同样只是不登记，仍可访问）。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type RawPage = {
  title: string;
  /** 站内路径，如 "/typst/" 或 "/reports/2025-q1.html" */
  href: string;
  description?: string;
  pubDate?: Date;
};

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

/** 递归收集所有 .html 的绝对路径；跟随符号链接目录。 */
function collectHtmlFiles(dir: string): string[] {
  let files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    let isDirectory = entry.isDirectory();

    if (entry.isSymbolicLink()) {
      try {
        isDirectory = statSync(full).isDirectory();
      } catch {
        continue; // 断链，跳过
      }
    }

    if (isDirectory) files = files.concat(collectHtmlFiles(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }

  return files;
}

/** 把 "/abs/path/public/demo/index.html" 映射成 "/demo/"。 */
function toHref(file: string): string {
  return file
    .slice(PUBLIC_DIR.length)
    .split(path.sep)
    .join("/")
    .replace(/(^|\/)index\.html$/, "$1");
}

function fallbackTitle(href: string): string {
  return (
    href
      .replace(/\/$/, "")
      .replace(/\.html$/, "")
      .split("/")
      .filter(Boolean)
      .pop() ?? href
  );
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function extract(html: string, re: RegExp): string | undefined {
  const raw = html.match(re)?.[1]?.trim();
  return raw ? decodeEntities(raw) : undefined;
}

/** 兼容 <meta name="x" content="y"> 和属性顺序反过来的写法。 */
function meta(html: string, name: string): string | undefined {
  const first = new RegExp(
    `<meta\\s+(?:name|property)=["']${name}["'][^>]*?content=["']([^"']*)["']`,
    "i",
  );
  const reversed = new RegExp(
    `<meta\\s+content=["']([^"']*)["'][^>]*?(?:name|property)=["']${name}["']`,
    "i",
  );
  return extract(html, first) ?? extract(html, reversed);
}

function isTruthy(value: string | undefined): boolean {
  return value !== undefined && /^(true|1|yes)$/i.test(value);
}

/** 扫描 public/，返回可登记到列表中的裸 HTML 页面，按日期倒序。 */
export function rawPages(): RawPage[] {
  if (!statSync(PUBLIC_DIR, { throwIfNoEntry: false })?.isDirectory()) return [];

  const pages: RawPage[] = [];

  for (const file of collectHtmlFiles(PUBLIC_DIR)) {
    const rel = file.slice(PUBLIC_DIR.length).split(path.sep);

    // `_` 前缀 = 不登记（比如只给某个页面用的局部片段）
    if (rel.some((segment) => segment.startsWith("_"))) continue;

    const html = readFileSync(file, "utf8");
    if (isTruthy(meta(html, "private"))) continue;

    const href = toHref(file);
    const date = meta(html, "date");
    const parsed = date ? new Date(date) : undefined;

    pages.push({
      href,
      title:
        extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? fallbackTitle(href),
      description: meta(html, "description"),
      pubDate: parsed && !Number.isNaN(parsed.valueOf()) ? parsed : undefined,
    });
  }

  return pages.sort(
    (a, b) => (b.pubDate?.valueOf() ?? 0) - (a.pubDate?.valueOf() ?? 0),
  );
}
