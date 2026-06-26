import { pgTable, text, integer, boolean, bigint, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --------------------------------------------------------------------------
// Posts table — mirrors the content.config.ts schema 1:1
// --------------------------------------------------------------------------
export const posts = pgTable('posts', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  content: text('content').notNull().default(''),
  image: text('image'),
  tags: text('tags').notNull().default('[]'), // stored as JSON string
  author: text('author').notNull().default('Editorial Team'),
  published: boolean('published').notNull().default(false),
  pubDate: text('pub_date').notNull(),
  publishedDate: text('published_date'),
  updatedDate: text('updated_date'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  canonicalUrl: text('canonical_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    publishedIdx: index('posts_published_idx').on(table.published),
  };
});

// --------------------------------------------------------------------------
// Settings table — generic key/value store for site configuration
// --------------------------------------------------------------------------
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// --------------------------------------------------------------------------
// Messages table — stores contact form submissions
// --------------------------------------------------------------------------
export const messages = pgTable('messages', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  read: boolean('read').notNull().default(false),
});

// --------------------------------------------------------------------------
// Users table — Role-Based Access Control (RBAC)
// --------------------------------------------------------------------------
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('viewer'), // owner, editor, moderator, viewer
  twoFactorSecret: text('two_factor_secret'),
  lastLogin: text('last_login'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// --------------------------------------------------------------------------
// Password Reset Tokens
// --------------------------------------------------------------------------
export const passwordResetTokens = pgTable('password_reset_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    userIdx: index('password_reset_tokens_user_idx').on(table.userId),
  };
});

// --------------------------------------------------------------------------
// Audit Logs table — Tracks important admin actions
// --------------------------------------------------------------------------
export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  userId: bigint('user_id', { mode: 'bigint' }),
  action: text('action').notNull(),
  targetId: text('target_id'),
  ipAddress: text('ip_address'),
  details: text('details'),
  timestamp: timestamp('timestamp', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
