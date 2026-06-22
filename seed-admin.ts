import { db } from './src/db/client';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const admins = [
  { email: 'brawlwithgw@gmail.com', password: '1stSS@2026' },
  { email: 'shamolda123@gmail.com', password: '1stSS@2026' }
];

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return salt + ':' + derivedKey.toString('hex');
}

async function seed() {
  if (!db) {
    console.error('Database connection failed.');
    process.exit(1);
  }

  for (const admin of admins) {
    const existing = await db.select().from(users).where(eq(users.email, admin.email)).get();
    if (existing) {
      console.log(`User ${admin.email} already exists. Updating password...`);
      await db.update(users).set({ passwordHash: hashPassword(admin.password) }).where(eq(users.email, admin.email)).run();
      console.log(`Password updated for ${admin.email}.`);
    } else {
      console.log(`Creating user ${admin.email}...`);
      await db.insert(users).values({
        email: admin.email,
        passwordHash: hashPassword(admin.password),
        role: 'owner',
      }).run();
      console.log(`User ${admin.email} created successfully.`);
    }
  }
}

seed().catch(console.error);
