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
    state.nanites = 2n;
    state.stage = 1;
    const ids = unlockedIdsForState(state);
    for (const id of [
      "materials", "elements", "residuum", "allocations", "research",
      "research:parallel-directives", "projects", "directive:sort", "directive:replicate",
    ]) {
      assert.equal(ids.includes(id), true, `${id} should be revealed`);
    }
    assert.equal(ids.includes("research:relative-allocation"), false);
    assert.equal(ids.includes("directive:research"), false);
  });

  it("round-trips version-twelve mnemonic state", () => {
    const state = createInitialState(7_100_000);
    state.discovery.surveyComplete = true;
    state.discovery.feedstockVisible = true;
    state.seenUnlocks = unlockedIdsForState(state);
    state.mnemonicNanites = 16n;
    state.mnemonicBanks.push({
      id: "bank-test",
      researchId: "cohort-ratio-prognostics",
      nanites: 16n,
      status: "installed",
      startedAt: state.simTime,
      installedAt: state.simTime,
      legacy: false,
    });

    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 12);
    assert.deepEqual(restored.seenUnlocks, unlockedIdsForState(restored));
    assert.equal(restored.mnemonicNanites, 16n);
    assert.equal(restored.mnemonicBanks[0].researchId, "cohort-ratio-prognostics");
  });

  it("acknowledges clicked unlock identifiers once and persists unrelated notices", () => {
    const state = createInitialState(7_200_000);
    state.seenUnlocks.push("substrate");
    assert.equal(acknowledgeUnlockIds(state, ["directive:collect", "substrate", "directive:collect"]), true);
    assert.deepEqual(state.seenUnlocks, ["substrate", "directive:collect"]);
    assert.equal(acknowledgeUnlockIds(state, ["directive:collect"]), false);
  });
});
