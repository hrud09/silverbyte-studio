const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

module.exports = {
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
