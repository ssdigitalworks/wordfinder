#!/usr/bin/env node

/**
 * Migration script to import posts from src/content/blog markdown files
 * into the Turso database.
 *
 * Usage:
 *   node scripts/migrate-posts.js
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createClient } from '@libsql/client';

// Simple parser for .env file
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    }
  });
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('Error: TURSO_DATABASE_URL is not set in your .env file or environment.');
  process.exit(1);
}

console.log('Connecting to database:', url);
const client = createClient({
  url,
  authToken: authToken || undefined,
});

const blogDir = path.join('src', 'content', 'blog');
if (!fs.existsSync(blogDir)) {
  console.error(`Error: Content directory ${blogDir} does not exist.`);
  process.exit(1);
}

async function migrate() {
  try {
    const files = fs.readdirSync(blogDir).filter((file) => file.endsWith('.md'));
    console.log(`Found ${files.length} posts to migrate...`);

    for (const file of files) {
      const filePath = path.join(blogDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);

      const slug = file.replace(/\.md$/, '');
      const title = data.title || 'Untitled Post';
      const description = data.description || '';
      const image = data.image || null;
      const tags = JSON.stringify(data.tags || []);
      const author = data.author || 'Editorial Team';
      const published = 1; // default to published
      
      // Handle pubDate formatting
      let pubDate = new Date().toISOString();
      if (data.pubDate) {
        try {
          pubDate = new Date(data.pubDate).toISOString();
        } catch {
          pubDate = String(data.pubDate);
        }
      }

      console.log(`Migrating: "${title}" (slug: ${slug})`);

      // Check if post already exists
      const existing = await client.execute({
        sql: 'SELECT id FROM posts WHERE slug = ?',
        args: [slug],
      });

      if (existing.rows.length > 0) {
        console.log(`  -> Already exists, updating...`);
        await client.execute({
          sql: `
            UPDATE posts 
            SET title = ?, description = ?, content = ?, image = ?, tags = ?, author = ?, published = ?, pub_date = ?, updated_at = datetime('now')
            WHERE slug = ?
          `,
          args: [title, description, content, image, tags, author, published, pubDate, slug],
        });
      } else {
        console.log(`  -> Creating new row...`);
        await client.execute({
          sql: `
            INSERT INTO posts (title, slug, description, content, image, tags, author, published, pub_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `,
          args: [title, slug, description, content, image, tags, author, published, pubDate],
        });
      }
    }

    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.close();
  }
}

migrate();
