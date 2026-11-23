import assert from "node:assert/strict";
import { test } from "node:test";
import { releaseStatus, nextRelease } from "./release.ts";

const ready = { collected: 50_000, target: 50_000, approvals: 3, threshold: 3, authorized: true };
test("a payout needs full funding, the approval threshold, and an authorized wallet", () => {
  assert.equal(releaseStatus({ ...ready, collected: 40_000 }), "funding");
  assert.equal(releaseStatus({ ...ready, approvals: 2 }), "approvals");
  assert.equal(releaseStatus({ ...ready, authorized: false }), "unauthorized");
  assert.equal(releaseStatus(ready), "ready");
});

test("a submitted payout can only confirm once and cannot be submitted again", () => {
  const pending = nextRelease(undefined, "submit", "ready");
  assert.equal(nextRelease(pending, "submit", "ready"), "pending");
  assert.equal(nextRelease(pending, "confirm", "pending"), "paid");
  assert.equal(nextRelease("paid", "submit", "ready"), "paid");
  assert.equal(nextRelease(undefined, "submit", "approvals"), undefined);
  assert.equal(nextRelease(undefined, "confirm", "ready"), undefined);
});
