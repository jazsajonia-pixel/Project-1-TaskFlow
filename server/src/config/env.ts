import 'dotenv/config';
import { z } from 'zod';
export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    DATABASE_URL: z.string().min(1),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    SERVER_URL: z.string().url().default('http://localhost:4000'),
    SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    STORAGE_PROVIDER: z.enum(['local', 's3', 'r2', 'cloudinary']).default('local'),
    UPLOAD_DIR: z.string().default('./uploads'),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default('auto'),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default('TaskFlow <noreply@example.com>'),
  })
  .parse(process.env);
if (env.NODE_ENV === 'production') {
  if (!env.CLIENT_URL.startsWith('https://')) {
    console.warn('Production warning: CLIENT_URL should start with https://');
  }
  if (!env.SMTP_HOST) {
    console.warn(
      'Production warning: SMTP_HOST is not configured; email delivery will be simulated locally.',
    );
  }
}
