import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  androidAccessUrls,
  trustedAccessPath,
} from "../lib/access-links.ts";

const token = "A".repeat(43);

test("trusted access links normalize verified web and native app URLs", () => {
  assert.equal(
    trustedAccessPath(`https://crm.thepiecraftmarketing.com/access#${token}`),
    `/access#${token}`
  );
  assert.equal(
    trustedAccessPath(`https://crm.thepiecraftmarketing.com/access?token=${token}`),
    `/access#${token}`
  );
  assert.equal(
    trustedAccessPath(`thepiecraftcrm://access?token=${token}`),
    `/access#${token}`
  );
});

test("trusted access links reject untrusted or ambiguous URLs", () => {
  assert.equal(trustedAccessPath(`https://example.com/access#${token}`), null);
  assert.equal(
    trustedAccessPath(`thepiecraftcrm://access?token=${token}&extra=1`),
    null
  );
  assert.equal(trustedAccessPath("thepiecraftcrm://settings"), null);
});

test("Android access URLs use the package-specific app scheme with a web fallback", () => {
  const urls = androidAccessUrls(token);
  assert.ok(urls);
  assert.equal(urls.appUrl, `thepiecraftcrm://access?token=${token}`);
  assert.match(urls.chromeIntentUrl, /^intent:\/\/access\?token=/);
  assert.match(urls.chromeIntentUrl, /scheme=thepiecraftcrm/);
  assert.match(urls.chromeIntentUrl, /package=com\.thepiecraft\.crm/);
});

test("Android manifest declares the custom access scheme", () => {
  const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  assert.match(manifest, /android:scheme="thepiecraftcrm"/);
  assert.match(manifest, /android:host="access"/);
});
