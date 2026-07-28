import { Client } from 'minio';
import { randomUUID } from 'node:crypto';
const DEFAULT_PUBLIC_ENDPOINT = 'https://storage.kayliescreations.com';
export class MinIoBucketService {
    config;
    client;
    signingClient;
    constructor(config) {
        this.config = config;
        this.client = createClient(config, config.endpoint);
        this.signingClient = createClient(config, config.publicEndpoint ?? DEFAULT_PUBLIC_ENDPOINT);
    }
    async uploadPhoto(category, upload) {
        const key = `photos/${category}/${safeUniqueName(upload.originalName)}`;
        await this.client.putObject(this.config.publicBucket, key, upload.buffer, upload.buffer.length, { 'Content-Type': upload.mimeType });
        return { bucket: this.config.publicBucket, key, publicUrl: this.publicUrl(key) };
    }
    async deletePublicObject(key) {
        await this.client.removeObject(this.config.publicBucket, key);
    }
    async uploadPatternPdf(upload) {
        const key = `pdfs/patterns/${safeUniqueName(upload.originalName)}`;
        await this.client.putObject(this.config.privateBucket, key, upload.buffer, upload.buffer.length, { 'Content-Type': upload.mimeType });
        return { bucket: this.config.privateBucket, key };
    }
    async deletePatternPdf(key) {
        await this.client.removeObject(this.config.privateBucket, key);
    }
    async signPatternPdf(key, expiresInSeconds = 600) {
        const url = await this.signingClient.presignedGetObject(this.config.privateBucket, key, expiresInSeconds);
        return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) };
    }
    publicUrl(key) {
        const endpoint = this.config.publicEndpoint ?? DEFAULT_PUBLIC_ENDPOINT;
        return `${endpoint.replace(/\/$/, '')}/${this.config.publicBucket}/${key}`;
    }
}
export function createMinIoBucketService(env = process.env) {
    return new MinIoBucketService({
        endpoint: env.MINIO_ENDPOINT ?? 'http://bucket:9000',
        publicEndpoint: env.MINIO_PUBLIC_ENDPOINT ?? DEFAULT_PUBLIC_ENDPOINT,
        accessKey: env.MINIO_ACCESS_KEY ?? 'k_suite_minio',
        secretKey: env.MINIO_SECRET_KEY ?? 'k_suite_minio_password',
        publicBucket: env.MINIO_PUBLIC_BUCKET ?? 'public-assets',
        privateBucket: env.MINIO_PRIVATE_BUCKET ?? 'private-patterns',
        region: env.MINIO_REGION ?? 'us-east-1',
    });
}
function createClient(config, endpoint) {
    const endpointUrl = new URL(endpoint);
    return new Client({
        endPoint: endpointUrl.hostname,
        port: Number(endpointUrl.port || (endpointUrl.protocol === 'https:' ? 443 : 80)),
        useSSL: config.useSSL ?? endpointUrl.protocol === 'https:',
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        region: config.region ?? 'us-east-1',
    });
}
function safeUniqueName(originalName) {
    const safeName = originalName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
    return `${Date.now()}-${randomUUID()}-${safeName}`;
}
