import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESEARCH, emptyMatter } from "../src/game/content.js";
import {
  adjustAllocation,
  advanceSimulation,
  cancelResearch,
  maximumMnemonicCommitment,
  moveResearch,
  queueResearch,
  researchCapacityHundredths,
  toggleResearchPause,
} from "../src/game/engine.js";
import { totalMatter } from "../src/game/matter.js";
import { createInitialState } from "../src/game/state.js";

function success(result) {
  assert.equal(result.ok, true, result.reason);
  return result.state;
}

function researchReadyState(now = 8_000_000, nanites = 180n) {
  const state = createInitialState(now);
  state.nanites = nanites;
  state.stage = 1;
  state.discovery.surveyComplete = true;
  state.discovery.directivesVisible = true;
  state.discovery.researchVisible = true;
  state.completedResearch.push("parallel-directives", "relative-allocation");
  return state;
}

describe("Research v2 mnemonic substrate", () => {
  it("uses a fixed core, assigned researchers, and exactly one percent of installed banks", () => {
    const state = researchReadyState();
    state.nanites = 8_000_000_000_000_000_000n;
    assert.equal(researchCapacityHundredths(state), 10_000n);

    state.allocations.research = 7n;
    state.mnemonicBanks = 123n;
    assert.equal(researchCapacityHundredths(state), 10_823n);

    state.nanites *= 1_000_000n;
    assert.equal(researchCapacityHundredths(state), 10_823n);
  });

  it("enforces the one-lower-exponent physical commitment ceiling", () => {
    assert.equal(maximumMnemonicCommitment(9n), 0n);
    assert.equal(maximumMnemonicCommitment(12n), 9n);
    assert.equal(maximumMnemonicCommitment(180n), 90n);
    assert.equal(maximumMnemonicCommitment(8n * 10n ** 30n), 9n * 10n ** 29n);
    assert.equal(maximumMnemonicCommitment(10n ** 30n - 1n), 9n * 10n ** 28n);
  });

  it("queues free intent, then commits nanites and energy only when formation can begin", () => {
    let state = researchReadyState();
    state.energy = 0n;
    state = success(queueResearch(state, "cohort-ratio-prognostics", state.simTime));
    assert.equal(state.researchQueue[0].status, "queued");
    assert.equal(state.nanites, 180n);

    state.energy = RESEARCH["cohort-ratio-prognostics"].cost.energy;
    state = advanceSimulation(state, state.simTime + 1);
    assert.equal(state.researchQueue[0].status, "forming");
    assert.equal(state.nanites, 179n);
    assert.equal(state.energy, 0n);
    assert.equal(state.lifetime.energySpent, RESEARCH["cohort-ratio-prognostics"].cost.energy);
  });

  it("installs completed banks permanently and activates their one-percent cognition", () => {
    let state = researchReadyState();
    state.energy = RESEARCH["cohort-ratio-prognostics"].cost.energy;
    state = success(queueResearch(state, "cohort-ratio-prognostics", state.simTime));
    const end = state.simTime + Number(RESEARCH["cohort-ratio-prognostics"].requiredNaniteMs / 100n);
    state = advanceSimulation(state, end);

    assert.equal(state.researchQueue.length, 0);
    assert.equal(state.mnemonicBanks, 1n);
    assert.equal(state.completedResearch.includes("cohort-ratio-prognostics"), true);
    assert.equal(researchCapacityHundredths(state), 10_001n);
  });

  it("allows irreversible formation to pause but never cancel or reorder", () => {
    let state = researchReadyState();
    state.energy = RESEARCH["cohort-ratio-prognostics"].cost.energy;
    state = success(queueResearch(state, "cohort-ratio-prognostics", state.simTime));
    state = success(toggleResearchPause(state, "cohort-ratio-prognostics", state.simTime));
    const progress = state.researchQueue[0].progressCentinaniteMs;
    state = advanceSimulation(state, state.simTime + 60_000);
    assert.equal(state.researchQueue[0].progressCentinaniteMs, progress);
    assert.equal(cancelResearch(state, "cohort-ratio-prognostics", state.simTime).ok, false);
    assert.equal(moveResearch(state, "cohort-ratio-prognostics", 1, state.simTime).ok, false);

    state = success(toggleResearchPause(state, "cohort-ratio-prognostics", state.simTime));
    state = advanceSimulation(state, state.simTime + 300_000);
    assert.equal(state.completedResearch.includes("cohort-ratio-prognostics"), true);
  });

  it("contains only authored opening capabilities and no generated tier IDs", () => {
    assert.deepEqual(Object.keys(RESEARCH), [
      "parallel-directives",
      "relative-allocation",
      "cohort-ratio-prognostics",
      "residuum-indexing",
      "phase-locked-directive-bus",
      "ferromagnetic-phase-analysis",
      "atmospheric-spectroscopy",
      "atmospheric-fractionation",
    ]);
    assert.equal(Object.keys(RESEARCH).some((id) => /-\d\d$/.test(id)), false);
    assert.equal(RESEARCH["parallel-directives"].restoredFirmware, true);
    assert.equal(RESEARCH["parallel-directives"].cost.mnemonicNanites, 0n);
  });

  it("keeps waiting intent editable without refunds because nothing was committed", () => {
    let state = researchReadyState(8_100_000, 1_000n);
    state.stage = 2;
    state.prospecting.searchesCompleted = 4;
    state.discovery.atmosphereVisible = true;
    state.completedResearch.push("residuum-indexing");
    state.energy = 0n;
    state = success(queueResearch(state, "ferromagnetic-phase-analysis", state.simTime));
    state = success(queueResearch(state, "atmospheric-spectroscopy", state.simTime));
    state = success(moveResearch(state, "atmospheric-spectroscopy", -1, state.simTime));
    assert.deepEqual(state.researchQueue.map((item) => item.id), [
      "atmospheric-spectroscopy",
      "ferromagnetic-phase-analysis",
    ]);
    state = success(cancelResearch(state, "ferromagnetic-phase-analysis", state.simTime));
    assert.deepEqual(state.researchQueue.map((item) => item.id), ["atmospheric-spectroscopy"]);
    assert.equal(state.nanites, 1_000n);
  });
});

describe("catalogued matter pathways", () => {
  it("recovers newly catalogued iron by physically re-sorting conserved Residuum", () => {
    let state = createInitialState(8_200_000);
    state.nanites = 1n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state.discovery.feedstockVisible = true;
    state.discovery.elementsVisible = true;
    state.discovery.residuumVisible = true;
    state.discovery.residuumIndexed = true;
    state.discovery.ironCatalogued = true;
    state.residuum = { ...emptyMatter(), iron: 100n, oxygen: 900n };
    state = success(adjustAllocation(state, "sort", 1n, state.simTime));
    state = advanceSimulation(state, state.simTime + 12_500);

    assert.equal(state.atoms.iron, 100n);
    assert.equal(state.residuum.iron, 0n);
    assert.equal(state.residuum.oxygen, 900n);
    assert.equal(totalMatter(state.lifetime.processed), 0n);
  });

  it("keeps harvested gas out of Feedstock and Residuum, then separates future captures", () => {
    let state = createInitialState(8_300_000);
    state.nanites = 1n;
    state.stage = 2;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state.discovery.researchVisible = true;
    state.discovery.atmosphereVisible = true;
    state = success(adjustAllocation(state, "atmosphere", 1n, state.simTime));
    state = advanceSimulation(state, state.simTime + 10_500);
    state = success(adjustAllocation(state, "atmosphere", -1n, state.simTime));
    state = advanceSimulation(state, state.simTime + 10_500);
    const capturedBefore = totalMatter(state.capturedAtmosphere);
    assert.equal(capturedBefore, 200n);
    assert.equal(totalMatter(state.feedstock), 0n);
    assert.equal(totalMatter(state.residuum), 0n);

    state.nanites = 1_000n;
    state.prospecting.searchesCompleted = 4;
    state.completedResearch.push("parallel-directives", "relative-allocation", "residuum-indexing");
    state.energy = RESEARCH["atmospheric-spectroscopy"].cost.energy;
    state = success(queueResearch(state, "atmospheric-spectroscopy", state.simTime));
    state = advanceSimulation(state, state.simTime + 6_000_000);
    assert.equal(state.discovery.atmosphereCatalogued, true);
    assert.equal(totalMatter(state.capturedAtmosphere), capturedBefore);

    state.energy = RESEARCH["atmospheric-fractionation"].cost.energy;
    state = success(queueResearch(state, "atmospheric-fractionation", state.simTime));
    state = advanceSimulation(state, state.simTime + 40_000_000);
    state = success(adjustAllocation(state, "atmosphere", 1n, state.simTime));
    state = advanceSimulation(state, state.simTime + 10_500);

    assert.equal(totalMatter(state.capturedAtmosphere), capturedBefore);
    assert.ok(state.atoms.nitrogen > 0n);
    assert.ok(state.atoms.oxygen > 0n);
    assert.ok(state.atoms.argon > 0n);
    assert.equal(totalMatter(state.residuum), 0n);
  });
});
