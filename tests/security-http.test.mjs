import test from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  constantTimeEqual,
  contentLengthWithinLimit,
  parseAllowedOrigins,
} from "../lib/security/http.ts";

test("constantTimeEqual rejects absent and different secrets", () => {
  assert.equal(constantTimeEqual(null, "secret"), false);
  assert.equal(constantTimeEqual("wrong", "secret"), false);
  assert.equal(constantTimeEqual("secret", "secret"), true);
});

test("contentLengthWithinLimit fails closed for invalid and oversized values", () => {
  const request = (value) =>
    new Request("https://crm.example.test", {
      headers: value === undefined ? {} : { "content-length": value },
    });

  assert.equal(contentLengthWithinLimit(request(undefined), 100), true);
  assert.equal(contentLengthWithinLimit(request("100"), 100), true);
  assert.equal(contentLengthWithinLimit(request("101"), 100), false);
  assert.equal(contentLengthWithinLimit(request("-1"), 100), false);
  assert.equal(contentLengthWithinLimit(request("not-a-number"), 100), false);
});

test("parseAllowedOrigins accepts exact HTTPS origins only in production", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const origins = parseAllowedOrigins(
      "https://crm.example.test,https://crm.example.test/path,http://crm.example.test,invalid"
    );
    assert.deepEqual([...origins], ["https://crm.example.test"]);
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test("rate limit blocks at the configured boundary and resets", () => {
  const key = `test:${crypto.randomUUID()}`;
  assert.deepEqual(checkRateLimit(key, 2, 1000, 10_000), {
    allowed: true,
    retryAfterSeconds: 0,
  });
  assert.equal(checkRateLimit(key, 2, 1000, 10_100).allowed, true);
  assert.deepEqual(checkRateLimit(key, 2, 1000, 10_200), {
    allowed: false,
    retryAfterSeconds: 1,
  });
  assert.equal(checkRateLimit(key, 2, 1000, 11_000).allowed, true);
});
