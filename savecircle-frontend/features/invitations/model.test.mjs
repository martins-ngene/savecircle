import assert from "node:assert/strict";
import { test } from "node:test";
import { getPreviewInvite, groupRules, payoutPosition, previewWallet } from "./model.ts";

test("sample links and codes resolve to the same invitation", () => {
  const invite = getPreviewInvite("surulere-savers");
  assert.equal(getPreviewInvite("https://example.com/connect?invite=surulere-savers"), invite);
  assert.throws(() => getPreviewInvite("unknown-code"), /sample/);
});

test("the sample wallet takes the first open payout spot", () => {
  const invite = getPreviewInvite("surulere-savers");
  assert.equal(payoutPosition(invite, previewWallet), 4);
  assert.equal(groupRules(invite).length, 5);
});
