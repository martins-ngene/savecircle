import assert from "node:assert/strict";
import { test } from "node:test";
import { cycleDate, initialDraft, payoutRows } from "./model.ts";

test("monthly dates clamp at month end without shifting later cycles", () => {
  assert.equal(cycleDate("2025-01-31", "Monthly", 1), "Feb 28, 2025");
  assert.equal(cycleDate("2025-01-31", "Monthly", 2), "Mar 31, 2025");
  assert.equal(cycleDate("2025-01-31", "Every 2 weeks", 1), "Feb 14, 2025");
});

test("fixed payout previews target a single slot while rotation follows the configured order", () => {
  assert.deepEqual(payoutRows({ ...initialDraft, order: [2, 1] }).map(row => row.slot), [2, 1]);
  assert.deepEqual(payoutRows({ ...initialDraft, model: "Fixed", recipient: 2 }).map(row => row.slot), [2]);
});
