import assert from "node:assert/strict";
import { test } from "node:test";
import { contributionRecords } from "./model.ts";

const due = new Date("2025-08-01T00:00:00Z");
const deadline = new Date("2025-08-04T23:59:59Z");
const cycle = { number: 3, due, deadline, end: deadline, paid: 0, status: "Pending", payment: { state: "pending", date: "2025-08-05T09:42:00Z" } };

test("a pending contribution is absent from the confirmed ledger until it settles", () => {
  assert.deepEqual(contributionRecords([cycle]), []);
  const [settled] = contributionRecords([{ ...cycle, paid: 10000, status: "Paid", payment: { ...cycle.payment, state: "paid" } }]);
  assert.equal(settled.amount, 10000);
  assert.equal(settled.late, true);
  assert.equal(settled.date.getTime(), Date.parse(cycle.payment.date));
});
