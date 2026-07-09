import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // 空字符串视为 private（草稿/不公开），归一化为 undefined；
      // 缺省或写 '' 都表示不展示在站点列表、单页路由、RSS 中。
      pubDate: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.coerce.date().optional(),
      ),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.optional(image()),
    }),
});

export const collections = { blog };
