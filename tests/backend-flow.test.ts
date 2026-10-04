import test from "node:test";
import assert from "node:assert/strict";
import { createVerifierService } from "../lib/verifier";

test("false platform result is submitted and prevents release; true later releases", async () => {
  let platformResult = false, stored: boolean | undefined, released = false;
  const verifier = createVerifierService(
    async (conditionId, dealId) => ({ conditionId, dealId, result: platformResult, createdAt: Date.now() }),
    async (_dealId, _conditionId, result) => { stored = result; return "fake-devnet-signature"; }
  );
  const release = () => { if (stored !== true) throw new Error("Condition result is false"); released = true; };
  const first = await verifier.verifyAndSubmitCondition({ dealId: 1, conditionId: "housing_fifty_percent_done" });
  assert.equal(first.result, false); assert.equal(stored, false); assert.throws(release, /false/);
  platformResult = true;
  const second = await verifier.verifyAndSubmitCondition({ dealId: 1, conditionId: "housing_fifty_percent_done" });
  assert.equal(second.result, true); release(); assert.equal(released, true);
});
