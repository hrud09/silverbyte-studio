const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

// Vercel/Neon integrations may expose the connection string under other names.
// Prefer a direct (non-pooled) URL for schema pushes when DATABASE_URL isn't set.
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

module.exports = {
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: databaseUrl,
  },
};
