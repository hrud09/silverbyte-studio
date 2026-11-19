import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { issueAdminLink } from '../src/lib/adminSignInLink.mjs';

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('Configure the studio database connection first.');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  const link = await issueAdminLink(db, 'terminal');
  console.log('Open this private link within 15 minutes:\n' + link.url);
} finally {
  await db.$disconnect();
}
