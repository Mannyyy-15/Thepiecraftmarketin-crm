"use server";

import bcrypt from "bcryptjs";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { getCurrentUser } from "@/app/actions/auth";
import {
  createRecoveryCodes,
  createTotpSecret,
  decryptMfaSecret,
  encryptMfaSecret,
  totpEnrollmentUri,
  verifyTotp,
} from "@/lib/security/mfa";

export async function beginTotpEnrollment() {
  const user = await getCurrentUser();
  if (!user || !db) return { success: false, error: "Unauthorized." };
  try {
    const secret = createTotpSecret();
    await db
      .delete(schema.mfaFactors)
      .where(
        and(
          eq(schema.mfaFactors.userId, user.id),
          eq(schema.mfaFactors.type, "totp"),
          isNull(schema.mfaFactors.verifiedAt)
        )
      );
    await db.insert(schema.mfaFactors).values({
      userId: user.id,
      type: "totp",
      label: "Authenticator app",
      secretEncrypted: encryptMfaSecret(secret),
    });
    return {
      success: true,
      secret,
      enrollmentUri: totpEnrollmentUri({ secret, email: user.email }),
    };
  } catch (error) {
    console.error("[MFA] Enrollment failed.", error);
    return { success: false, error: "MFA is not configured on this server." };
  }
}

export async function confirmTotpEnrollment(code: string) {
  const user = await getCurrentUser();
  if (!user || !db || !/^\d{6}$/.test(code)) {
    return { success: false, error: "Enter a valid verification code." };
  }
  const [factor] = await db
    .select()
    .from(schema.mfaFactors)
    .where(
      and(
        eq(schema.mfaFactors.userId, user.id),
        eq(schema.mfaFactors.type, "totp"),
        isNull(schema.mfaFactors.verifiedAt),
        isNull(schema.mfaFactors.disabledAt)
      )
    )
    .orderBy(desc(schema.mfaFactors.createdAt))
    .limit(1);
  if (
    !factor?.secretEncrypted ||
    !verifyTotp(decryptMfaSecret(factor.secretEncrypted), code)
  ) {
    return { success: false, error: "The verification code is invalid." };
  }

  const recovery = createRecoveryCodes();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.mfaFactors)
      .set({ verifiedAt: new Date(), lastUsedAt: new Date() })
      .where(eq(schema.mfaFactors.id, factor.id));
    await tx
      .delete(schema.mfaFactors)
      .where(
        and(
          eq(schema.mfaFactors.userId, user.id),
          eq(schema.mfaFactors.type, "recovery")
        )
      );
    await tx.insert(schema.mfaFactors).values({
      userId: user.id,
      type: "recovery",
      label: "Recovery codes",
      secretEncrypted: encryptMfaSecret(JSON.stringify(recovery.hashes)),
      verifiedAt: new Date(),
    });
  });
  revalidatePath("/admin/settings");
  return { success: true, recoveryCodes: recovery.codes };
}

export async function disableMfa(password: string, code: string) {
  const user = await getCurrentUser();
  if (!user || !db) return { success: false, error: "Unauthorized." };
  const [account] = await db
    .select({ password: schema.users.password })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  const [factor] = await db
    .select()
    .from(schema.mfaFactors)
    .where(
      and(
        eq(schema.mfaFactors.userId, user.id),
        eq(schema.mfaFactors.type, "totp"),
        isNull(schema.mfaFactors.disabledAt)
      )
    )
    .limit(1);
  if (
    !account ||
    !(await bcrypt.compare(password, account.password)) ||
    !factor?.secretEncrypted ||
    !verifyTotp(decryptMfaSecret(factor.secretEncrypted), code)
  ) {
    return { success: false, error: "Password or verification code is invalid." };
  }
  await db
    .update(schema.mfaFactors)
    .set({ disabledAt: new Date() })
    .where(eq(schema.mfaFactors.userId, user.id));
  return { success: true };
}

export async function listDeviceSessions() {
  const user = await getCurrentUser();
  if (!user || !db) return { success: false, data: [] };
  const rows = await db
    .select({
      sessionId: schema.userSessions.sessionId,
      deviceName: schema.userSessions.deviceName,
      lastSeenAt: schema.userSessions.lastSeenAt,
      expiresAt: schema.userSessions.expiresAt,
      createdAt: schema.userSessions.createdAt,
    })
    .from(schema.userSessions)
    .where(
      and(
        eq(schema.userSessions.userId, user.id),
        isNull(schema.userSessions.revokedAt)
      )
    )
    .orderBy(desc(schema.userSessions.lastSeenAt));
  return {
    success: true,
    data: rows.map((row) => ({
      ...row,
      current: row.sessionId === user.jti,
    })),
  };
}

export async function revokeDeviceSession(sessionId: string) {
  const user = await getCurrentUser();
  if (!user || !db || !/^[a-f0-9-]{36}$/i.test(sessionId)) {
    return { success: false, error: "Invalid session." };
  }
  await db
    .update(schema.userSessions)
    .set({ revokedAt: new Date(), revokeReason: "user_revoked" })
    .where(
      and(
        eq(schema.userSessions.sessionId, sessionId),
        eq(schema.userSessions.userId, user.id)
      )
    );
  return { success: true, signedOutCurrentDevice: sessionId === user.jti };
}

export async function revokeOtherDeviceSessions() {
  const user = await getCurrentUser();
  if (!user || !user.jti || !db) {
    return { success: false, error: "Unauthorized." };
  }
  await db
    .update(schema.userSessions)
    .set({ revokedAt: new Date(), revokeReason: "user_revoked_others" })
    .where(
      and(
        eq(schema.userSessions.userId, user.id),
        ne(schema.userSessions.sessionId, user.jti),
        isNull(schema.userSessions.revokedAt)
      )
    );
  return { success: true };
}
