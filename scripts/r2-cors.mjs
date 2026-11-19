#!/usr/bin/env node
/**
 * Apply the CORS policy the R2 bucket needs for direct browser uploads.
 *
 * The admin console PUTs files straight to a presigned R2 URL, which is a cross-origin
 * request: without this policy the browser blocks it before a byte is sent.
 *
 *   node scripts/r2-cors.mjs https://silverbytestudio.com https://www.silverbytestudio.com
 *
 * Reads R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET from the
 * environment or .env.local. http://localhost:3000 is always included for development.
 */
import dotenv from 'dotenv';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY or R2_BUCKET.');
  process.exit(1);
}

const origins = [...new Set(['http://localhost:3000', ...process.argv.slice(2).map((o) => o.replace(/\/+$/, ''))])];
if (origins.length === 1) {
  console.warn('No site origins given; only http://localhost:3000 will be allowed to upload.');
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: R2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ['PUT', 'GET', 'HEAD'],
          AllowedHeaders: ['Content-Type', 'Content-Disposition'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);

const applied = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
console.log(`CORS policy on "${R2_BUCKET}":`);
console.log(JSON.stringify(applied.CORSRules, null, 2));
