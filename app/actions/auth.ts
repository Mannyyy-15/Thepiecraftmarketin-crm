"use server";

import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  getSessionSecret,
  isSessionPayload,
  SESSION_AUDIENCE,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  SESSION_ISSUER,
  type SessionPayload,
} from "@/lib/security/session";
import { checkDistributedRateLimit } from "@/lib/security/http";
import {
  adminAccountPasswordSchema,
  loginPasswordSchema,
  memberAccountPasswordSchema,
} from "@/lib/security/password";
import { uploadPrivateFile, deletePrivateFile } from "@/lib/storage/private-object-storage";
import {
  decryptMfaSecret,
  recoveryCodeMatches,
  verifyTotp,
} from "@/lib/security/mfa";

// The session is signed, not encrypted. Never place secrets in this payload.
async function encrypt(payload: SessionPayload, sessionId = crypto.randomUUID()) {
  const key = getSessionSecret();
  if (!key) throw new Error("Session service is not configured.");

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.id))
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setJti(sessionId)
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(key);
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function shiftTimeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(value);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return Number.NaN;
  const hour24 = match[3] === "PM" && hours !== 12
    ? hours + 12
    : match[3] === "AM" && hours === 12
      ? 0
      : hours;
  return hour24 * 60 + minutes;
}

function privateMetadataHash(value: string) {
  return crypto
    .createHmac(
      "sha256",
      process.env.SESSION_METADATA_PEPPER || process.env.JWT_SECRET || ""
    )
    .update(value)
    .digest("hex");
}

async function decrypt(input: string) {
  const key = getSessionSecret();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    return isSessionPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "employee" | "client";
  avatarUrl: string | null;
};

async function establishUserSession(user: AuthenticatedUser) {
  if (!db) throw new Error("Database is not connected.");
  const sessionPayload: SessionPayload = {
    id: user.id,
    name: user.name || user.email.split("@")[0],
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
  };
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const sessionId = crypto.randomUUID();
  const token = await encrypt(sessionPayload, sessionId);
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) || null;
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip");
  const [membership] = await db
    .select({ organizationId: schema.organizationMemberships.organizationId })
    .from(schema.organizationMemberships)
    .where(
      and(
        eq(schema.organizationMemberships.userId, user.id),
        eq(schema.organizationMemberships.status, "active")
      )
    )
    .limit(1);
  if (!membership) throw new Error("No active organization membership.");

  await db.insert(schema.userSessions).values({
    userId: user.id,
    organizationId: membership.organizationId,
    sessionId,
    tokenHash: tokenHash(token),
    deviceName: userAgent
      ? /mobile|android|iphone/i.test(userAgent)
        ? "Mobile device"
        : "Desktop browser"
      : "Unknown device",
    userAgent,
    ipHash: ip ? privateMetadataHash(ip) : null,
    expiresAt,
  });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

/**
 * Log in a user (Admin, Employee, or Client)
 */
export async function login(state: any, formData: FormData) {
  try {
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    const mfaValue = formData.get("mfaCode");
    const email =
      typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
    const password = typeof passwordValue === "string" ? passwordValue : "";
    const mfaCode = typeof mfaValue === "string" ? mfaValue.trim() : "";

    if (
      !email ||
      email.length > 254 ||
      !loginPasswordSchema.safeParse(password).success ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return { success: false, error: "Please enter both email and password." };
    }

    if (!db || !getSessionSecret()) {
      console.error("[Auth] Login unavailable because a required service is not configured.");
      return { success: false, error: "Login is temporarily unavailable." };
    }

    const rateLimit = await checkDistributedRateLimit(
      `login:${email}`,
      8,
      15 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Too many login attempts. Please try again later.",
      };
    }

    // Find user in database
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUsers.length === 0) {
      // Keep missing-user and wrong-password paths computationally similar.
      await bcrypt.compare(
        password,
        "$2b$12$mF5Hlylnl4OHf9pCOWWZhe51bvmAvKdUWCSG8RpIp4m9W6K0JYziO"
      );
      return { success: false, error: "Invalid email or password." };
    }

    const user = existingUsers[0];
    if (
      user.role !== "admin" &&
      user.role !== "employee" &&
      user.role !== "client"
    ) {
      return { success: false, error: "Invalid email or password." };
    }

    // Check password
    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return { success: false, error: "Invalid email or password." };
    }

    const activeMfaFactors = await db
      .select()
      .from(schema.mfaFactors)
      .where(
        and(
          eq(schema.mfaFactors.userId, user.id),
          isNull(schema.mfaFactors.disabledAt),
          isNotNull(schema.mfaFactors.verifiedAt)
        )
      );
    if (activeMfaFactors.length > 0) {
      if (!mfaCode) {
        return {
          success: false,
          mfaRequired: true,
          error: "Enter your authenticator or recovery code.",
        };
      }
      let verifiedFactor: (typeof activeMfaFactors)[number] | undefined;
      for (const factor of activeMfaFactors) {
        if (!factor.secretEncrypted) continue;
        if (
          factor.type === "totp" &&
          /^\d{6}$/.test(mfaCode) &&
          verifyTotp(decryptMfaSecret(factor.secretEncrypted), mfaCode)
        ) {
          verifiedFactor = factor;
          break;
        }
        if (factor.type === "recovery") {
          const hashes = JSON.parse(decryptMfaSecret(factor.secretEncrypted));
          if (
            Array.isArray(hashes) &&
            hashes.some(
              (hash) =>
                typeof hash === "string" && recoveryCodeMatches(mfaCode, hash)
            )
          ) {
            verifiedFactor = factor;
            break;
          }
        }
      }
      if (!verifiedFactor) {
        return {
          success: false,
          mfaRequired: true,
          error: "The verification code is invalid.",
        };
      }
      await db
        .update(schema.mfaFactors)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.mfaFactors.id, verifiedFactor.id));
    }

    await establishUserSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });

    return { 
      success: true, 
      user: { name: user.name, email: user.email, role: user.role },
      error: null 
    };
  } catch (error) {
    console.error("Login Server Action Error:", error);
    return { success: false, error: "An unexpected error occurred during login." };
  }
}

/**
 * Log out the active user and clear session cookies
 */
export async function logout() {
  const cookieStore = await cookies();
  try {
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? await decrypt(token) : null;
    if (db && payload?.jti) {
      await db
        .update(schema.userSessions)
        .set({ revokedAt: new Date(), revokeReason: "user_logout" })
        .where(eq(schema.userSessions.sessionId, payload.jti));
    }
  } catch (error) {
    // A stale or unavailable session ledger must never prevent local sign-out.
    console.error("Logout session revocation error:", error);
  }
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/employee", "layout");
  revalidatePath("/client", "layout");
  return { success: true };
}

/**
 * Create a new user (Admin-only action)
 */
export async function createUser(formData: FormData) {
  try {
    // 1. Verify caller session to ensure they are an Admin
    const payload = await getCurrentUser();
    if (!payload || payload.role !== "admin") {
      return { success: false, error: "Your admin session has expired. Sign out, sign in again, and retry." };
    }

    if (!db) {
      return { success: false, error: "Database not connected." };
    }

    const emailValue = formData.get("email");
    const nameValue = formData.get("name");
    const passwordValue = formData.get("password");
    const roleValue = formData.get("role");
    const email =
      typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
    const password = typeof passwordValue === "string" ? passwordValue : "";
    const requestedName = typeof nameValue === "string" ? nameValue.trim() : "";
    const role =
      roleValue === "admin" || roleValue === "employee" || roleValue === "client"
        ? roleValue
        : null;
    const systemRole = (formData.get("systemRole") as string) || (role === "admin" ? "Admin" : "Web Developer");
    const workingDays = (formData.get("workingDays") as string) || "1,2,3,4,5";
    const shiftStartTime = (formData.get("shiftStartTime") as string) || "09:00 AM";
    const shiftEndTime = (formData.get("shiftEndTime") as string) || "05:00 PM";
    const activeShiftProfile = (formData.get("activeShiftProfile") as string) || "Standard Core Hours";
    const validWorkingDays = /^(?:[0-6](?:,[0-6])*)$/.test(workingDays);
    const validShiftTime = /^\d{2}:\d{2} (?:AM|PM)$/;

    const passwordResult = role === "admin"
      ? adminAccountPasswordSchema.safeParse(password)
      : memberAccountPasswordSchema.safeParse(password);

    if (
      requestedName.length > 120 ||
      systemRole.length > 120 ||
      !validWorkingDays ||
      !validShiftTime.test(shiftStartTime) ||
      !validShiftTime.test(shiftEndTime) ||
      shiftTimeToMinutes(shiftEndTime) <= shiftTimeToMinutes(shiftStartTime)
    ) {
      return {
        success: false,
        error: "Enter a valid name, role, working-day selection, and shift where the end is later than the start.",
      };
    }

    if (
      !email ||
      !role ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !passwordResult.success
    ) {
      return {
        success: false,
        error: role === "admin"
          ? "Enter a valid email, role, and password between 12 and 128 characters."
          : "Enter a valid email, role, and a non-empty password up to 128 characters.",
      };
    }

    const name = requestedName || email.split("@")[0];

    // 2. Check if email already exists
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      return { success: false, error: "An account with this email address already exists." };
    }

    const [adminMembership] = await db
      .select({
        organizationId: schema.organizationMemberships.organizationId,
        role: schema.organizationMemberships.role,
      })
      .from(schema.organizationMemberships)
      .where(
        and(
          eq(schema.organizationMemberships.userId, payload.id),
          eq(schema.organizationMemberships.status, "active")
        )
      )
      .limit(1);
    if (
      !adminMembership ||
      (adminMembership.role !== "owner" && adminMembership.role !== "admin")
    ) {
      return { success: false, error: "No organization administration access." };
    }

    // 3. Hash password, insert the identity and grant an explicit membership.
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.transaction(async (tx) => {
      await tx.insert(schema.users).values({
        name: name.trim(),
        email,
        password: hashedPassword,
        role,
        systemRole,
        workingDays,
        shiftStartTime,
        shiftEndTime,
        activeShiftProfile,
        organizationId: adminMembership.organizationId,
      });
      const [created] = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      if (!created) throw new Error("Account creation could not be confirmed.");
      await tx.insert(schema.organizationMemberships).values({
        organizationId: adminMembership.organizationId,
        userId: created.id,
        role: role === "client" ? "client" : role === "admin" ? "admin" : "member",
        status: "active",
        invitedById: payload.id,
      });
    });

    const newUser = await db.select({ id: schema.users.id }).from(schema.users)
      .where(eq(schema.users.email, email)).limit(1);
    const newUserId = newUser[0]?.id ?? null;

    console.log(`[Database] Account created by Admin: ${email} (${role} - ${systemRole})`);
    return { success: true, error: null, userId: newUserId };
  } catch (error: any) {
    console.error("CreateUser Server Action Error:", error);
    return { success: false, error: error.message || "Failed to create user account." };
  }
}

async function loginLinkBaseUrl() {
  let configured = process.env.APP_BASE_URL || process.env.CAP_SERVER_URL;
  if (!configured && process.env.NODE_ENV !== "production") {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host");
    if (host) configured = `http://${host}`;
  }
  if (!configured) throw new Error("APP_BASE_URL is not configured.");
  const url = new URL(configured);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && url.protocol === "http:"))
  ) {
    throw new Error("APP_BASE_URL must be a trusted HTTPS origin.");
  }
  return url.origin;
}

export async function createLoginLink(userId: number) {
  try {
    const admin = await getCurrentUser();
    if (
      !admin ||
      admin.role !== "admin" ||
      !db ||
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return { success: false as const, error: "Unauthorized." };
    }
    const [adminMembership] = await db
      .select({
        organizationId: schema.organizationMemberships.organizationId,
        role: schema.organizationMemberships.role,
      })
      .from(schema.organizationMemberships)
      .where(
        and(
          eq(schema.organizationMemberships.userId, admin.id),
          eq(schema.organizationMemberships.status, "active")
        )
      )
      .limit(1);
    if (
      !adminMembership ||
      (adminMembership.role !== "owner" && adminMembership.role !== "admin")
    ) {
      return { success: false as const, error: "Organization admin access required." };
    }
    const [target] = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
      })
      .from(schema.users)
      .innerJoin(
        schema.organizationMemberships,
        and(
          eq(schema.organizationMemberships.userId, schema.users.id),
          eq(
            schema.organizationMemberships.organizationId,
            adminMembership.organizationId
          ),
          eq(schema.organizationMemberships.status, "active")
        )
      )
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!target || (target.role !== "employee" && target.role !== "client")) {
      return { success: false as const, error: "Employee or client account not found." };
    }
    const rateLimit = await checkDistributedRateLimit(
      `admin-login-link:${admin.id}:${target.id}`,
      10,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return { success: false as const, error: "Too many links created. Try again later." };
    }

    const ttlMinutes = Math.min(
      10_080,
      Math.max(15, Number(process.env.LOGIN_LINK_TTL_MINUTES || 1440))
    );
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenDigest = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await db.transaction(async (tx) => {
      await tx
        .update(schema.loginLinks)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.loginLinks.organizationId, adminMembership.organizationId),
            eq(schema.loginLinks.userId, target.id),
            isNull(schema.loginLinks.usedAt),
            isNull(schema.loginLinks.revokedAt)
          )
        );
      await tx.insert(schema.loginLinks).values({
        organizationId: adminMembership.organizationId,
        userId: target.id,
        tokenHash: tokenDigest,
        purpose: "onboarding",
        createdById: admin.id,
        expiresAt,
      });
    });
    return {
      success: true as const,
      loginLink: `${await loginLinkBaseUrl()}/access#${token}`,
      expiresAt: expiresAt.toISOString(),
      user: { id: target.id, name: target.name, email: target.email, role: target.role },
    };
  } catch (error) {
    console.error("[Auth] Login-link creation failed.", error);
    return { success: false as const, error: "Could not create a login link." };
  }
}

export async function resetMemberPassword(userId: number, newPassword: string) {
  try {
    const admin = await getCurrentUser();
    const passwordResult = memberAccountPasswordSchema.safeParse(newPassword);
    if (
      !admin ||
      admin.role !== "admin" ||
      !db ||
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !passwordResult.success
    ) {
      return {
        success: false as const,
        error: !passwordResult.success
          ? "Password must be non-empty and no more than 128 characters."
          : "Unauthorized.",
      };
    }

    const [adminMembership] = await db
      .select({
        organizationId: schema.organizationMemberships.organizationId,
        role: schema.organizationMemberships.role,
      })
      .from(schema.organizationMemberships)
      .where(
        and(
          eq(schema.organizationMemberships.userId, admin.id),
          eq(schema.organizationMemberships.status, "active")
        )
      )
      .limit(1);
    if (
      !adminMembership ||
      (adminMembership.role !== "owner" && adminMembership.role !== "admin")
    ) {
      return { success: false as const, error: "Organization admin access required." };
    }

    const [target] = await db
      .select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .innerJoin(
        schema.organizationMemberships,
        and(
          eq(schema.organizationMemberships.userId, schema.users.id),
          eq(
            schema.organizationMemberships.organizationId,
            adminMembership.organizationId
          ),
          eq(schema.organizationMemberships.status, "active")
        )
      )
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!target || (target.role !== "employee" && target.role !== "client")) {
      return { success: false as const, error: "Employee or client account not found." };
    }

    const rateLimit = await checkDistributedRateLimit(
      `admin-password-reset:${admin.id}:${target.id}`,
      10,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return { success: false as const, error: "Too many password changes. Try again later." };
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.transaction(async (tx) => {
      await tx
        .update(schema.users)
        .set({ password: passwordHash })
        .where(eq(schema.users.id, target.id));
      await tx
        .update(schema.userSessions)
        .set({ revokedAt: now, revokeReason: "admin_password_reset" })
        .where(
          and(
            eq(schema.userSessions.userId, target.id),
            isNull(schema.userSessions.revokedAt)
          )
        );
      await tx
        .update(schema.loginLinks)
        .set({ revokedAt: now })
        .where(
          and(
            eq(schema.loginLinks.organizationId, adminMembership.organizationId),
            eq(schema.loginLinks.userId, target.id),
            isNull(schema.loginLinks.usedAt),
            isNull(schema.loginLinks.revokedAt)
          )
        );
    });

    revalidatePath("/admin/team");
    return { success: true as const };
  } catch (error) {
    console.error("[Auth] Member password reset failed.", error);
    return { success: false as const, error: "Could not update this password." };
  }
}

export async function redeemLoginLink(token: string) {
  try {
    if (!db || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return { success: false as const, error: "This login link is invalid." };
    }
    const digest = crypto.createHash("sha256").update(token).digest("hex");
    const requestHeaders = await headers();
    const clientAddress =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    const rateLimit = await checkDistributedRateLimit(
      `redeem-login-link:${clientAddress}:${digest.slice(0, 16)}`,
      8,
      15 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return { success: false as const, error: "Too many attempts. Try again later." };
    }

    const [candidate] = await db
      .select({
        linkId: schema.loginLinks.id,
        userId: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.loginLinks)
      .innerJoin(schema.users, eq(schema.users.id, schema.loginLinks.userId))
      .innerJoin(
        schema.organizationMemberships,
        and(
          eq(
            schema.organizationMemberships.organizationId,
            schema.loginLinks.organizationId
          ),
          eq(schema.organizationMemberships.userId, schema.loginLinks.userId),
          eq(schema.organizationMemberships.status, "active")
        )
      )
      .where(
        and(
          eq(schema.loginLinks.tokenHash, digest),
          isNull(schema.loginLinks.usedAt),
          isNull(schema.loginLinks.revokedAt),
          gt(schema.loginLinks.expiresAt, new Date())
        )
      )
      .limit(1);
    if (
      !candidate ||
      (candidate.role !== "employee" && candidate.role !== "client")
    ) {
      return {
        success: false as const,
        error: "This link has expired, was already used, or was revoked.",
      };
    }

    const updateResult = await db
      .update(schema.loginLinks)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(schema.loginLinks.id, candidate.linkId),
          isNull(schema.loginLinks.usedAt),
          isNull(schema.loginLinks.revokedAt),
          gt(schema.loginLinks.expiresAt, new Date())
        )
      );
    const updateHeader = Array.isArray(updateResult) ? updateResult[0] : updateResult;
    const affectedRows = Number(
      (updateHeader as unknown as { affectedRows?: number }).affectedRows || 0
    );
    if (affectedRows !== 1) {
      return { success: false as const, error: "This login link was already used." };
    }

    await establishUserSession({
      id: candidate.userId,
      name: candidate.name,
      email: candidate.email,
      role: candidate.role,
      avatarUrl: candidate.avatarUrl,
    });
    return {
      success: true as const,
      redirectTo: candidate.role === "employee" ? "/employee" : "/client",
    };
  } catch (error) {
    console.error("[Auth] Login-link redemption failed.", error);
    return { success: false as const, error: "This login link could not be used." };
  }
}

/**
 * Helper to fetch the current user's profile on the server side
 */
export async function getCurrentUser() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await decrypt(token);
    if (!payload || !payload.jti || !db) return null;

    const [activeSession] = await db
      .select()
      .from(schema.userSessions)
      .where(
        and(
          eq(schema.userSessions.sessionId, payload.jti),
          eq(schema.userSessions.userId, payload.id),
          eq(schema.userSessions.tokenHash, tokenHash(token)),
          isNull(schema.userSessions.revokedAt),
          gt(schema.userSessions.expiresAt, new Date())
        )
      )
      .limit(1);
    if (!activeSession) return null;

    // Re-check mutable identity and role data so deleted users and role changes
    // invalidate an otherwise unexpired token.
    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.users)
      .where(eq(schema.users.id, payload.id))
      .limit(1);
    const user = rows[0];
    if (
      !user ||
      user.email !== payload.email ||
      user.role !== payload.role ||
      (user.role !== "admin" &&
        user.role !== "employee" &&
        user.role !== "client")
    ) {
      return null;
    }

    return {
      ...payload,
      name: user.name || user.email.split("@")[0],
      avatarUrl: user.avatarUrl || null,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Uploads a profile avatar, inserts a storageObjects record, and updates avatarUrl
 */
export async function updateUserAvatar(formData: FormData) {
  try {
    const session = await getCurrentUser();
    if (!session || !db) return { success: false, error: "Unauthorized" };

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "No image file provided." };
    }

    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedMimeTypes.has(file.type)) {
      return { success: false, error: "File must be a JPEG, PNG, or WebP image." };
    }

    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image size must be less than 5MB." };
    }

    const [membership] = await db
      .select({ organizationId: schema.organizationMemberships.organizationId })
      .from(schema.organizationMemberships)
      .where(and(
        eq(schema.organizationMemberships.userId, Number(session.id)),
        eq(schema.organizationMemberships.status, "active")
      ))
      .limit(1);

    if (!membership) return { success: false, error: "No active organization membership." };

    const buffer = new Uint8Array(await file.arrayBuffer());
    const uploadResult = await uploadPrivateFile({
      organizationId: membership.organizationId,
      ownerUserId: Number(session.id),
      data: buffer,
      fileName: file.name,
      mimeType: file.type,
      // Avatars are small images from a fixed jpeg/png/webp allowlist — a
      // lower-risk surface than arbitrary documents — so this path doesn't
      // require a malware scanner to be configured. Document/contract
      // uploads elsewhere keep the default (required in production).
      requireScan: false,
    });

    const previousAvatars = await db
      .select()
      .from(schema.storageObjects)
      .where(and(
        eq(schema.storageObjects.entityType, "avatar"),
        eq(schema.storageObjects.entityId, Number(session.id)),
        isNull(schema.storageObjects.deletedAt)
      ));

    for (const prev of previousAvatars) {
      await db
        .update(schema.storageObjects)
        .set({ deletedAt: new Date() })
        .where(eq(schema.storageObjects.id, prev.id));

      deletePrivateFile(prev.objectKey).catch(err => {
        console.error("deletePrivateFile error for old avatar:", err);
      });
    }

    const [inserted] = await db.insert(schema.storageObjects).values({
      organizationId: membership.organizationId,
      objectKey: uploadResult.key,
      bucket: process.env.OBJECT_STORAGE_BUCKET || "",
      originalName: file.name,
      contentType: file.type,
      sizeBytes: uploadResult.size,
      checksumSha256: uploadResult.sha256,
      scanStatus: uploadResult.scanStatus === "clean" ? "clean" : "pending",
      visibility: "organization",
      entityType: "avatar",
      entityId: Number(session.id),
      uploadedById: Number(session.id),
    });

    const avatarUrl = `/api/avatars/${inserted.insertId}`;
    await db.update(schema.users).set({ avatarUrl }).where(eq(schema.users.id, Number(session.id)));

    revalidatePath("/admin");
    revalidatePath("/employee");
    revalidatePath("/client");

    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error("updateUserAvatar error:", error);
    return { success: false, error: error?.message || "Failed to upload avatar." };
  }
}
