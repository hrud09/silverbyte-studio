import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import nextEnv from '@next/env';
import pg from 'pg';
import bcrypt from 'bcryptjs';

async function main() {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    throw new Error('Run this command in an interactive terminal.');
  }
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Configure the studio database connection first.');

  const terminal = createInterface({
    input: process.stdin,
    output: new Writable({ write(_chunk, _encoding, done) { done(); } }),
    terminal: true,
    historySize: 0,
  });
  terminal.on('SIGINT', () => {
    terminal.close();
    process.exit(130);
  });

  let password;
  try {
    process.stderr.write('New shared admin password: ');
    password = await terminal.question('');
    if (password.length < 6 || bcrypt.truncates(password)) {
      throw new Error('Use at least 6 characters and at most 72 UTF-8 bytes.');
    }
    process.stderr.write('\nConfirm new password: ');
    if (password !== await terminal.question('')) throw new Error('Passwords do not match.');
  } finally {
    terminal.close();
    process.stderr.write('\n');
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const admins = await client.query('SELECT id FROM "User" WHERE role = $1 LIMIT 2', ['ADMIN']);
    if (admins.rowCount !== 1) throw new Error('Expected exactly one studio admin account.');
    const hash = await bcrypt.hash(password, 10);
    const result = await client.query(
      'UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2 AND role = $3',
      [hash, admins.rows[0].id, 'ADMIN'],
    );
    if (result.rowCount !== 1) throw new Error('The admin account changed. Try again.');
    console.log('Shared admin password updated.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
