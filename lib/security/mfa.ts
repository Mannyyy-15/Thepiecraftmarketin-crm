import "server-only";

import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey() {
  const encoded = process.env.MFA_ENCRYPTION_KEY;
  if (!encoded) throw new Error("MFA encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY must be exactly 32 bytes in base64.");
  }
  return key;
}

function decodeBase32(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function encodeBase32(data: Uint8Array) {
  let bits = "";
  for (const byte of data) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) {
    result += BASE32_ALPHABET[
      Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)
    ];
  }
  return result;
}

export function createTotpSecret() {
  return encodeBase32(crypto.randomBytes(20));
}

export function encryptMfaSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptMfaSecret(value: string) {
  const payload = Buffer.from(value, "base64url");
  if (payload.length < 29) throw new Error("Invalid encrypted MFA secret.");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    payload.subarray(0, 12)
  );
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([
    decipher.update(payload.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}

export function generateTotp(
  secret: string,
  timestamp = Date.now(),
  periodSeconds = 30
) {
  const counter = Math.floor(timestamp / 1000 / periodSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto
    .createHmac("sha1", decodeBase32(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  return [-1, 0, 1].some((window) => {
    const expected = generateTotp(secret, timestamp + window * 30_000);
    return crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected));
  });
}

function recoveryPepper() {
  const pepper = process.env.MFA_RECOVERY_PEPPER;
  if (!pepper || Buffer.byteLength(pepper) < 32) {
    throw new Error("MFA recovery-code hashing is not configured.");
  }
  return pepper;
}

export function createRecoveryCodes(count = 10) {
  const codes = Array.from({ length: count }, () =>
    crypto.randomBytes(8).toString("hex").toUpperCase().match(/.{1,4}/g)!.join("-")
  );
  return {
    codes,
    hashes: codes.map(hashRecoveryCode),
  };
}

export function hashRecoveryCode(code: string) {
  return crypto
    .createHmac("sha256", recoveryPepper())
    .update(code.replace(/[^a-f0-9]/gi, "").toUpperCase())
    .digest("hex");
}

export function recoveryCodeMatches(code: string, expectedHash: string) {
  const received = Buffer.from(hashRecoveryCode(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

export function totpEnrollmentUri(input: {
  secret: string;
  email: string;
  issuer?: string;
}) {
  const issuer = input.issuer || "Irani Koyla OS";
  const label = `${issuer}:${input.email}`;
  const query = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}
