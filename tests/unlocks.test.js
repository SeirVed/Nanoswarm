import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitialState } from "../src/game/state.js";
import { deserializeState, serializeState } from "../src/game/storage.js";
import { acknowledgeUnlockIds, unlockedIdsForState } from "../src/game/unlocks.js";

describe("unlock acknowledgements", () => {
  it("reveals progressive interface targets only when their game signals exist", () => {
    const state = createInitialState(7_000_000);
    assert.deepEqual(unlockedIdsForState(state), []);

    state.discovery.surveyComplete = true;
    assert.deepEqual(unlockedIdsForState(state), ["substrate", "directive:collect", "directive:energy"]);

    state.discovery.feedstockVisible = true;
    state.discovery.elementsVisible = true;
    state.discovery.residuumVisible = true;
    state.discovery.directivesVisible = true;
    state.discovery.researchVisible = true;
    state.discovery.projectsVisible = true;
    const ids = unlockedIdsForState(state);
    for (const id of [
      "materials", "elements", "residuum", "allocations", "research",
      "research:parallel-directives", "projects", "directive:sort", "directive:replicate",
    ]) {
      assert.equal(ids.includes(id), true, `${id} should be revealed`);
    }
    assert.equal(ids.includes("research:relative-allocation"), false);
  });

  it("migrates already-visible version-six features as acknowledged", () => {
    const state = createInitialState(7_100_000);
    state.version = 6;
    state.discovery.surveyComplete = true;
    state.discovery.feedstockVisible = true;
    delete state.seenUnlocks;

    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 7);
    assert.deepEqual(restored.seenUnlocks, unlockedIdsForState(restored));
    assert.equal(restored.seenUnlocks.includes("substrate"), true);
    assert.equal(restored.seenUnlocks.includes("materials"), true);
  });

  it("acknowledges clicked unlock identifiers once and persists unrelated notices", () => {
    const state = createInitialState(7_200_000);
    state.seenUnlocks.push("substrate");
    assert.equal(acknowledgeUnlockIds(state, ["directive:collect", "substrate", "directive:collect"]), true);
    assert.deepEqual(state.seenUnlocks, ["substrate", "directive:collect"]);
    assert.equal(acknowledgeUnlockIds(state, ["directive:collect"]), false);
  });
});
