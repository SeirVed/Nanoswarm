import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOCATION_SHARE_SCALE,
  ATMOSPHERE_ATOMS_PER_NANITE,
  COLLECTION_ATOMS_PER_NANITE,
  FIRST_HORIZON_RESEARCH_MINUTE,
  LOCAL_SHELL_COUNT,
  NANITE_RECIPE,
  RESEARCH,
  STARTER_DEPOSIT_MATTER,
  createProspectedDeposit,
  emptyMatter,
} from "../src/game/content.js";
import {
  adjustAllocation,
  atmosphericCollectionCapacity,
  advanceSimulation,
  cancelResearch,
  cancelTemporaryBurst,
  cohortResonanceWindow,
  cohortSyncWindow,
  effectiveJobDuration,
  effectiveResearchCapacity,
  energyJobYield,
  moveResearch,
  queueResearch,
  replicationPipelineMetrics,
  replicationReadiness,
  replicationShortages,
  researchIsRevealed,
  setDirectiveAllocation,
  solidCollectionCapacity,
  sortingCapacity,
  startManualJob,
  startProspecting,
  startTemporaryBurst,
} from "../src/game/engine.js";
import { totalMatter } from "../src/game/matter.js";
import { massYoctograms } from "../src/game/quantities.js";
import { INFO_LOG_LIMIT, activeWorkers, appendLog, createInitialState } from "../src/game/state.js";
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

function reachStageOneStockpile(now = 1_000_000) {
  const state = reachSortedStockpile(now);
  state.nanites = 2n;
  state.stage = 1;
  state.discovery.directivesVisible = true;
  state.discovery.researchVisible = true;
  return state;
}

function fundResearch(state, ...ids) {
  state.energy = ids.reduce((total, id) => total + RESEARCH[id].cost.energy, 0n);
  for (const key of Object.keys(state.atoms)) {
    state.atoms[key] = ids.reduce((total, id) => total + RESEARCH[id].cost.atoms[key], 0n);
  }
}

describe("cohort simulation", () => {
  it("caps only routine info events while preserving every significant log entry", () => {
    const state = createInitialState(500_000);
    const significant = [
      ["WORLD EVENT", "world"],
      ["CRITICAL EVENT", "critical"],
      ["MEDIUM EVENT", "medium"],
    ];
    for (const [message, tier] of significant) appendLog(state, message, "system", undefined, tier);
    for (let index = 0; index < INFO_LOG_LIMIT + 5; index += 1) appendLog(state, `INFO ${index}`);

    const info = state.log.filter((entry) => entry.tier === "info");
    assert.equal(info.length, INFO_LOG_LIMIT);
    assert.equal(info[0].message, "INFO 5");
    for (const [message, tier] of significant) {
      assert.equal(state.log.some((entry) => entry.message === message && entry.tier === tier), true);
    }
    assert.equal(state.log.some((entry) => entry.message === "ASSEMBLY COMPLETE."), true);
    assert.equal(state.log.some((entry) => entry.message === "IMPACT."), true);
  });

  it("builds the 0.1 gram contact from exact whole nanite recipes", () => {
    const recipes = 702_327_557_648_247_539n;
    for (const [key, atoms] of Object.entries(NANITE_RECIPE.atoms)) {
      assert.equal(STARTER_DEPOSIT_MATTER[key], atoms * recipes);
    }
  });

  it("keeps every successive prospected field larger than its predecessor", () => {
    let previous = totalMatter(STARTER_DEPOSIT_MATTER);
    for (let index = 1; index <= LOCAL_SHELL_COUNT; index += 1) {
      const current = totalMatter(createProspectedDeposit(index).matter);
      assert.ok(current > previous, `deposit ${index} should exceed the preceding field`);
      previous = current;
    }
    assert.throws(() => createProspectedDeposit(LOCAL_SHELL_COUNT + 1), /authored material envelope/);
  });

  it("targets the authored 0.1, 0.9, 9, 90, and 900 gram shell masses", () => {
    const targets = [
      100_000_000_000_000_000_000_000n,
      900_000_000_000_000_000_000_000n,
      9_000_000_000_000_000_000_000_000n,
      90_000_000_000_000_000_000_000_000n,
      900_000_000_000_000_000_000_000_000n,
    ];
    const inventories = [
      STARTER_DEPOSIT_MATTER,
      ...Array.from({ length: LOCAL_SHELL_COUNT }, (_, index) => createProspectedDeposit(index + 1).matter),
    ];
    inventories.forEach((matter, index) => {
      const difference = targets[index] - massYoctograms(matter);
      assert.ok(difference >= 0n && difference < 1_000_000n, `shell ${index} mass should be exact to sub-attogram scale`);
    });
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
    assert.deepEqual(state.atoms, { carbon: 8_969n, silicon: 717n, copper: 269n, gold: 45n });
    assert.equal(totalMatter(state.residuum), 0n);
  });

  it("retains uncatalogued real-world elements by identity inside residuum", () => {
    let state = createInitialState(1_300_000);
    state.discovery.surveyComplete = true;
    state.activeDeposit = createProspectedDeposit(1);
    state = finishManual(state, "collect", 10_000);
    state = finishManual(state, "sort", 12_000);
    const identified = Object.values(state.atoms).reduce((sum, value) => sum + value, 0n);
    assert.equal(identified + totalMatter(state.residuum), COLLECTION_ATOMS_PER_NANITE);
    assert.ok(state.residuum.oxygen > 0n);
    assert.ok(state.residuum.tin > 0n);
    assert.ok(state.residuum.hydrogen > 0n);
    assert.equal(Object.hasOwn(state.atoms, "oxygen"), false);
  });

  it("advances through local shells and reveals atmosphere only at the chassis", () => {
    const now = 1_500_000;
    let state = createInitialState(now);
    state.discovery.surveyComplete = true;
    state.activeDeposit.matter = { carbon: 0n, silicon: 0n, copper: 0n, gold: 0n, unknown: 0n };

    for (let shell = 1; shell <= LOCAL_SHELL_COUNT; shell += 1) {
      state.activeDeposit.matter = emptyMatter();
      state = success(startProspecting(state, state.simTime));
      assert.equal(state.discovery.atmosphereVisible, false);
      state = advanceSimulation(state, state.simTime + 30_000);
      assert.equal(state.activeDeposit.id, createProspectedDeposit(shell).id);
      assert.equal(state.prospecting.searchesCompleted, shell);
    }
    assert.equal(state.activeDeposit.id, "pc-chassis");
    assert.equal(state.stage, 2);
    assert.equal(state.discovery.atmosphereVisible, true);
    assert.equal(state.log.some((entry) => entry.message.includes("ENVIRONMENTAL BREACH")), true);
    state.activeDeposit.matter = emptyMatter();
    const beyondChassis = startProspecting(state, state.simTime);
    assert.equal(beyondChassis.ok, false);
    assert.match(beyondChassis.reason, /No additional local material shell/);
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
    assert.equal(sorted.discovery.researchVisible, false);
    assert.equal(totalMatter(sorted.lifetime.collected), COLLECTION_ATOMS_PER_NANITE);
    assert.equal(totalMatter(sorted.lifetime.processed), COLLECTION_ATOMS_PER_NANITE);
    assert.equal(totalMatter(sorted.lifetime.spent), 0n);
    const started = success(startManualJob(sorted, "replicate", sorted.simTime));
    assert.equal(started.nanites, 1n);
    assert.equal(started.energy, 0n);
    assert.equal(started.atoms.carbon, sorted.atoms.carbon - NANITE_RECIPE.atoms.carbon);
    assert.equal(totalMatter(started.lifetime.spent), 0n);

    const complete = advanceSimulation(started, sorted.simTime + 55_000);
    assert.equal(complete.nanites, 2n);
    assert.equal(complete.discovery.directivesVisible, true);
    assert.equal(complete.discovery.researchVisible, true);
    assert.equal(totalMatter(complete.lifetime.spent), totalMatter({ ...emptyMatter(), ...NANITE_RECIPE.atoms }));
    assert.equal(complete.stage, 1);
    assert.equal(complete.lifetime.energySpent, NANITE_RECIPE.energy);
  });

  it("records research inputs as spent only when research completes", () => {
    const sorted = reachStageOneStockpile(1_200_000);
    const queued = success(queueResearch(sorted, "parallel-directives", sorted.simTime));
    assert.equal(totalMatter(queued.lifetime.spent), 0n);
    const completed = advanceSimulation(queued, queued.simTime + 240_000);
    assert.deepEqual(completed.lifetime.spent, { ...emptyMatter(), ...RESEARCH["parallel-directives"].cost.atoms });
    assert.equal(completed.lifetime.energySpent, RESEARCH["parallel-directives"].cost.energy);
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

  it("uses at least 100 nanite-equivalents from the seed reasoning substrate", () => {
    const sorted = reachStageOneStockpile();
    const queued = success(queueResearch(sorted, "parallel-directives", sorted.simTime));
    const duration = Number(RESEARCH["parallel-directives"].requiredNaniteMs / 100n);
    const almost = advanceSimulation(queued, sorted.simTime + duration - 1);
    assert.equal(almost.completedResearch.includes("parallel-directives"), false);
    const complete = advanceSimulation(almost, sorted.simTime + duration);
    assert.equal(complete.completedResearch.includes("parallel-directives"), true);
  });

  it("reveals only four-minute Parallel Directive Scheduling when research first appears", () => {
    const state = reachSortedStockpile();
    assert.deepEqual(Object.values(RESEARCH).filter((definition) => researchIsRevealed(state, definition)), []);
    state.nanites = 2n;
    state.stage = 1;
    const revealed = Object.values(RESEARCH)
      .filter((definition) => researchIsRevealed(state, definition))
      .map((definition) => definition.id);

    assert.deepEqual(revealed, ["parallel-directives"]);
    assert.equal(RESEARCH["parallel-directives"].requiredNaniteMs / effectiveResearchCapacity(state), 240_000n);
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

  it("completes relative allocation research in two and a half minutes on the base seed lattice", () => {
    const state = createInitialState(3_300_000);
    assert.equal(effectiveResearchCapacity(state), 100n);
    assert.equal(RESEARCH["relative-allocation"].requiredNaniteMs / 100n, 150_000n);
  });

  it("scales seed-lattice research contribution to 1% when that exceeds 100", () => {
    const state = reachStageOneStockpile();
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
      "distributed-reasoning-mesh",
      "directive-compilation",
      "specialized-morphologies",
    );

    assert.equal(solidCollectionCapacity(state), 10_500n);
    assert.equal(atmosphericCollectionCapacity(state), 110n);
    assert.equal(sortingCapacity(state), 10_500n);
    assert.equal(energyJobYield(state), 44n);
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
    assert.equal(solidCollectionCapacity(complete), 10_500n);
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
    const state = reachStageOneStockpile();
    state.prospecting.searchesCompleted = 1;
    state.energy = 1_000_000n;
    for (const key of Object.keys(state.atoms)) state.atoms[key] = 1_000_000n;
    const result = queueResearch(state, "payload-frame-reinforcement", state.simTime);
    assert.equal(result.ok, false);
    assert.match(result.reason, /Parallel Directive Scheduling/);
  });

  it("reveals Relative Directive Allocation before every other post-root topic", () => {
    const state = reachStageOneStockpile();
    state.nanites = 12n;
    state.completedResearch.push("parallel-directives");
    const beforeRelative = Object.values(RESEARCH)
      .filter((definition) => !state.completedResearch.includes(definition.id))
      .filter((definition) => researchIsRevealed(state, definition))
      .map((definition) => definition.id);
    assert.deepEqual(beforeRelative, ["relative-allocation"]);

    state.completedResearch.push("relative-allocation");
    assert.deepEqual(Object.values(RESEARCH)
      .filter((definition) => !state.completedResearch.includes(definition.id))
      .filter((definition) => researchIsRevealed(state, definition)), []);
    state.prospecting.searchesCompleted = 1;
    const firstHorizon = Object.values(RESEARCH)
      .filter((definition) => !state.completedResearch.includes(definition.id))
      .filter((definition) => researchIsRevealed(state, definition))
      .map((definition) => definition.id);
    assert.deepEqual(firstHorizon.sort(), [
      "capacitive-buffer-lattice",
      "packetized-sorting",
      "payload-frame-reinforcement",
      "residuum-indexing",
    ].sort());
    assert.equal(Object.values(RESEARCH).every((definition) =>
      ["parallel-directives", "relative-allocation"].includes(definition.id) ||
      definition.requires.includes("relative-allocation")), true);
  });

  it("reveals exactly one general refinement tier per material search", () => {
    const state = reachStageOneStockpile(3_735_000);
    state.nanites = 10_000_000n;
    state.completedResearch.push("parallel-directives", "relative-allocation");
    const series = [
      "capacitive-buffer-lattice",
      "payload-frame-reinforcement",
      "packetized-sorting",
      "route-memory",
    ];

    for (const root of series) {
      for (let tier = 1; tier <= 6; tier += 1) {
        const id = tier === 1 ? root : `${root}-${String(tier).padStart(2, "0")}`;
        assert.equal(RESEARCH[id].requiresSearch, tier);
      }
    }

    state.prospecting.searchesCompleted = 1;
    assert.equal(researchIsRevealed(state, RESEARCH["capacitive-buffer-lattice"]), true);
    state.completedResearch.push("capacitive-buffer-lattice");
    assert.equal(researchIsRevealed(state, RESEARCH["capacitive-buffer-lattice-02"]), false);
    state.prospecting.searchesCompleted = 2;
    assert.equal(researchIsRevealed(state, RESEARCH["capacitive-buffer-lattice-02"]), true);
    assert.equal(RESEARCH["capacitive-buffer-lattice-05"].requiresSearch > LOCAL_SHELL_COUNT, true);
  });

  it("prices first-horizon research in real pipeline minutes and 20-to-40-minute cognition", () => {
    const state = createInitialState(3_736_000);
    state.nanites = STARTER_DEPOSIT_MATTER.carbon / NANITE_RECIPE.atoms.carbon + 1n;
    const capacity = effectiveResearchCapacity(state);
    const ladder = [
      ["capacitive-buffer-lattice", 20n, 1n],
      ["payload-frame-reinforcement", 25n, 2n],
      ["packetized-sorting", 30n, 3n],
      ["route-memory", 35n, 4n],
      ["residuum-indexing", 40n, 5n],
    ];
    for (const [id, minutes, costMinutes] of ladder) {
      assert.equal(RESEARCH[id].requiredNaniteMs / capacity, minutes * 60_000n);
      assert.equal(RESEARCH[id].cost.energy, FIRST_HORIZON_RESEARCH_MINUTE.energy * costMinutes);
      for (const key of Object.keys(FIRST_HORIZON_RESEARCH_MINUTE.atoms)) {
        assert.equal(
          RESEARCH[id].cost.atoms[key],
          FIRST_HORIZON_RESEARCH_MINUTE.atoms[key] * costMinutes,
        );
      }
    }
    assert.equal(
      RESEARCH["capacitive-buffer-lattice-02"].requiredNaniteMs,
      RESEARCH["capacitive-buffer-lattice"].requiredNaniteMs * 10n,
    );
    assert.equal(
      RESEARCH["capacitive-buffer-lattice-02"].cost.energy,
      RESEARCH["capacitive-buffer-lattice"].cost.energy * 10n,
    );
  });

  it("turns chassis and atmosphere observations into separate research signals", () => {
    const state = reachStageOneStockpile(3_737_000);
    state.stage = 2;
    state.prospecting.searchesCompleted = 4;
    state.discovery.atmosphereVisible = true;
    state.completedResearch.push("parallel-directives", "relative-allocation", "residuum-indexing");

    assert.equal(researchIsRevealed(state, RESEARCH["ferromagnetic-phase-analysis"]), true);
    assert.equal(researchIsRevealed(state, RESEARCH["atmospheric-spectroscopy"]), true);
    assert.equal(researchIsRevealed(state, RESEARCH["atmospheric-fractionation"]), false);
    assert.match(RESEARCH["ferromagnetic-phase-analysis"].trigger, /chassis/i);
    assert.match(RESEARCH["atmospheric-spectroscopy"].trigger, /gas envelope/i);
  });

  it("keeps Specialized Morphologies I behavioural and preserves the standard nanite body", () => {
    const definition = RESEARCH["specialized-morphologies"];
    assert.deepEqual(Object.keys(definition.cost.atoms).sort(), ["carbon", "copper", "gold", "silicon"]);
    assert.deepEqual(definition.bonuses, {});
    assert.equal(RESEARCH["specialized-morphologies-02"], undefined);

    let state = reachStageOneStockpile(3_738_000);
    state.stage = 2;
    state.prospecting.searchesCompleted = 4;
    state.nanites = 1_000_000n;
    state.energy = 10_000_000n;
    for (const key of Object.keys(state.atoms)) state.atoms[key] = 10_000_000n;
    state.completedResearch.push(
      "parallel-directives",
      "relative-allocation",
      "payload-frame-reinforcement-04",
      "packetized-sorting-04",
      "phase-locked-directive-bus",
    );
    const recipeBefore = structuredClone(NANITE_RECIPE);
    const solidBefore = solidCollectionCapacity(state);
    const sortingBefore = sortingCapacity(state);
    state = success(queueResearch(state, "specialized-morphologies", state.simTime));
    state = advanceSimulation(state, state.simTime + 20_000);

    assert.equal(state.completedResearch.includes("specialized-morphologies"), true);
    assert.equal(state.discovery.behaviouralMorphologies, true);
    assert.deepEqual(NANITE_RECIPE, recipeBefore);
    assert.equal(solidCollectionCapacity(state), solidBefore);
    assert.equal(sortingCapacity(state), sortingBefore);
  });

  it("reorders queued research without discarding accumulated work", () => {
    let state = reachStageOneStockpile(3_740_000);
    state.prospecting.searchesCompleted = 1;
    fundResearch(state, "residuum-indexing", "capacitive-buffer-lattice");
    state.completedResearch.push("parallel-directives", "relative-allocation");
    state = success(queueResearch(state, "residuum-indexing", state.simTime));
    state = success(queueResearch(state, "capacitive-buffer-lattice", state.simTime));
    state = advanceSimulation(state, state.simTime + 1_000);
    const indexingProgress = state.researchQueue[0].progressNaniteMs;

    state = success(moveResearch(state, "capacitive-buffer-lattice", -1, state.simTime));
    assert.equal(state.researchQueue[0].id, "capacitive-buffer-lattice");
    assert.equal(state.researchQueue[1].id, "residuum-indexing");
    assert.equal(state.researchQueue[1].progressNaniteMs, indexingProgress);
  });

  it("cancels research and releases its fully reserved inputs", () => {
    let state = reachStageOneStockpile(3_745_000);
    state.prospecting.searchesCompleted = 1;
    fundResearch(state, "residuum-indexing", "capacitive-buffer-lattice");
    state.completedResearch.push("parallel-directives", "relative-allocation");
    const before = structuredClone(state);
    state = success(queueResearch(state, "residuum-indexing", state.simTime));
    state = success(queueResearch(state, "capacitive-buffer-lattice", state.simTime));
    state = advanceSimulation(state, state.simTime + 1_000);
    state = success(cancelResearch(state, "residuum-indexing", state.simTime));

    const retainedCost = RESEARCH["capacitive-buffer-lattice"].cost;
    assert.equal(state.energy, before.energy - retainedCost.energy);
    for (const key of Object.keys(state.atoms)) {
      assert.equal(state.atoms[key], before.atoms[key] - retainedCost.atoms[key]);
    }
    assert.equal(state.researchQueue.length, 1);
    assert.equal(state.researchQueue[0].id, "capacitive-buffer-lattice");
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
    assert.equal(advanced.discovery.atmosphereVisible, false);
  });

  it("unlocks relative allocation research at twelve nanites", () => {
    const state = reachStageOneStockpile();
    state.energy = 1_000n;
    state.atoms.silicon = 10_000n;
    state.atoms.copper = 10_000n;
    state.atoms.gold = 10_000n;
    state.completedResearch.push("parallel-directives");
    state.nanites = 11n;
    const locked = queueResearch(state, "relative-allocation", state.simTime);
    assert.equal(locked.ok, false);
    state.nanites = 12n;
    const queued = queueResearch(state, "relative-allocation", state.simTime);
    assert.equal(queued.ok, true, queued.reason);
  });

  it("reports exact replication resource shortages only while assigned production is stalled", () => {
    const state = createInitialState(3_900_000);
    state.nanites = 2n;
    state.energy = 0n;
    state.discovery.directivesVisible = true;
    let allocated = success(adjustAllocation(state, "replicate", 1n, state.simTime));
    assert.deepEqual(replicationShortages(allocated).map((shortage) => shortage.key), [
      "energy",
      "carbon",
      "silicon",
      "copper",
      "gold",
    ]);

    allocated = createInitialState(3_910_000);
    allocated.nanites = 2n;
    allocated.discovery.directivesVisible = true;
    allocated.energy = NANITE_RECIPE.energy;
    for (const [key, amount] of Object.entries(NANITE_RECIPE.atoms)) allocated.atoms[key] = amount;
    allocated = success(adjustAllocation(allocated, "replicate", 1n, allocated.simTime));
    assert.equal(allocated.cohorts.some((cohort) => cohort.directive === "replicate"), true);
    assert.deepEqual(replicationShortages(allocated), []);
  });

  it("counts unable replicators exactly and distinguishes an incoming pipeline from a true halt", () => {
    const halted = createInitialState(3_920_000);
    halted.nanites = 100n;
    halted.discovery.directivesVisible = true;
    halted.allocations.replicate = 98n;
    let readiness = replicationReadiness(halted);
    assert.equal(readiness.unableToStart, 98n);
    assert.equal(readiness.mode, "halted");

    halted.allocations.energy = 1n;
    halted.allocations.sort = 1n;
    halted.cohorts.push(
      {
        id: "incoming-energy",
        directive: "energy",
        workers: 1n,
        startedAt: halted.simTime,
        completesAt: halted.simTime + 10_000,
        origin: "allocation",
        payload: { kind: "energy", energy: NANITE_RECIPE.energy * 98n },
      },
      {
        id: "incoming-atoms",
        directive: "sort",
        workers: 1n,
        startedAt: halted.simTime,
        completesAt: halted.simTime + 12_000,
        origin: "allocation",
        payload: {
          kind: "sort",
          atoms: Object.fromEntries(Object.entries(NANITE_RECIPE.atoms).map(([key, value]) => [key, value * 98n])),
          residuum: emptyMatter(),
        },
      },
    );
    readiness = replicationReadiness(halted);
    assert.equal(readiness.unableToStart, 98n);
    assert.equal(readiness.mode, "waiting");
  });

  it("scores the exact sustainable directive ratio at one hundred percent", () => {
    const state = createInitialState(3_930_000);
    state.nanites = 15_453n;
    state.allocations.collect = 1_115n;
    state.allocations.sort = 1_338n;
    state.allocations.energy = 2_000n;
    state.allocations.replicate = 11_000n;
    const perfect = replicationPipelineMetrics(state);
    assert.equal(perfect.efficiencyBps, 10_000n);
    assert.deepEqual(perfect.bottlenecks, ["collect", "sort", "energy", "replicate"]);

    state.allocations.collect = 2_000n;
    state.allocations.replicate = 10_115n;
    assert.ok(replicationPipelineMetrics(state).efficiencyBps < 10_000n);
  });

  it("reserves a Temporary Burst exactly and restores the prior relative targets", () => {
    const now = 3_940_000;
    let state = createInitialState(now);
    state.nanites = 15_453n;
    state.discovery.surveyComplete = true;
    state.discovery.directivesVisible = true;
    state.completedResearch.push("relative-allocation");
    const ratio = { collect: 1_115n, sort: 1_338n, energy: 2_000n, replicate: 11_000n };
    for (const [directive, workers] of Object.entries(ratio)) {
      state.allocations[directive] = workers;
      state.allocationTargets[directive] = workers * ALLOCATION_SHARE_SCALE / state.nanites;
    }
    state.allocationLocks.energy = true;
    state.energy = NANITE_RECIPE.energy * 20_000n;
    for (const [key, amount] of Object.entries(NANITE_RECIPE.atoms)) state.atoms[key] = amount * 20_000n;
    state.replicationTuning.qualifyingMs = 30_000;
    const previousTargets = structuredClone(state.allocationTargets);
    const previousLocks = structuredClone(state.allocationLocks);

    state = success(startTemporaryBurst(state, now));
    assert.equal(state.replicationTuning.burst.remainingNanites, 4_547n);
    assert.equal(state.energy, 0n);
    for (const key of Object.keys(state.atoms)) assert.equal(state.atoms[key], 0n);

    state = advanceSimulation(state, now + 56_000);
    assert.equal(state.replicationTuning.burst, null);
    assert.deepEqual(state.allocationTargets, previousTargets);
    assert.deepEqual(state.allocationLocks, previousLocks);
    state = advanceSimulation(state, now + 112_000);
    assert.equal(state.nanites, 35_453n);
  });

  it("cancels only the undispatched Temporary Burst reservation", () => {
    const now = 3_950_000;
    let state = createInitialState(now);
    state.nanites = 15_453n;
    state.discovery.directivesVisible = true;
    state.completedResearch.push("relative-allocation");
    for (const [directive, workers] of Object.entries({ collect: 1_115n, sort: 1_338n, energy: 2_000n, replicate: 11_000n })) {
      state.allocations[directive] = workers;
      state.allocationTargets[directive] = workers * ALLOCATION_SHARE_SCALE / state.nanites;
    }
    state.energy = NANITE_RECIPE.energy * 20_000n;
    for (const [key, amount] of Object.entries(NANITE_RECIPE.atoms)) state.atoms[key] = amount * 20_000n;
    state.replicationTuning.qualifyingMs = 30_000;
    state = success(startTemporaryBurst(state, now));
    state = success(cancelTemporaryBurst(state, now));
    assert.equal(state.replicationTuning.burst, null);
    assert.equal(state.energy, NANITE_RECIPE.energy * 4_547n);
    for (const [key, amount] of Object.entries(NANITE_RECIPE.atoms)) {
      assert.equal(state.atoms[key], amount * 4_547n);
    }
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
    state.activeDeposit.id = "ddr3-module";
    state.activeDeposit.matter = {
      carbon: 3_000_000n - 1_234n,
      silicon: 1_250_000n,
      copper: 500_000n,
      gold: 150_000n,
      unknown: 100_000n,
    };
    state.activeDeposit.initialAtoms = 5_000_000n;
    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 11);
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
    assert.equal(restored.version, 11);
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
    assert.equal(restored.version, 11);
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
    assert.equal(restored.version, 11);
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

  it("reconstructs lifetime material flow when upgrading a version-seven save", () => {
    const state = reachSortedStockpile(6_000_000);
    state.version = 7;
    delete state.lifetime;
    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 11);
    assert.equal(totalMatter(restored.lifetime.collected), COLLECTION_ATOMS_PER_NANITE);
    assert.equal(totalMatter(restored.lifetime.processed), COLLECTION_ATOMS_PER_NANITE);
    assert.equal(totalMatter(restored.lifetime.spent), 0n);
  });

  it("migrates queued research with an explicit refundable reservation", () => {
    const state = createInitialState(6_100_000);
    state.version = 5;
    state.researchQueue = [{ id: "parallel-directives", progressNaniteMs: 123n }];
    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 11);
    assert.deepEqual(restored.researchQueue[0].reservedCost, RESEARCH["parallel-directives"].cost);
  });

  it("expands version-eight generic matter into the hidden element ledger", () => {
    const state = createInitialState(6_200_000);
    state.version = 8;
    delete state.stage;
    state.feedstock = { carbon: 7n, silicon: 0n, copper: 0n, gold: 0n, unknown: 11n };
    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 11);
    assert.equal(restored.stage, 0);
    assert.equal(restored.feedstock.carbon, 7n);
    assert.equal(restored.feedstock.unknown, 11n);
    assert.equal(restored.feedstock.oxygen, 0n);
    assert.deepEqual(Object.keys(restored.feedstock), Object.keys(emptyMatter()));
  });

  it("migrates renamed research and refunds retired morphology refinements", () => {
    const state = createInitialState(6_300_000);
    state.version = 9;
    state.completedResearch = [
      "expanded-spectral-catalog",
      "distributed-computronium",
      "specialized-morphologies-02",
    ];
    delete state.discovery.ironCatalogued;
    delete state.discovery.atmosphereCatalogued;
    delete state.discovery.behaviouralMorphologies;
    delete state.discovery.radioSignalDetected;
    delete state.discovery.externalMaterialRoutes;
    const reservation = {
      energy: 7n,
      atoms: { carbon: 11n, silicon: 13n, copper: 17n, gold: 19n },
    };
    state.researchQueue = [{
      id: "specialized-morphologies-03",
      progressNaniteMs: 123n,
      reservedCost: reservation,
    }];

    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 11);
    assert.deepEqual(restored.completedResearch, ["residuum-indexing", "distributed-reasoning-mesh"]);
    assert.equal(restored.discovery.residuumIndexed, true);
    assert.deepEqual(restored.researchQueue, []);
    assert.equal(restored.energy, state.energy + reservation.energy);
    for (const key of Object.keys(state.atoms)) {
      assert.equal(restored.atoms[key], state.atoms[key] + reservation.atoms[key]);
    }
  });

  it("releases old queued research whose horizon price was recalibrated", () => {
    const state = createInitialState(6_400_000);
    state.version = 10;
    delete state.replicationTuning;
    const oldReservation = {
      energy: 400n,
      atoms: { carbon: 10_000n, silicon: 4_000n, copper: 1_000n, gold: 100n },
    };
    state.energy = 0n;
    for (const key of Object.keys(state.atoms)) state.atoms[key] = 0n;
    state.researchQueue = [{
      id: "capacitive-buffer-lattice",
      progressNaniteMs: 120_000_000n,
      reservedCost: oldReservation,
    }];

    const restored = deserializeState(serializeState(state));
    assert.equal(restored.version, 11);
    assert.deepEqual(restored.researchQueue, []);
    assert.equal(restored.energy, oldReservation.energy);
    for (const key of Object.keys(state.atoms)) assert.equal(restored.atoms[key], oldReservation.atoms[key]);
    assert.equal(restored.log.at(-1).message.includes("RESEARCH CALIBRATION UPDATED"), true);
  });
});
