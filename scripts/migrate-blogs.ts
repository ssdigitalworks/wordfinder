import fs from 'fs';
import path from 'path';
import { db } from '../src/db/client';
import { posts } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Basic regex to extract YAML frontmatter
const frontmatterRegex = /^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/;

function parseMarkdown(content: string) {
  const match = content.match(frontmatterRegex);
  if (!match) return { data: {}, content: content.trim() };

  const frontmatterString = match[1];
  const markdownBody = match[2].trim();

  const data: Record<string, any> = {};
  
  // simple key-value parser for basic yaml
  const lines = frontmatterString.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      let value: any = line.slice(colonIdx + 1).trim();
      
      // remove quotes
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      
      // parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value.replace(/'/g, '"'));
        } catch(e) {
           // fallback split
           value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''));
        }
      }
      
      // parse dates
      if (key === 'pubDate' || key === 'updatedDate') {
        value = new Date(value).toISOString();
      }

      data[key] = value;
    }
  }

  return { data, content: markdownBody };
}

async function migrate() {
  const blogDir = path.join(process.cwd(), 'src/content/blog');
  if (!fs.existsSync(blogDir)) {
    console.log('Blog directory does not exist.');
    return;
  }

  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files to migrate.`);

  if (!db) {
    console.error('Database connection failed.');
    process.exit(1);
  }

  for (const file of files) {
    const slug = file.replace('.md', '');
    const rawContent = fs.readFileSync(path.join(blogDir, file), 'utf-8');
    const { data, content } = parseMarkdown(rawContent);

    const title = data.title || 'Untitled';
    const description = data.description || '';
    const image = data.heroImage || data.image || '';
    const pubDate = data.pubDate || new Date().toISOString();
    const tags = Array.isArray(data.tags) ? data.tags : [];

    // Check if post already exists
    const existing = await db.select().from(posts).where(eq(posts.slug, slug)).get();
    if (existing) {
      console.log(`Post [${slug}] already exists. Skipping.`);
      continue;
    }

    console.log(`Inserting [${slug}]...`);
    await db.insert(posts).values({
      title,
      slug,
      description,
      content,
      image,
      tags: JSON.stringify(tags),
      author: 'Editorial Team',
      published: true,
      pubDate,
    }).run();
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
