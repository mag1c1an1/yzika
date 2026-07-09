import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

/**
 * pubDate 为空字符串（被 schema 归一化为 undefined）的文章视为 private，
 * 不出现在首页、博客列表、单页路由和 RSS 中。
 */
export function isPostVisible(post: BlogPost): boolean {
  return Boolean(post.data.pubDate);
}

/** 返回所有可见文章，按 pubDate 倒序（private 已过滤掉）。 */
export async function visibleBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection("blog");
  return posts
    .filter(isPostVisible)
    .sort((a, b) => b.data.pubDate!.valueOf() - a.data.pubDate!.valueOf());
}
