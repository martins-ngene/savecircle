import assert from "node:assert/strict";
import { test } from "node:test";
import { groupRules, payoutPosition, readInviteToken } from "./model.ts";

test("links and codes resolve to the same API invitation token", () => {
  const token = "12345678-1234-1234-1234-123456789abc";
  assert.equal(readInviteToken(token), token);
  assert.equal(readInviteToken(`https://example.com/connect?invite=${token}`), token);
  assert.throws(() => readInviteToken("https://example.com/connect"), /valid/);
});

test("a joining wallet takes the first open spot and sees the stored rules", () => {
  const invite = {
    totalMembers: 3,
    members: [{ walletAddress: "organizer", rotationPosition: 1, status: "ACTIVE" }],
    rules: "First rule\n\nSecond rule",
  };
  assert.equal(payoutPosition(invite, "new member"), 2);
  assert.equal(payoutPosition(invite, "organizer"), 1);
  assert.deepEqual(groupRules(invite), ["First rule", "Second rule"]);
});
