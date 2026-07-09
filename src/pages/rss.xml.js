import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import { isPostVisible } from "../content/utils";

export async function GET(context) {
  const posts = (await getCollection("blog")).filter(isPostVisible);
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
