import test from "node:test";
import assert from "node:assert/strict";
import { cloneNanitePlan } from "../src/design/nanite.js";
import { generateNaniteModel } from "../src/design/nanite-model.js";

test("N0 coordinates are deterministic and retain exact element and module counts", () => {
  const first = generateNaniteModel(cloneNanitePlan());
  const second = generateNaniteModel(cloneNanitePlan());
  assert.equal(first.count, 5575);
  assert.deepEqual([...first.position], [...second.position]);
  assert.deepEqual([...first.element], [...second.element]);
  assert.deepEqual([...first.module].filter((value) => value === 0).length, 3000);
  assert.deepEqual([...first.element].filter((value) => value === 0).length, 5000);
  assert.ok(first.bounds.size.every((value) => Number.isFinite(value) && value > 0));
  assert.equal(first.passivation.count, second.passivation.count);
  assert.ok(first.passivation.count > 0);
  assert.equal(first.physicalAtomCount, first.count + first.passivation.count);
});
