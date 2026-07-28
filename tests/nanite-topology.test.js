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
  assert.equal(first.authored, true);
  assert.ok(first.bondCount > 0);
  assert.equal(first.overCoordinated, 0);
  for (let index = 0; index < model.count; index += 1) assert.ok(first.degree[index] <= model.valence[model.element[index]]);
});
