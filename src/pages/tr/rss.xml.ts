import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getDict } from '../../i18n';

export async function GET(context: APIContext) {
  const dict = getDict('tr');
  const posts = (await getCollection('blog-tr'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'ethersec',
    description: dict.rss.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/tr/blog/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>tr-tr</language>',
  });
}
