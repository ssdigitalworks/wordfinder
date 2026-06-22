import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --------------------------------------------------------------------------
// Posts table — mirrors the content.config.ts schema 1:1
// --------------------------------------------------------------------------
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  content: text('content').notNull().default(''),
  image: text('image'),
  tags: text('tags').notNull().default('[]'), // stored as JSON string
  author: text('author').notNull().default('Editorial Team'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  pubDate: text('pub_date').notNull(),
  publishedDate: text('published_date'),
  updatedDate: text('updated_date'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  canonicalUrl: text('canonical_url'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => {
  return {
    publishedIdx: index('posts_published_idx').on(table.published),
  };
});

// --------------------------------------------------------------------------
// Settings table — generic key/value store for site configuration
// --------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// --------------------------------------------------------------------------
// Messages table — stores contact form submissions
// --------------------------------------------------------------------------
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
});

// --------------------------------------------------------------------------
// Users table — Role-Based Access Control (RBAC)
// --------------------------------------------------------------------------
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('viewer'), // owner, editor, moderator, viewer
  twoFactorSecret: text('two_factor_secret'),
  lastLogin: text('last_login'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// --------------------------------------------------------------------------
// Password Reset Tokens
// --------------------------------------------------------------------------
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => {
  return {
    userIdx: index('password_reset_tokens_user_idx').on(table.userId),
  };
});

// --------------------------------------------------------------------------
// Audit Logs table — Tracks important admin actions
// --------------------------------------------------------------------------
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  action: text('action').notNull(),
  targetId: text('target_id'),
  ipAddress: text('ip_address'),
  details: text('details'),
  timestamp: text('timestamp')
    .notNull()
    .default(sql`(datetime('now'))`),
});
