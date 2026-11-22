import { strict as assert } from "node:assert";
import { test } from "node:test";
import { searchDashboard, fundingPercent } from "./model.ts";

test("search matches circle and activity terms without regard to case or surrounding spaces", () => {
  assert.deepEqual(searchDashboard("  GROWTH  ").map(({ section }) => section), ["circles", "ledger", "ledger"]);
  assert.deepEqual(searchDashboard("missing"), []);
  assert.deepEqual(searchDashboard("  "), []);
});

test("featured circle funding reflects the pool and contribution target", () => {
  assert.equal(fundingPercent, 80);
});
