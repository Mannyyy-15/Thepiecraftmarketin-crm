import type { JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = "token";
export const SESSION_DURATION_SECONDS = 24 * 60 * 60;
export const SESSION_ISSUER = "iranikoyla-os";
export const SESSION_AUDIENCE = "iranikoyla-os-users";

export type UserRole = "admin" | "employee" | "client";

export interface SessionPayload extends JWTPayload {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

export function getSessionSecret(): Uint8Array | null {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "thepiecraft_development_jwt_secret_32_bytes_long_key_2026"
      : null);
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export function isSessionPayload(value: JWTPayload): value is SessionPayload {
  return (
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.email === "string" &&
    value.email.length > 0 &&
    (value.role === "admin" ||
      value.role === "employee" ||
      value.role === "client")
  );
}
