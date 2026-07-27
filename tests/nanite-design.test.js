import test from "node:test";
import assert from "node:assert/strict";
import { N0_SEED_WORKER, atomTotals, cloneNanitePlan, massDa, validateNanitePlan } from "../src/design/nanite.js";

test("the proposed N0 modules exactly conserve the canonical seed recipe", () => {
  assert.deepEqual(atomTotals(N0_SEED_WORKER.modules), N0_SEED_WORKER.recipe);
  const check = validateNanitePlan(N0_SEED_WORKER);
  assert.equal(check.exactRecipe, true);
  assert.deepEqual(check.invalid, []);
  assert.equal(check.massDa, 85745.06425);
});

test("an experimental module edit remains a planner validation failure rather than changing the recipe", () => {
  const draft = cloneNanitePlan();
  draft.modules[0].atoms.carbon -= 1;
  const check = validateNanitePlan(draft);
  assert.equal(check.exactRecipe, false);
  assert.equal(check.deltas.carbon, -1);
  assert.deepEqual(N0_SEED_WORKER.recipe, { carbon: 5000, silicon: 400, copper: 150, gold: 25 });
  assert.equal(massDa(N0_SEED_WORKER.recipe), 85745.06425);
});
