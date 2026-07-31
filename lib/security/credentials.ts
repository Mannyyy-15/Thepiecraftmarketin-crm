import "server-only";

import crypto from "node:crypto";

function getKey() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!value) throw new Error("Integration credential encryption is not configured.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must contain 32 base64 bytes.");
  }
  return key;
}

export function encryptCredentials(value: unknown) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function decryptCredentials<T>(value: string): T {
  const payload = Buffer.from(value, "base64url");
  if (payload.length < 29) throw new Error("Invalid encrypted credentials.");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    payload.subarray(0, 12)
  );
  decipher.setAuthTag(payload.subarray(12, 28));
  const plaintext = Buffer.concat([
    decipher.update(payload.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}
