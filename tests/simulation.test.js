import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOCATION_SHARE_SCALE,
  ATMOSPHERE_ATOMS_PER_NANITE,
  COLLECTION_ATOMS_PER_NANITE,
  NANITE_RECIPE,
  RESEARCH,
  STARTER_DEPOSIT_MATTER,
  createProspectedDeposit,
} from "../src/game/content.js";
import {
  adjustAllocation,
  atmosphericCollectionCapacity,
  advanceSimulation,
  cancelResearch,
  cohortResonanceWindow,
  cohortSyncWindow,
  effectiveJobDuration,
  effectiveResearchCapacity,
  energyJobYield,
  moveResearch,
  queueResearch,
  setDirectiveAllocation,
  solidCollectionCapacity,
  sortingCapacity,
  startManualJob,
  startProspecting,
} from "../src/game/engine.js";
import { totalMatter } from "../src/game/matter.js";
import { activeWorkers, createInitialState } from "../src/game/state.js";
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
  it("derives the observed six-hundred-quadrillion swarm boundary from starter carbon", () => {
    assert.equal(
      STARTER_DEPOSIT_MATTER.carbon / NANITE_RECIPE.atoms.carbon,
      600_000_000_000_000_000n,
    );
  });

  it("keeps every successive prospected field larger than its predecessor", () => {
    let previous = totalMatter(STARTER_DEPOSIT_MATTER);
    for (let index = 1; index <= 12; index += 1) {
      const current = totalMatter(createProspectedDeposit(index).matter);
      assert.ok(current > previous, `deposit ${index} should exceed the preceding field`);
      previous = current;
    }
  });

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

  it("classifies discoveries above routine job completions", () => {
    const state = reachSortedStockpile();
    const survey = state.log.find((entry) => entry.message === "SUBSTRATE SURVEY COMPLETE.");
    const collection = state.log.find((entry) => entry.message.startsWith("COLLECTION RUN COMPLETE"));
    const sorting = state.log.find((entry) => entry.message.startsWith("SORTING RUN COMPLETE"));
    assert.equal(survey.tier, "medium");
    assert.equal(collection.tier, "info");
    assert.equal(sorting.tier, "info");
  });

  it("keeps collected matter conserved through sorting", () => {
    const state = reachSortedStockpile();
    const identified = Object.values(state.atoms).reduce((sum, value) => sum + value, 0n);
    assert.equal(identified + totalMatter(state.residuum), 10_000n);
    assert.deepEqual(state.atoms, { carbon: 6_000n, silicon: 2_500n, copper: 1_000n, gold: 300n });
    assert.equal(state.residuum.unknown, 200n);
  });

  it("unlocks diffuse atmospheric harvesting when prospecting begins", () => {
    const now = 1_500_000;
    let state = createInitialState(now);
    state.discovery.surveyComplete = true;
    state.activeDeposit.matter = { carbon: 0n, silicon: 0n, copper: 0n, gold: 0n, unknown: 0n };

    state = success(startProspecting(state, now));
    assert.equal(state.discovery.atmosphereVisible, true);
    assert.equal(state.cohorts.some((cohort) => cohort.directive === "prospect"), true);
    assert.equal(
      state.log.some((entry) => entry.message.includes("DIFFUSE COLLECTION RATE 1.00%")),
      true,
    );

    state = advanceSimulation(state, now + 30_000);
    assert.equal(state.activeDeposit.id, "prospected-1");
    assert.equal(state.prospecting.searchesCompleted, 1);
    assert.equal(totalMatter(state.activeDeposit.matter), totalMatter(createProspectedDeposit(1).matter));
  });

  it("collects atmosphere at exactly one percent of base solid payload", () => {
    const now = 1_750_000;
    let state = createInitialState(now);
    state.nanites = 2n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state.discovery.atmosphereVisible = true;
    state = success(adjustAllocation(state, "atmosphere", 1n, now));
    state = advanceSimulation(state, now + 10_500);
    assert.equal(totalMatter(state.feedstock), ATMOSPHERE_ATOMS_PER_NANITE);
    assert.equal(ATMOSPHERE_ATOMS_PER_NANITE * 100n, COLLECTION_ATOMS_PER_NANITE);
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

  it("catches up long offline spans without rejecting a valid busy swarm", () => {
    const now = 2_500_000;
    let state = createInitialState(now);
    state.nanites = 10n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state = success(adjustAllocation(state, "energy", 10n, now));

    const target = now + 20 * 86_400_000;
    const caughtUp = advanceSimulation(state, target);
    assert.equal(caughtUp.simTime, target);
    assert.ok(caughtUp.energy > state.energy);
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

  it("holds returned workers for a nearby same-job phase and restores one resonant cohort", () => {
    const now = 3_000_000;
    let state = createInitialState(now);
    state.nanites = 2n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;

    state = success(adjustAllocation(state, "collect", 1n, now));
    state = success(adjustAllocation(state, "collect", 1n, now + 1_600));
    assert.equal(state.cohorts.filter((cohort) => cohort.directive === "collect").length, 2);

    state = advanceSimulation(state, now + 10_500);
    assert.equal(state.cohorts.filter((cohort) => cohort.directive === "collect").length, 1);
    state = advanceSimulation(state, now + 12_000);
    const resonant = state.cohorts.filter((cohort) => cohort.directive === "collect");
    assert.equal(resonant.length, 1);
    assert.equal(resonant[0].workers, 2n);
    assert.equal(resonant[0].startedAt, now + 12_500);
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

  it("does not double-count workers reassigned from an indivisible cohort into research", () => {
    const now = 3_250_000;
    let state = createInitialState(now);
    state.nanites = 2n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state = success(adjustAllocation(state, "collect", 2n, now));
    state = success(adjustAllocation(state, "collect", -2n, now + 100));
    state = success(adjustAllocation(state, "research", 2n, state.simTime));

    assert.equal(activeWorkers(state), 2n);
    assert.equal(effectiveResearchCapacity(state), 100n);
    state = advanceSimulation(state, now + 10_500);
    assert.equal(effectiveResearchCapacity(state), 102n);
  });

  it("completes relative allocation research in two and a half minutes on base computronium", () => {
    const state = createInitialState(3_300_000);
    assert.equal(effectiveResearchCapacity(state), 100n);
    assert.equal(RESEARCH["relative-allocation"].requiredNaniteMs / 100n, 150_000n);
  });

  it("scales computronium research contribution to 1% when that exceeds 100", () => {
    const state = reachSortedStockpile();
    state.nanites = 20_000n;
    const queued = success(queueResearch(state, "parallel-directives", state.simTime));
    const duration = Number(RESEARCH["parallel-directives"].requiredNaniteMs / 200n);
    const complete = advanceSimulation(queued, state.simTime + duration);
    assert.equal(complete.completedResearch.includes("parallel-directives"), true);
  });

  it("applies the expanded research effects to real simulation capacities", () => {
    const state = createInitialState(3_500_000);
    state.nanites = 10_000n;
    state.completedResearch.push(
      "payload-frame-reinforcement",
      "atmospheric-fractionation",
      "packetized-sorting",
      "capacitive-buffer-lattice",
      "rf-scavenging",
      "route-memory",
      "local-material-caches",
      "phase-locked-directive-bus",
      "distributed-computronium",
      "directive-compilation",
      "specialized-morphologies",
    );

    assert.equal(solidCollectionCapacity(state), 11_000n);
    assert.equal(atmosphericCollectionCapacity(state), 115n);
    assert.equal(sortingCapacity(state), 11_000n);
    assert.equal(energyJobYield(state), 46n);
    assert.equal(effectiveJobDuration(state, "collect"), 8_500);
    assert.equal(cohortSyncWindow(state), 100);
    assert.equal(cohortResonanceWindow(state), 8_000);
    assert.equal(effectiveResearchCapacity(state), 200n);
  });

  it("does not rewrite a cohort payload when research completes after reservation", () => {
    const now = 3_600_000;
    let state = createInitialState(now);
    state.nanites = 2n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state = success(adjustAllocation(state, "collect", 1n, now));
    const reserved = totalMatter(state.cohorts.find((cohort) => cohort.directive === "collect").payload.matter);
    state.completedResearch.push("payload-frame-reinforcement", "specialized-morphologies");
    const complete = advanceSimulation(state, now + 10_500);
    assert.equal(reserved, COLLECTION_ATOMS_PER_NANITE);
    assert.equal(totalMatter(complete.feedstock), COLLECTION_ATOMS_PER_NANITE);
    assert.equal(solidCollectionCapacity(complete), 11_000n);
  });

  it("stacks repeated five-percent research refinements additively", () => {
    const state = createInitialState(3_700_000);
    state.completedResearch.push(
      "capacitive-buffer-lattice",
      "capacitive-buffer-lattice-02",
      "capacitive-buffer-lattice-03",
      "capacitive-buffer-lattice-04",
      "capacitive-buffer-lattice-05",
      "capacitive-buffer-lattice-06",
    );

    assert.equal(energyJobYield(state), 52n);
  });

  it("accelerates early research further as the swarm compounds", () => {
    const state = createInitialState(3_725_000);
    state.nanites = 12n;
    const initialEta = RESEARCH["relative-allocation"].requiredNaniteMs / effectiveResearchCapacity(state);
    assert.equal(initialEta, 150_000n);

    state.nanites *= 128n;
    state.allocations.research = state.nanites / 2n;
    const compoundedEta = RESEARCH["relative-allocation"].requiredNaniteMs / effectiveResearchCapacity(state);
    assert.ok(compoundedEta < 20_000n);
  });

  it("enforces research prerequisites rather than exposing disconnected upgrades", () => {
    const state = reachSortedStockpile();
    state.energy = 1_000_000n;
    for (const key of Object.keys(state.atoms)) state.atoms[key] = 1_000_000n;
    const result = queueResearch(state, "payload-frame-reinforcement", state.simTime);
    assert.equal(result.ok, false);
    assert.match(result.reason, /Parallel Directive Scheduling/);
  });

  it("reorders queued research without discarding accumulated work", () => {
    let state = reachSortedStockpile(3_740_000);
    state.energy = 1_000n;
    state = success(queueResearch(state, "parallel-directives", state.simTime));
    state = success(queueResearch(state, "expanded-spectral-catalog", state.simTime));
    state = advanceSimulation(state, state.simTime + 1_000);
    const parallelProgress = state.researchQueue[0].progressNaniteMs;

    state = success(moveResearch(state, "expanded-spectral-catalog", -1, state.simTime));
    assert.equal(state.researchQueue[0].id, "expanded-spectral-catalog");
    assert.equal(state.researchQueue[1].id, "parallel-directives");
    assert.equal(state.researchQueue[1].progressNaniteMs, parallelProgress);
  });

  it("cancels research and releases its fully reserved inputs", () => {
    let state = reachSortedStockpile(3_745_000);
    state.energy = 1_000n;
    const before = structuredClone(state);
    state = success(queueResearch(state, "parallel-directives", state.simTime));
    state = success(queueResearch(state, "expanded-spectral-catalog", state.simTime));
    state = advanceSimulation(state, state.simTime + 1_000);
    state = success(cancelResearch(state, "parallel-directives", state.simTime));

    const retainedCost = RESEARCH["expanded-spectral-catalog"].cost;
    assert.equal(state.energy, before.energy - retainedCost.energy);
    for (const key of Object.keys(state.atoms)) {
      assert.equal(state.atoms[key], before.atoms[key] - retainedCost.atoms[key]);
    }
    assert.equal(state.researchQueue.length, 1);
    assert.equal(state.researchQueue[0].id, "expanded-spectral-catalog");
  });

  it("launches autonomous prospecting after a depleted deposit", () => {
    const now = 3_750_000;
    const state = createInitialState(now);
    state.nanites = 2n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state.activeDeposit.matter = { carbon: 0n, silicon: 0n, copper: 0n, gold: 0n, unknown: 0n };
    state.completedResearch.push("autonomous-prospecting");

    const advanced = advanceSimulation(state, now + 1);
    assert.equal(advanced.cohorts.some((cohort) => cohort.directive === "prospect"), true);
    assert.equal(advanced.discovery.atmosphereVisible, true);
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
    assert.equal(restored.version, 6);
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
    assert.equal(restored.version, 6);
    assert.equal(restored.allocationTargets.collect, (ALLOCATION_SHARE_SCALE * 65n) / 100n);
    assert.equal(restored.allocationTargets.energy, (ALLOCATION_SHARE_SCALE * 25n) / 100n);
  });

  it("migrates legacy log entries into significance tiers", () => {
    const state = createInitialState(5_750_000);
    state.version = 3;
    for (const entry of state.log) delete entry.tier;

    const restored = deserializeState(serializeState(state));
    const impact = restored.log.find((entry) => entry.message === "IMPACT.");
    const assembly = restored.log.find((entry) => entry.message === "ASSEMBLY COMPLETE.");
    assert.equal(restored.version, 6);
    assert.equal(impact.tier, "critical");
    assert.equal(assembly.tier, "world");
    assert.equal(restored.log.every((entry) => typeof entry.tier === "string"), true);
  });

  it("migrates the exhausted overnight swarm without changing its nanite count", () => {
    const state = createInitialState(5_900_000);
    state.version = 4;
    state.nanites = 600_000_000_000_000_000n;
    state.discovery.surveyComplete = true;
    state.activeDeposit.matter = { carbon: 0n, silicon: 0n, copper: 0n, gold: 0n, unknown: 0n };
    delete state.allocations.atmosphere;
    delete state.allocationTargets.atmosphere;
    delete state.allocationLocks.atmosphere;
    delete state.depletedDeposits;
    delete state.prospecting;
    delete state.discovery.atmosphereVisible;
    delete state.discovery.exhaustionNotified;
    delete state.discovery.residuumIndexed;

    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 6);
    assert.equal(restored.nanites, 600_000_000_000_000_000n);
    assert.equal(restored.allocations.atmosphere, 0n);
    assert.equal(restored.discovery.atmosphereVisible, false);
    assert.deepEqual(restored.prospecting, { searchesCompleted: 0 });
    const advanced = advanceSimulation(restored, restored.simTime + 1);
    assert.equal(advanced.nanites, 600_000_000_000_000_000n);
    assert.equal(advanced.log.some((entry) => entry.message.includes("SOLID SUBSTRATE EXHAUSTED")), true);
  });

  it("round-trips bigint state through the versioned save codec", () => {
    const state = reachSortedStockpile();
    const restored = deserializeState(serializeState(state));
    assert.deepEqual(restored, state);
    assert.equal(typeof restored.atoms.gold, "bigint");
  });

  it("migrates queued research with an explicit refundable reservation", () => {
    const state = createInitialState(6_100_000);
    state.version = 5;
    state.researchQueue = [{ id: "parallel-directives", progressNaniteMs: 123n }];
    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 6);
    assert.deepEqual(restored.researchQueue[0].reservedCost, RESEARCH["parallel-directives"].cost);
  });
});
