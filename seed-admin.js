import { db } from './src/db/client';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const email = 'brawlwithgw@gmail.com';
const rawPassword = '1stSS@2026';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return salt + ':' + derivedKey.toString('hex');
}

async function seed() {
  if (!db) {
    console.error('Database connection failed.');
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    console.log(`User ${email} already exists. Updating password...`);
    await db.update(users).set({ passwordHash: hashPassword(rawPassword) }).where(eq(users.email, email)).run();
    console.log('Password updated.');
    return;
  }

  console.log(`Creating user ${email}...`);
  await db.insert(users).values({
    email,
    passwordHash: hashPassword(rawPassword),
    role: 'owner',
  }).run();
  console.log('User created successfully.');
}

seed().catch(console.error);
