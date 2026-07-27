import test from "node:test";
import assert from "node:assert/strict";
import { cloneNanitePlan } from "../src/design/nanite.js";
import { generateNaniteModel } from "../src/design/nanite-model.js";
import { analyseNaniteTopology } from "../src/design/nanite-topology.js";

test("topology analysis produces repeatable bounded display bonds", () => {
  const first = analyseNaniteTopology(generateNaniteModel(cloneNanitePlan()));
  const second = analyseNaniteTopology(generateNaniteModel(cloneNanitePlan()));
  assert.equal(first.bondCount, second.bondCount);
  assert.ok(first.bondCount > 0 && first.bondCount <= 16000);
  assert.equal(first.pairs.length, first.bondCount * 2);
});
