import "server-only";

import { importPKCS8, SignJWT } from "jose";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

export function getGoogleServiceAccount(): ServiceAccount | null {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
      project_id: parsed.project_id,
    };
  } catch {
    return null;
  }
}

export async function getGoogleServiceAccountToken(scopes: readonly string[]) {
  const account = getGoogleServiceAccount();
  if (!account) throw new Error("Google service account is not configured.");
  const key = await importPKCS8(account.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: scopes.join(" ") })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json()) as { access_token?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(`Google service-account token request failed (${response.status}).`);
  }
  return body.access_token;
}

export async function sendFcmMessage(input: {
  token: string;
  title: string;
  body: string;
  link: string;
}) {
  const account = getGoogleServiceAccount();
  if (!account?.project_id) return { sent: false as const, reason: "not_configured" as const };
  const accessToken = await getGoogleServiceAccountToken([
    "https://www.googleapis.com/auth/firebase.messaging",
  ]);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: input.token,
          notification: { title: input.title, body: input.body },
          data: { link: input.link },
          android: { notification: { channel_id: "thepiecraft-crm" } },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!response.ok) throw new Error(`FCM send failed (${response.status}).`);
  return { sent: true as const };
}
