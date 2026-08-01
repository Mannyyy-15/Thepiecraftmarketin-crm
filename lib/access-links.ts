export const LOGIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const ACCESS_ORIGIN = "https://crm.thepiecraftmarketing.com";
export const ANDROID_PACKAGE = "com.thepiecraft.crm";
export const ANDROID_APP_SCHEME = "thepiecraftcrm";

const TRUSTED_ACCESS_ORIGINS = new Set([
  ACCESS_ORIGIN,
  "https://thepiecraft-crm.vercel.app",
]);

export function trustedAccessPath(value: string) {
  try {
    const incoming = new URL(value);
    const isTrustedWebLink =
      TRUSTED_ACCESS_ORIGINS.has(incoming.origin) && incoming.pathname === "/access";
    const isTrustedAppLink =
      incoming.protocol === `${ANDROID_APP_SCHEME}:` &&
      incoming.hostname === "access" &&
      (incoming.pathname === "" || incoming.pathname === "/");

    if (
      (!isTrustedWebLink && !isTrustedAppLink) ||
      incoming.username !== "" ||
      incoming.password !== ""
    ) {
      return null;
    }

    const fragmentToken = incoming.hash.slice(1);
    const queryEntries = [...incoming.searchParams.entries()];
    const fragmentOnly =
      incoming.search === "" && LOGIN_TOKEN_PATTERN.test(fragmentToken);
    const queryOnly =
      incoming.hash === "" &&
      queryEntries.length === 1 &&
      queryEntries[0][0] === "token" &&
      LOGIN_TOKEN_PATTERN.test(queryEntries[0][1]);

    if (!fragmentOnly && !queryOnly) return null;
    const token = fragmentOnly ? fragmentToken : queryEntries[0][1];
    return `/access#${token}`;
  } catch {
    return null;
  }
}

export function androidAccessUrls(token: string) {
  if (!LOGIN_TOKEN_PATTERN.test(token)) return null;

  const encodedToken = encodeURIComponent(token);
  const browserFallbackUrl = `${ACCESS_ORIGIN}/access#${token}`;
  return {
    appUrl: `${ANDROID_APP_SCHEME}://access?token=${encodedToken}`,
    chromeIntentUrl:
      `intent://access?token=${encodedToken}` +
      `#Intent;scheme=${ANDROID_APP_SCHEME};package=${ANDROID_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(browserFallbackUrl)};end`,
  };
}
