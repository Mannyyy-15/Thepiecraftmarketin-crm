import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { androidRelease, shouldOfferAndroidUpdate } from "../lib/mobile-update.ts";

test("Android update is offered only for a newer valid version code", () => {
  assert.equal(shouldOfferAndroidUpdate(1, 2), true);
  assert.equal(shouldOfferAndroidUpdate(2, 2), false);
  assert.equal(shouldOfferAndroidUpdate(3, 2), false);
  assert.equal(shouldOfferAndroidUpdate(0, 2), false);
  assert.equal(shouldOfferAndroidUpdate(1, Number.NaN), false);
});

test("website download, updater manifest, and Android build share one release", () => {
  const gradle = readFileSync("android/app/build.gradle", "utf8");
  const accessPage = readFileSync("app/access/page.tsx", "utf8");
  const downloadRoute = readFileSync("app/api/mobile-apk/route.ts", "utf8");
  const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
  const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];

  assert.equal(versionCode, androidRelease.versionCode);
  assert.equal(versionName, androidRelease.versionName);
  assert.match(accessPage, /APK_DOWNLOAD_PATH = "\/api\/mobile-apk"/);
  assert.match(downloadRoute, /androidRelease\.apkUrl/);
  assert.doesNotMatch(accessPage, /downloads\/thepiecraft-crm\.apk/);
});
