import test from "node:test";
import assert from "node:assert/strict";
import { cloneNanitePlan } from "../src/design/nanite.js";
import { generateNaniteModel } from "../src/design/nanite-model.js";
import { analyseNaniteTopology } from "../src/design/nanite-topology.js";

test("topology analysis uses repeatable authored valence-limited bonds", () => {
  const model = generateNaniteModel(cloneNanitePlan());
  const first = analyseNaniteTopology(model);
  const second = analyseNaniteTopology(generateNaniteModel(cloneNanitePlan()));
  assert.equal(first.bondCount, second.bondCount);
  assert.deepEqual([...first.kinds], [...second.kinds]);
  assert.equal(first.kinds.length, first.bondCount);
  assert.ok([...first.lengthsNm].every((length) => length >= 0.11 && length <= 0.31));
  assert.equal(first.authored, true);
  assert.ok(first.bondCount > 0);
  assert.equal(first.overCoordinated, 0);
  assert.equal(first.isolated, 0);
  assert.ok([...first.orders].some((order) => order === 2));
  const shellAttachments = new Set();
  for (let index = 0; index < first.pairs.length; index += 2) {
    const left = model.module[first.pairs[index]];
    const right = model.module[first.pairs[index + 1]];
    if (left === 0 && right !== 0) shellAttachments.add(right);
    if (right === 0 && left !== 0) shellAttachments.add(left);
  }
  assert.deepEqual([...shellAttachments].sort((left, right) => left - right), [1, 2, 3, 4, 5]);
  for (let index = 0; index < model.count; index += 1) assert.ok(first.degree[index] <= model.valence[model.element[index]]);
});
