import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_BRIDGE_REVIEW, MASS_HORIZONS, SWARM_STAGES } from "../src/design/horizons.js";

describe("mass-horizon design spine", () => {
  it("covers every order of magnitude from 0.1 grams through one gigaton", () => {
    assert.equal(MASS_HORIZONS.length, 17);
    assert.deepEqual(MASS_HORIZONS.map((item) => item.totalMass), [
      "0.1 g", "1 g", "10 g", "100 g", "1 kg", "10 kg", "100 kg", "1 t", "10 t",
      "100 t", "1 kt", "10 kt", "100 kt", "1 Mt", "10 Mt", "100 Mt", "1 Gt",
    ]);
    assert.deepEqual(MASS_HORIZONS.map((item) => item.order), [...MASS_HORIZONS.keys()]);
  });

  it("assigns the complete seven-stage progression without moving backwards", () => {
    assert.equal(SWARM_STAGES.length, 7);
    assert.deepEqual(SWARM_STAGES.map((stage) => stage.id), [0, 1, 2, 3, 4, 5, 6]);
    for (let index = 1; index < MASS_HORIZONS.length; index += 1) {
      assert.ok(MASS_HORIZONS[index].stage >= MASS_HORIZONS[index - 1].stage);
    }
    assert.equal(MASS_HORIZONS[0].stage, 0);
    assert.equal(MASS_HORIZONS.at(-1).stage, 6);
  });

  it("gives every source a provenance rule and every horizon a causal observation", () => {
    for (const item of MASS_HORIZONS) {
      assert.ok(item.residuumLot.length > 0, `${item.id} needs a Residuum rule`);
      assert.ok(item.observation.length > 0, `${item.id} needs an observation`);
      assert.ok(item.research.length > 0, `${item.id} needs a capability pathway`);
      assert.ok(item.losses.length > 0, `${item.id} needs an entropy statement`);
      assert.ok(item.humanResponse.length > 0, `${item.id} needs a response statement`);
    }
    assert.match(DEFAULT_BRIDGE_REVIEW, /Relative Directive Allocation/);
    assert.match(DEFAULT_BRIDGE_REVIEW, /Spectral Binning/);
  });
});
