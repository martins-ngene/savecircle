import assert from "node:assert/strict";
import { test } from "node:test";
import { approvalCount, nextRequest } from "./request.ts";

test("registration, wallet signatures, and confirmed votes are separate", () => {
  assert.equal(nextRequest(undefined, { type: "submit", reason: "Scheduled release" }, false), undefined);
  const submitted = nextRequest(undefined, { type: "submit", reason: " Scheduled release " }, true);
  assert.equal(submitted.reason, "Scheduled release");
  assert.equal(approvalCount(submitted), 0);
  assert.equal(nextRequest(submitted, { type: "sign" }, true), submitted);

  const registered = nextRequest(submitted, { type: "register" }, true);
  assert.equal(approvalCount(registered), 0);
  assert.equal(nextRequest(registered, { type: "submit", reason: "Duplicate" }, true), registered);
  const reviewed = nextRequest(registered, { type: "refresh" }, true);
  const pending = nextRequest(reviewed, { type: "sign" }, true);
  assert.equal(approvalCount(pending), 2);
  assert.equal(nextRequest(pending, { type: "sign" }, true), pending);

  const confirmed = nextRequest(pending, { type: "confirm" }, true);
  assert.equal(approvalCount(confirmed), 3);
  assert.equal(nextRequest(confirmed, { type: "sign" }, true), confirmed);
  assert.equal(nextRequest(pending, { type: "confirm" }, false), pending);
});
