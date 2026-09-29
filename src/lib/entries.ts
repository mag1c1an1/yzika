import { visibleBlogPosts } from "../content/utils";
import { extraPages } from "../data/extra-pages";
import { rawPages } from "./raw-pages";

export type SiteEntry = {
  title: string;
  /** 站内路径（如 "/blog/foo/"）或完整外链 */
  href: string;
  description?: string;
  pubDate?: Date;
};

/**
 * 首页/列表的统一数据源，按 pubDate 倒序：
 *   1. content collection 里的文章（private 已过滤）
 *   2. `public/` 下自动发现的裸 HTML（见 lib/raw-pages.ts）
 *   3. `data/extra-pages.ts` 里手动登记的条目（主要给外链用）
 */
export async function siteEntries(): Promise<SiteEntry[]> {
  const posts = await visibleBlogPosts();

  return [
    ...posts.map((post) => ({
      title: post.data.title,
      href: `/blog/${post.id}/`,
      description: post.data.description,
      pubDate: post.data.pubDate,
    })),
    ...rawPages(),
    ...extraPages,
  ].sort((a, b) => (b.pubDate?.valueOf() ?? 0) - (a.pubDate?.valueOf() ?? 0));
}
