import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
});

const blogEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog/en' }),
  schema: postSchema,
});

const blogTr = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog/tr' }),
  schema: postSchema,
});

export const collections = { 'blog-en': blogEn, 'blog-tr': blogTr };
