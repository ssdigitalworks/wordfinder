import type { APIRoute } from 'astro';
import { db } from '@db/client';
import { posts } from '@db/schema';
import { eq, desc } from 'drizzle-orm';
import { SITE_URL } from '@lib/config';

export const prerender = false;

export const GET: APIRoute = async () => {
  let allPosts: (typeof posts.$inferSelect)[] = [];
  try {
    if (db) {
      allPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.published, true))
        .orderBy(desc(posts.pubDate))
        .all();
    }
  } catch (e) {
    console.error('Error fetching posts for sitemap:', e);
  }

  // Fallback if DB is empty or fails
  if (allPosts.length === 0) {
    const localPosts = import.meta.glob('../../content/blog/*.md', { eager: true });
    allPosts = Object.entries(localPosts).map(([path, p]: [string, any]) => ({
      slug: path.split('/').pop()?.replace('.md', '') || '',
      updatedDate: p.frontmatter.updatedDate || p.frontmatter.pubDate || new Date(),
      pubDate: p.frontmatter.pubDate || new Date(),
    })) as unknown as (typeof posts.$inferSelect)[];
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${allPosts
    .map(
      (post) => `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedDate || post.pubDate || new Date()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
