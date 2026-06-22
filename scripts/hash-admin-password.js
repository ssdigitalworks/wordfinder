#!/usr/bin/env node

/**
 * Generates an ADMIN_PASSWORD_HASH value for .env
 *
 * Usage:
 *   node scripts/hash-admin-password.js
 *
 * It will prompt for a password and output the hash to paste into .env.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';

const SCRYPT_KEYLEN = 64;

const rl = createInterface({
  input: process.stdin,
  output: process.stderr, // use stderr so stdout only has the hash
});

rl.question('Enter admin password: ', (password) => {
  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters.');
    process.exit(1);
  }

  const salt = randomBytes(32).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  const result = `${salt}:${hash}`;

  console.log(`\nADMIN_PASSWORD_HASH=${result}`);
  console.error('\nCopy the line above into your .env file.');

  rl.close();
});
