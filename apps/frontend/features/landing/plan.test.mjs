import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculatePlan } from "./plan.ts";

test("a five-member circle rotates one 500 USDC payout per member", () => {
  const plan = calculatePlan(5, "100");
  assert.equal(plan.pool, 50000);
  assert.equal(plan.total, 250000);
  assert.deepEqual(plan.order, [1, 2, 3, 4, 5]);
});

test("small contributions retain cents and invalid amounts are rejected", () => {
  assert.equal(calculatePlan(3, "0.01").pool, 3);
  for (const value of ["", "-1", "0", "1.234", "1e2", "1000001"]) {
    assert.equal(calculatePlan(3, value).valid, false);
  }
});
