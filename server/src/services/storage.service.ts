import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
export interface StorageProvider {
  put(data: Buffer, mime: string): Promise<{ key: string; url: string }>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
const directory = resolve(env.UPLOAD_DIR);
const local: StorageProvider = {
  async put(data) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const key = randomUUID();
    await writeFile(resolve(directory, key), data, { mode: 0o600 });
    return { key, url: `local:${key}` };
  },
  async get(key) {
    return readFile(resolve(directory, key));
  },
  async remove(key) {
    await unlink(resolve(directory, key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  },
};
function s3Provider(): StorageProvider {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY)
    throw new Error('S3/R2 storage configuration is incomplete');
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  return {
    async put(data, mime) {
      const key = `taskflow/${randomUUID()}`;
      await client.send(
        new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: data, ContentType: mime }),
      );
      return { key, url: `s3://${env.S3_BUCKET}/${key}` };
    },
    async get(key) {
      const object = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      return Buffer.from(await object.Body!.transformToByteArray());
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    },
  };
}
function cloudinaryProvider(): StorageProvider {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)
    throw new Error('Cloudinary storage configuration is incomplete');
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return {
    put(data) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'raw', type: 'authenticated', folder: 'taskflow' },
          (error, result) =>
            error || !result
              ? reject(error ?? new Error('Upload failed'))
              : resolve({ key: result.public_id, url: result.secure_url }),
        );
        stream.end(data);
      });
    },
    async get(key) {
      const url = cloudinary.utils.private_download_url(key, '', {
        resource_type: 'raw',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 60,
      });
      const response = await fetch(url);
      if (!response.ok) throw new Error('File download failed');
      return Buffer.from(await response.arrayBuffer());
    },
    async remove(key) {
      await cloudinary.uploader.destroy(key, { resource_type: 'raw', type: 'authenticated' });
    },
  };
}
export function storage(provider = env.STORAGE_PROVIDER): StorageProvider {
  if (provider === 'local') return local;
  if (provider === 'cloudinary') return cloudinaryProvider();
  return s3Provider();
}
