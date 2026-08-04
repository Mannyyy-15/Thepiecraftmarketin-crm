import "server-only";

import crypto from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);

interface StorageConfiguration {
  bucket: string;
  client: S3Client;
}

function getStorageConfiguration(): StorageConfiguration | null {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const region = process.env.OBJECT_STORAGE_REGION;
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return {
    bucket,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

/**
 * Returns "clean" | "skipped" so callers can record the real scan outcome
 * instead of always writing "clean" metadata, whether or not scanning
 * actually happened.
 */
async function assertFileIsClean(
  data: Uint8Array,
  fileName: string,
  mimeType: string,
  requireScan: boolean
): Promise<"clean" | "skipped"> {
  const scannerUrl = process.env.FILE_SCANNER_URL;
  const scannerToken = process.env.FILE_SCANNER_TOKEN;
  if (!scannerUrl || !scannerToken) {
    if (process.env.NODE_ENV === "production" && requireScan) {
      throw new Error("Malware scanning is not configured.");
    }
    return "skipped";
  }

  const response = await fetch(scannerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${scannerToken}`,
      "Content-Type": mimeType,
      "X-File-Name": encodeURIComponent(fileName),
    },
    body: Buffer.from(data),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("The file scanner is unavailable.");
  const result = (await response.json()) as { clean?: boolean };
  if (result.clean !== true) throw new Error("The file did not pass security scanning.");
  return "clean";
}

function safeExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  return match ? `.${match[1]}` : "";
}

export async function uploadPrivateFile(input: {
  organizationId: number;
  ownerUserId: number;
  data: Uint8Array;
  fileName: string;
  mimeType: string;
  /**
   * Documents and contracts always require a real malware scan in
   * production (the default). Avatars pass false: they're small images
   * from a fixed jpeg/png/webp allowlist, a lower-risk surface, and this
   * lets photo upload work before a scanner is provisioned. Do not widen
   * this default to other upload paths without a deliberate decision.
   */
  requireScan?: boolean;
}) {
  const storage = getStorageConfiguration();
  if (!storage) throw new Error("Private object storage is not configured.");
  if (!Number.isSafeInteger(input.organizationId) || input.organizationId <= 0) {
    throw new Error("A valid organization is required.");
  }
  if (
    input.data.byteLength === 0 ||
    input.data.byteLength > MAX_FILE_BYTES ||
    !ALLOWED_MIME_TYPES.has(input.mimeType)
  ) {
    throw new Error("Unsupported file type or size.");
  }

  const scanStatus = await assertFileIsClean(input.data, input.fileName, input.mimeType, input.requireScan ?? true);
  const digest = crypto.createHash("sha256").update(input.data).digest("hex");
  const key =
    `organizations/${input.organizationId}/documents/` +
    `${crypto.randomUUID()}${safeExtension(input.fileName)}`;
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: input.data,
      ContentType: input.mimeType,
      ContentDisposition: "attachment",
      Metadata: {
        owner: String(input.ownerUserId),
        sha256: digest,
        scan: scanStatus,
      },
      ServerSideEncryption: "AES256",
    })
  );
  return { key, sha256: digest, size: input.data.byteLength, scanStatus };
}

export async function createPrivateDownloadUrl(
  key: string,
  expiresInSeconds = 300
) {
  const storage = getStorageConfiguration();
  if (!storage) throw new Error("Private object storage is not configured.");
  if (
    !/^organizations\/[1-9]\d*\/documents\/[a-f0-9-]+(?:\.[a-z0-9]{1,10})?$/.test(
      key
    )
  ) {
    throw new Error("Invalid object key.");
  }
  return getSignedUrl(
    storage.client,
    new GetObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ResponseContentDisposition: "attachment",
    }),
    { expiresIn: Math.min(900, Math.max(60, expiresInSeconds)) }
  );
}

export async function deletePrivateFile(key: string) {
  const storage = getStorageConfiguration();
  if (!storage) throw new Error("Private object storage is not configured.");
  await storage.client.send(
    new DeleteObjectCommand({ Bucket: storage.bucket, Key: key })
  );
}

export const privateFilePolicy = {
  maximumBytes: MAX_FILE_BYTES,
  allowedMimeTypes: [...ALLOWED_MIME_TYPES],
} as const;
