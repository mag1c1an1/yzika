/**
 * 手动登记的「站外/特殊」条目，主要给外链用。
 *
 * 注意：放在 `public/` 下的裸 HTML **不需要**在这里登记，
 * `src/lib/raw-pages.ts` 会自动扫描 `public/` 目录下所有 .html：
 *   - 标题取 `<title>`
 *   - 描述取 `<meta name="description">`
 *   - 日期取 `<meta name="date" content="YYYY-MM-DD">`
 *   - 不想登记的页面加 `<meta name="private" content="true">`
 *     （或把文件/目录名以 `_` 开头），URL 依然能访问
 *
 * 这个文件只用来补充裸 HTML 覆盖不到的情况：外部链接、需要手工排序的条目等。
 */
export type ExtraPage = {
  title: string;
  /** 站内路径（如 "/typst/"）或完整外链 */
  href: string;
  description?: string;
  /** 用于排序；不填则排在所有有日期的条目之后 */
  pubDate?: Date;
};

export const extraPages: ExtraPage[] = [
  // {
  //   title: "我的 GitHub",
  //   href: "https://github.com/mag1cian",
  //   description: "代码都在这",
  //   pubDate: new Date("2025-01-01"),
  // },
];
