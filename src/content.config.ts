import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    publishedDate: z.date().optional(),
    updatedDate: z.date().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Editorial Team'),
  }),
});

export const collections = { blog };
