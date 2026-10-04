import test from "node:test";
import assert from "node:assert/strict";
import { FOUNDATION_CONDITION_ID, getPlatformState, initializeConstructionChecklist, isFoundationMilestoneComplete, updateConstructionCheck, verifyCondition } from "../lib/platform";
import { createVerifierService } from "../lib/verifier";
import { canRelease, releaseLabel, requestRelease, SAFE_RELEASE_ERROR } from "../lib/spacetime/release-state";

const allCheckIds = ["permit_uploaded", "blueprint_uploaded", "progress_evidence_approved", "contractor_approved", "inspector_approved"] as const;

test("release is gated by the live true result, ready status, deal link, and idle submission", () => {
  assert.equal(canRelease(false, "ready", true, false), false);
  assert.equal(canRelease(true, "idle", true, false), false);
  assert.equal(canRelease(true, "ready", false, false), false);
  assert.equal(canRelease(true, "ready", true, true), false);
  assert.equal(canRelease(true, "ready", true, false), true);
  assert.equal(releaseLabel(false, "ready"), "Settlement locked");
  assert.equal(releaseLabel(true, "confirmed"), "Funds released on Devnet");
  assert.equal(releaseLabel(true, "failed"), "Release failed");
  assert.equal(SAFE_RELEASE_ERROR, "Release failed. Check the deal state and retry.");
});

test("release client accepts a real signature and masks API failure details", async () => {
  const success = await requestRelease(77, async (_input, init) => {
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { dealId: 77 });
    return Response.json({ signature: "devnet-signature" });
  });
  assert.equal(success, "devnet-signature");
  await assert.rejects(() => requestRelease(77, async () => Response.json({ error: "internal RPC details" }, { status: 500 })), new RegExp(SAFE_RELEASE_ERROR));
});

test("checklists calculate false for zero or four checks and true for all five", () => {
  initializeConstructionChecklist(101);
  assert.equal(isFoundationMilestoneComplete(getPlatformState(101).checks), false);
  for (const checkId of allCheckIds.slice(0, 4)) updateConstructionCheck(101, checkId);
  assert.equal(isFoundationMilestoneComplete(getPlatformState(101).checks), false);
  updateConstructionCheck(101, "inspector_approved");
  assert.equal(isFoundationMilestoneComplete(getPlatformState(101).checks), true);
});

test("unknown checks are rejected and checklist state is scoped to its deal", () => {
  initializeConstructionChecklist(102); initializeConstructionChecklist(103);
  assert.throws(() => updateConstructionCheck(102, "not_a_check"), /Unknown/);
  updateConstructionCheck(102, "permit_uploaded");
  assert.equal(getPlatformState(102).checks.permit_uploaded, true);
  assert.equal(getPlatformState(103).checks.permit_uploaded, false);
});

test("verifier independently reads platform state; false locks and later true permits release", async () => {
  initializeConstructionChecklist(104);
  let stored: boolean | undefined; let released = false; let submittedResult: boolean | undefined;
  const verifier = createVerifierService(verifyCondition, async (_dealId, _conditionId, result) => { submittedResult = result; stored = result; return "mock-signature"; });
  const release = () => { if (stored !== true) throw new Error("Condition result is false"); if (released) throw new Error("Already released"); released = true; };
  // An extra frontend-style boolean is ignored because the verifier accepts no result parameter.
  const first = await verifier.verifyAndSubmitCondition({ dealId: 104, conditionId: FOUNDATION_CONDITION_ID, result: true } as any);
  assert.equal(first.result, false); assert.equal(submittedResult, false); assert.equal(first.checks.length, 5); assert.throws(release, /false/);
  for (const checkId of allCheckIds) updateConstructionCheck(104, checkId);
  const second = await verifier.verifyAndSubmitCondition({ dealId: 104, conditionId: FOUNDATION_CONDITION_ID });
  assert.equal(second.result, true); release(); assert.equal(released, true); assert.throws(release, /Already released/);
});

test("mock settlement preserves the stored amount and rejects unauthorized verification", async () => {
  initializeConstructionChecklist(105);
  for (const checkId of allCheckIds) updateConstructionCheck(105, checkId);
  const amount = 100_000_000; let recipientBalance = 7; let stored = false;
  const verifier = createVerifierService(verifyCondition, async (_dealId, _conditionId, result) => { stored = result; return "mock-signature"; });
  await verifier.verifyAndSubmitCondition({ dealId: 105, conditionId: FOUNDATION_CONDITION_ID });
  assert.equal(stored, true); recipientBalance += amount; assert.equal(recipientBalance, amount + 7);
  const unauthorized = createVerifierService(verifyCondition, async () => { throw new Error("Unauthorized verifier submission"); });
  await assert.rejects(() => unauthorized.verifyAndSubmitCondition({ dealId: 105, conditionId: FOUNDATION_CONDITION_ID }), /Unauthorized/);
});
