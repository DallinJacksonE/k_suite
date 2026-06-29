import { Client } from 'minio';
import { randomUUID } from 'node:crypto';
import type { PatternPdfUploadResult, ProductPhotoUploadResult } from '@k_suite/shared';

export type PhotoCategory = 'product' | 'blog';

export interface BucketUpload {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface BucketServiceConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  publicBucket: string;
  privateBucket: string;
  useSSL?: boolean;
}

export class MinIoBucketService {
  private readonly client: Client;

  constructor(private readonly config: BucketServiceConfig) {
    const endpointUrl = new URL(config.endpoint);
    this.client = new Client({
      endPoint: endpointUrl.hostname,
      port: Number(endpointUrl.port || (endpointUrl.protocol === 'https:' ? 443 : 80)),
      useSSL: config.useSSL ?? endpointUrl.protocol === 'https:',
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  async uploadPhoto(category: PhotoCategory, upload: BucketUpload): Promise<ProductPhotoUploadResult> {
    const key = `photos/${category}/${safeUniqueName(upload.originalName)}`;
    await this.client.putObject(this.config.publicBucket, key, upload.buffer, upload.buffer.length, { 'Content-Type': upload.mimeType });
    return { bucket: this.config.publicBucket, key, publicUrl: this.publicUrl(key) };
  }

  async deletePublicObject(key: string): Promise<void> {
    await this.client.removeObject(this.config.publicBucket, key);
  }

  async uploadPatternPdf(upload: BucketUpload): Promise<PatternPdfUploadResult> {
    const key = `pdfs/patterns/${safeUniqueName(upload.originalName)}`;
    await this.client.putObject(this.config.privateBucket, key, upload.buffer, upload.buffer.length, { 'Content-Type': upload.mimeType });
    return { bucket: this.config.privateBucket, key };
  }

  async deletePatternPdf(key: string): Promise<void> {
    await this.client.removeObject(this.config.privateBucket, key);
  }

  private publicUrl(key: string): string {
    return `${this.config.endpoint.replace(/\/$/, '')}/${this.config.publicBucket}/${key}`;
  }
}

export function createMinIoBucketService(env: NodeJS.ProcessEnv = process.env): MinIoBucketService {
  return new MinIoBucketService({
    endpoint: env.MINIO_ENDPOINT ?? 'http://bucket:9000',
    accessKey: env.MINIO_ACCESS_KEY ?? 'k_suite_minio',
    secretKey: env.MINIO_SECRET_KEY ?? 'k_suite_minio_password',
    publicBucket: env.MINIO_PUBLIC_BUCKET ?? 'public-assets',
    privateBucket: env.MINIO_PRIVATE_BUCKET ?? 'private-patterns',
  });
}

function safeUniqueName(originalName: string): string {
  const safeName = originalName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
  return `${Date.now()}-${randomUUID()}-${safeName}`;
}
