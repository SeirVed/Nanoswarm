import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOCATION_SHARE_SCALE,
  NANITE_RECIPE,
  RESEARCH,
  STARTER_DEPOSIT_MATTER,
} from "../src/game/content.js";
import {
  adjustAllocation,
  advanceSimulation,
  queueResearch,
  setDirectiveAllocation,
  startManualJob,
} from "../src/game/engine.js";
import { totalMatter } from "../src/game/matter.js";
import { createInitialState } from "../src/game/state.js";
import { deserializeState, serializeState } from "../src/game/storage.js";

function success(result) {
  assert.equal(result.ok, true, result.reason);
  return result.state;
}

function finishManual(state, directive, durationMs) {
  const started = success(startManualJob(state, directive, state.simTime));
  return advanceSimulation(started, state.simTime + durationMs);
}

function reachSortedStockpile(now = 1_000_000) {
  let state = createInitialState(now);
  state = finishManual(state, "survey", 10_000);
  state = finishManual(state, "collect", 10_000);
  state = finishManual(state, "sort", 12_000);
  return state;
}

describe("cohort simulation", () => {
  it("does not produce fractional or early survey output", () => {
    const initial = createInitialState(1_000);
    const started = success(startManualJob(initial, "survey", 1_000));
    const almost = advanceSimulation(started, 10_999);
    assert.equal(almost.discovery.surveyComplete, false);
    assert.equal(almost.cohorts.length, 1);

    const complete = advanceSimulation(almost, 11_000);
    assert.equal(complete.discovery.surveyComplete, true);
    assert.equal(complete.cohorts.length, 0);
    assert.equal(complete.nanites, 1n);
  });

  it("keeps collected matter conserved through sorting", () => {
    const state = reachSortedStockpile();
    const identified = Object.values(state.atoms).reduce((sum, value) => sum + value, 0n);
    assert.equal(identified + totalMatter(state.residuum), 10_000n);
    assert.deepEqual(state.atoms, { carbon: 6_000n, silicon: 2_500n, copper: 1_000n, gold: 300n });
    assert.equal(state.residuum.unknown, 200n);
  });

  it("reserves collection matter at job start without destroying it", () => {
    let state = createInitialState(2_000);
    state = finishManual(state, "survey", 10_000);
    const before = totalMatter(state.activeDeposit.matter);
    const started = success(startManualJob(state, "collect", state.simTime));
    const reserved = totalMatter(started.cohorts[0].payload.matter);
    assert.equal(totalMatter(started.activeDeposit.matter) + reserved, before);
    assert.equal(totalMatter(started.feedstock), 0n);
  });

  it("consumes one exact recipe and creates one whole nanite at completion", () => {
    const sorted = reachSortedStockpile();
    const started = success(startManualJob(sorted, "replicate", sorted.simTime));
    assert.equal(started.nanites, 1n);
    assert.equal(started.energy, 0n);
    assert.equal(started.atoms.carbon, 6_000n - NANITE_RECIPE.atoms.carbon);

    const complete = advanceSimulation(started, sorted.simTime + 55_000);
    assert.equal(complete.nanites, 2n);
    assert.equal(complete.discovery.directivesVisible, true);
  });

  it("produces identical state for event-jump and stepped progression", () => {
    const sorted = reachSortedStockpile();
    let seeded = finishManual(sorted, "replicate", 55_000);
    seeded = success(adjustAllocation(seeded, "collect", 1n, seeded.simTime));
    seeded = success(adjustAllocation(seeded, "energy", 1n, seeded.simTime));

    const end = seeded.simTime + 60_000;
    const jumped = advanceSimulation(seeded, end);
    let stepped = seeded;
    for (let at = seeded.simTime + 1_000; at <= end; at += 1_000) stepped = advanceSimulation(stepped, at);
    assert.equal(serializeState(stepped), serializeState(jumped));
  });

  it("merges allocation changes made inside the 500ms synchronization window", () => {
    const now = 2_000_000;
    let state = createInitialState(now);
    state.nanites = 16n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;

    state = success(adjustAllocation(state, "collect", 1n, now));
    state = success(adjustAllocation(state, "collect", 1n, now + 100));

    const collectCohorts = state.cohorts.filter((cohort) => cohort.directive === "collect");
    assert.equal(collectCohorts.length, 1);
    assert.equal(collectCohorts[0].workers, 2n);
    assert.equal(collectCohorts[0].startedAt, now + 500);
  });

  it("pulls adjacent same-job cohorts into resonance after a completion boundary", () => {
    const now = 3_000_000;
    let state = createInitialState(now);
    state.nanites = 2n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;

    state = success(adjustAllocation(state, "collect", 1n, now));
    state = success(adjustAllocation(state, "collect", 1n, now + 600));
    assert.equal(state.cohorts.filter((cohort) => cohort.directive === "collect").length, 2);

    state = advanceSimulation(state, now + 10_500);
    state = advanceSimulation(state, now + 11_000);
    const resonant = state.cohorts.filter((cohort) => cohort.directive === "collect");
    assert.equal(resonant.length, 1);
    assert.equal(resonant[0].workers, 2n);
    assert.equal(resonant[0].startedAt, now + 11_000);
  });

  it("uses at least 100 nanite-equivalents from computronium research", () => {
    const sorted = reachSortedStockpile();
    const queued = success(queueResearch(sorted, "parallel-directives", sorted.simTime));
    const duration = Number(RESEARCH["parallel-directives"].requiredNaniteMs / 100n);
    const almost = advanceSimulation(queued, sorted.simTime + duration - 1);
    assert.equal(almost.completedResearch.includes("parallel-directives"), false);
    const complete = advanceSimulation(almost, sorted.simTime + duration);
    assert.equal(complete.completedResearch.includes("parallel-directives"), true);
  });

  it("scales computronium research contribution to 1% when that exceeds 100", () => {
    const state = reachSortedStockpile();
    state.nanites = 20_000n;
    const queued = success(queueResearch(state, "parallel-directives", state.simTime));
    const duration = Number(RESEARCH["parallel-directives"].requiredNaniteMs / 200n);
    const complete = advanceSimulation(queued, state.simTime + duration);
    assert.equal(complete.completedResearch.includes("parallel-directives"), true);
  });

  it("unlocks relative allocation research at twelve nanites", () => {
    const state = reachSortedStockpile();
    state.energy = 1_000n;
    state.nanites = 11n;
    const locked = queueResearch(state, "relative-allocation", state.simTime);
    assert.equal(locked.ok, false);
    state.nanites = 12n;
    const queued = queueResearch(state, "relative-allocation", state.simTime);
    assert.equal(queued.ok, true, queued.reason);
  });

  it("redistributes relative allocations without disturbing locked directives", () => {
    const state = createInitialState(4_000_000);
    state.nanites = 100n;
    state.discovery.directivesVisible = true;
    state.completedResearch.push("relative-allocation");
    state.allocations.collect = 40n;
    state.allocations.sort = 30n;
    state.allocations.energy = 30n;
    state.allocationTargets.collect = (ALLOCATION_SHARE_SCALE * 40n) / 100n;
    state.allocationTargets.sort = (ALLOCATION_SHARE_SCALE * 30n) / 100n;
    state.allocationTargets.energy = (ALLOCATION_SHARE_SCALE * 30n) / 100n;
    state.allocationLocks.energy = true;

    const result = setDirectiveAllocation(state, "collect", 70n, state.simTime);
    assert.equal(result.ok, true, result.reason);
    assert.equal(result.state.allocations.collect, 70n);
    assert.equal(result.state.allocations.sort, 0n);
    assert.equal(result.state.allocations.energy, 30n);
  });

  it("auto-allocates newly replicated nanites to persistent relative targets", () => {
    const now = 6_000_000;
    const state = createInitialState(now);
    state.nanites = 100n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state.completedResearch.push("relative-allocation");
    state.allocations.collect = 50n;
    state.allocations.replicate = 50n;
    state.allocationTargets.collect = ALLOCATION_SHARE_SCALE / 2n;
    state.allocationTargets.replicate = ALLOCATION_SHARE_SCALE / 2n;
    state.energy = NANITE_RECIPE.energy * 125n;
    for (const [key, amount] of Object.entries(NANITE_RECIPE.atoms)) state.atoms[key] = amount * 125n;

    const complete = advanceSimulation(state, now + 55_500);
    assert.equal(complete.nanites, 150n);
    assert.equal(complete.allocations.collect, 75n);
    assert.equal(complete.allocations.replicate, 75n);
  });

  it("migrates legacy deposits without erasing material already collected", () => {
    const state = createInitialState(5_000_000);
    state.version = 1;
    state.activeDeposit.matter = {
      carbon: 3_000_000n - 1_234n,
      silicon: 1_250_000n,
      copper: 500_000n,
      gold: 150_000n,
      unknown: 100_000n,
    };
    state.activeDeposit.initialAtoms = 5_000_000n;
    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 3);
    assert.equal(restored.activeDeposit.matter.carbon, STARTER_DEPOSIT_MATTER.carbon - 1_234n);
    assert.equal(restored.activeDeposit.initialAtoms, totalMatter(STARTER_DEPOSIT_MATTER));
  });

  it("migrates completed relative allocations into persistent targets", () => {
    const state = createInitialState(5_500_000);
    state.version = 2;
    delete state.allocationTargets;
    state.nanites = 100n;
    state.completedResearch.push("relative-allocation");
    state.allocations.collect = 65n;
    state.allocations.energy = 25n;

    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 3);
    assert.equal(restored.allocationTargets.collect, (ALLOCATION_SHARE_SCALE * 65n) / 100n);
    assert.equal(restored.allocationTargets.energy, (ALLOCATION_SHARE_SCALE * 25n) / 100n);
  });

  it("round-trips bigint state through the versioned save codec", () => {
    const state = reachSortedStockpile();
    const restored = deserializeState(serializeState(state));
    assert.deepEqual(restored, state);
    assert.equal(typeof restored.atoms.gold, "bigint");
  });
});
