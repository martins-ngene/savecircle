import assert from "node:assert/strict";
import { test } from "node:test";
import { createExitRequest, registerProposal, stageProposal } from "./records.ts";

test("a proposed window can only target a future cycle and registration preserves the draft", () => {
  const draft = { cycle: 4, days: 5, reason: " Give members time " };
  assert.equal(stageProposal(undefined, { ...draft, cycle: 3 }, [4, 5], 3), undefined);
  assert.equal(stageProposal(undefined, { ...draft, days: 3 }, [4, 5], 3), undefined);
  const staged = stageProposal(undefined, draft, [4, 5], 3);
  assert.deepEqual(staged, { cycle: 4, days: 5, reason: "Give members time", phase: "registering" });
  assert.equal(stageProposal(staged, { ...draft, cycle: 5 }, [4, 5], 3), staged);
  assert.deepEqual(registerProposal(staged), { cycle: 4, days: 5, reason: "Give members time" });
  assert.equal(registerProposal(undefined), undefined);
});

test("an exit request records a reason once without changing membership or funds", () => {
  assert.equal(createExitRequest(undefined, " "), undefined);
  const record = createExitRequest(undefined, " Review my commitments ");
  assert.deepEqual(record, { reason: "Review my commitments" });
  assert.equal(createExitRequest(record, "Overwrite"), record);
});
