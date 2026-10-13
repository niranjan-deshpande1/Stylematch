import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Uploaded photos are stored in a private S3-compatible bucket (Cloudflare R2
// in production; AWS S3, Backblaze B2 and others work the same way). When no
// bucket is configured (local development), they go to ./uploads instead.
// Either way the browser never talks to storage directly: images are served
// through GET /api/images/:key, which checks that the viewer owns the image.

const IMAGE_URL_PREFIX = "/api/images/";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Keys are always "<uuid>.<ext>", which rules out path tricks like "../".
const KEY_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const SUPPORTED_IMAGE_TYPES = Object.keys(EXTENSIONS);

interface ImageBackend {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

class S3Backend implements ImageBackend {
  constructor(
    private client: S3Client,
    private bucket: string,
  ) {}

  async put(key: string, data: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
  }

  async get(key: string) {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (err) {
      if (err instanceof NoSuchKey) return null;
      throw err;
    }
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

class LocalBackend implements ImageBackend {
  constructor(private dir: string) {}

  async put(key: string, data: Buffer) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(path.join(this.dir, key), data);
  }

  async get(key: string) {
    try {
      return await fs.readFile(path.join(this.dir, key));
    } catch {
      return null;
    }
  }

  async remove(key: string) {
    await fs.rm(path.join(this.dir, key), { force: true });
  }
}

function createBackend(): ImageBackend {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
    const client = new S3Client({
      // Some providers ignore the region, but the SDK requires one.
      region: process.env.S3_REGION ?? "auto",
      endpoint: S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
      // Newer SDK versions add checksums that not every S3-compatible provider accepts.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    return new S3Backend(client, S3_BUCKET);
  }
  return new LocalBackend(path.resolve(process.env.UPLOAD_DIR ?? "uploads"));
}

const backend = createBackend();

/** Works out the image type from the file's first bytes instead of trusting the upload. */
function detectImageType(data: Buffer): string | null {
  if (data.length < 12) return null;
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Stores an image and returns the URL to save on the database row.
 * Returns null if the file isn't actually a JPEG, PNG, or WebP.
 */
export async function saveImage(data: Buffer): Promise<string | null> {
  const mimeType = detectImageType(data);
  if (!mimeType) return null;
  const ext = EXTENSIONS[mimeType];
  const key = `${crypto.randomUUID()}.${ext}`;
  await backend.put(key, data, mimeType);
  return IMAGE_URL_PREFIX + key;
}

/** Returns the key for one of our image URLs, or null if it isn't one. */
export function keyFromUrl(imageUrl: string): string | null {
  if (!imageUrl.startsWith(IMAGE_URL_PREFIX)) return null;
  const key = imageUrl.slice(IMAGE_URL_PREFIX.length);
  return isValidKey(key) ? key : null;
}

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function contentTypeForKey(key: string): string {
  return CONTENT_TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";
}

export async function loadImage(imageUrl: string): Promise<{ data: Buffer; contentType: string } | null> {
  const key = keyFromUrl(imageUrl);
  if (!key) return null;
  const data = await backend.get(key);
  return data ? { data, contentType: contentTypeForKey(key) } : null;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  const key = keyFromUrl(imageUrl);
  if (key) await backend.remove(key);
}
