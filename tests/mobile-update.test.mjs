import assert from "node:assert/strict";
import test from "node:test";
import { shouldOfferAndroidUpdate } from "../lib/mobile-update.ts";

test("Android update is offered only for a newer valid version code", () => {
  assert.equal(shouldOfferAndroidUpdate(1, 2), true);
  assert.equal(shouldOfferAndroidUpdate(2, 2), false);
  assert.equal(shouldOfferAndroidUpdate(3, 2), false);
  assert.equal(shouldOfferAndroidUpdate(0, 2), false);
  assert.equal(shouldOfferAndroidUpdate(1, Number.NaN), false);
});
