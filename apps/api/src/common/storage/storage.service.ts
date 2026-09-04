import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Client } from "minio";

const UPLOAD_URL_TTL_SECS = 5 * 60;
const PUBLIC_PREFIXES = ["avatars", "logos"];

/**
 * One shared MinIO bucket for the whole deployment. Only the `avatars/` and
 * `logos/` prefixes are made public-read (via an explicit bucket policy) since
 * those URLs are already rendered directly as <img src> all over the app;
 * anything else ever written to this bucket in the future stays private by
 * default.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = process.env.MINIO_BUCKET ?? "abms-files";
  private readonly client = new Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ROOT_USER ?? "abms-storage",
    secretKey: process.env.MINIO_ROOT_PASSWORD ?? "change-me",
  });

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
      }
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(this.publicReadPolicy()));
    } catch (err) {
      // Storage is only exercised by avatar/logo upload — don't crash API boot
      // if MinIO is briefly unreachable (e.g. container still starting).
      this.logger.error(`Failed to initialize MinIO bucket "${this.bucket}": ${(err as Error).message}`);
    }
  }

  private publicReadPolicy() {
    return {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: PUBLIC_PREFIXES.map((prefix) => `arn:aws:s3:::${this.bucket}/${prefix}/*`),
        },
      ],
    };
  }

  async presignedPutUrl(key: string): Promise<string> {
    return this.client.presignedPutObject(this.bucket, key, UPLOAD_URL_TTL_SECS);
  }

  publicUrl(key: string): string {
    const base = process.env.MINIO_PUBLIC_BASE_URL ?? `${this.useSSL ? "https" : "http"}://${this.endpoint}:${this.port}`;
    return `${base}/${this.bucket}/${key}`;
  }

  private get endpoint() {
    return process.env.MINIO_ENDPOINT ?? "localhost";
  }

  private get port() {
    return Number(process.env.MINIO_PORT) || 9000;
  }

  private get useSSL() {
    return process.env.MINIO_USE_SSL === "true";
  }
}
