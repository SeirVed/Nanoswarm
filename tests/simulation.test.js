import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIRECTIVES,
  NANITE_RECIPE,
  RESEARCH,
  STARTER_DEPOSIT_MATTER,
} from "../src/game/content.js";
import {
  advanceSimulation,
  effectiveResearchCapacity,
  queueResearch,
  startQueuedResearch,
} from "../src/game/engine.js";
import { createInitialState } from "../src/game/state.js";
import { deserializeState, serializeState } from "../src/game/storage.js";

function success(result) {
  assert.equal(result.ok, true, result.reason);
  return result.state;
}

function researchReadyState(now = 1_000_000) {
  const state = createInitialState(now);
  state.nanites = 2n;
  state.stage = 1;
  state.discovery.surveyComplete = true;
  state.discovery.directivesVisible = true;
  state.discovery.researchVisible = true;
  state.energy = 10n ** 30n;
  return state;
}

describe("exact simulation foundations", () => {
  it("builds the contact from exact whole nanite recipes", () => {
    const recipes = 702_327_557_648_247_539n;
    for (const [key, atoms] of Object.entries(NANITE_RECIPE.atoms)) {
      assert.equal(STARTER_DEPOSIT_MATTER[key], atoms * recipes);
    }
  });

  it("removes temporary research from workforce directives", () => {
    assert.equal(DIRECTIVES.includes("research"), false);
  });
});

describe("mnemonic research", () => {
  it("keeps sub-20-nanite bootstrap research population-free", () => {
    let state = researchReadyState();
    const before = state.nanites;
    state = success(queueResearch(state, "parallel-directives", state.simTime));
    assert.equal(state.nanites, before);
    assert.equal(state.researchQueue[0].memoryNanites, 0n);
    assert.equal(effectiveResearchCapacity(state), 100n);

    state = advanceSimulation(state, state.simTime + 240_000);
    assert.equal(state.completedResearch.includes("parallel-directives"), true);
    assert.equal(state.mnemonicNanites, 0n);
  });

  it("makes Cohort Ratio Prognostics the first physical mnemonic bank", () => {
    let state = researchReadyState(2_000_000);
    state.nanites = 180n;
    state.completedResearch.push("parallel-directives", "relative-allocation");
    const before = state.nanites;

    state = success(queueResearch(state, "cohort-ratio-prognostics", state.simTime));
    assert.equal(RESEARCH["cohort-ratio-prognostics"].memoryNanites, 16n);
    assert.equal(state.nanites, before - 16n);
    assert.equal(state.mnemonicBanks[0].status, "constructing");

    state = advanceSimulation(state, state.simTime + 240_000);
    assert.equal(state.completedResearch.includes("cohort-ratio-prognostics"), true);
    assert.equal(state.mnemonicNanites, 16n);
    assert.equal(state.mnemonicBanks[0].status, "installed");
  });

  it("charges no loose atoms for any research", () => {
    for (const definition of Object.values(RESEARCH)) {
      assert.deepEqual(definition.cost.atoms, {
        carbon: 0n,
        silicon: 0n,
        copper: 0n,
        gold: 0n,
      });
    }

    let state = researchReadyState(3_000_000);
    state.nanites = 2_000_000_000_000_000n;
    state.completedResearch.push(
      "parallel-directives",
      "relative-allocation",
      "cohort-ratio-prognostics",
    );
    state.prospecting.searchesCompleted = 1;
    state.atoms = {
      carbon: 7n,
      silicon: 11n,
      copper: 13n,
      gold: 0n,
    };
    const before = structuredClone(state.atoms);
    state = success(queueResearch(state, "residuum-indexing", state.simTime));
    assert.deepEqual(state.atoms, before);
  });

  it("allows zero-gold chassis research and atmospheric progression", () => {
    let state = researchReadyState(4_000_000);
    state.nanites = 30_000_000_000_000_000n;
    state.stage = 2;
    state.prospecting.searchesCompleted = 4;
    state.discovery.atmosphereVisible = true;
    state.atoms.gold = 0n;
    state.completedResearch.push(
      "parallel-directives",
      "relative-allocation",
      "cohort-ratio-prognostics",
      "residuum-indexing",
    );

    state = success(queueResearch(state, "ferromagnetic-phase-analysis", state.simTime));
    state = success(queueResearch(state, "atmospheric-spectroscopy", state.simTime));
    assert.equal(state.researchQueue[0].status, "active");
    assert.equal(state.researchQueue[1].status, "queued");

    const first = RESEARCH["ferromagnetic-phase-analysis"];
    state = advanceSimulation(
      state,
      state.simTime + Number((first.requiredNaniteMs + effectiveResearchCapacity(state) - 1n) /
        effectiveResearchCapacity(state)),
    );
    assert.equal(state.discovery.ironCatalogued, true);
    assert.equal(state.atoms.gold, 0n);

    state = success(startQueuedResearch(state, "atmospheric-spectroscopy", state.simTime));
    const second = RESEARCH["atmospheric-spectroscopy"];
    state = advanceSimulation(
      state,
      state.simTime + Number((second.requiredNaniteMs + effectiveResearchCapacity(state) - 1n) /
        effectiveResearchCapacity(state)),
    );
    assert.equal(state.discovery.atmosphereCatalogued, true);
    assert.equal(state.atoms.gold, 0n);
  });

  it("never converts the final active nanite", () => {
    let state = researchReadyState(5_000_000);
    const footprint = RESEARCH["residuum-indexing"].memoryNanites;
    state.nanites = footprint;
    state.prospecting.searchesCompleted = 1;
    state.completedResearch.push(
      "parallel-directives",
      "relative-allocation",
      "cohort-ratio-prognostics",
    );

    const result = queueResearch(state, "residuum-indexing", state.simTime);
    assert.equal(result.ok, true);
    assert.equal(result.state.researchQueue[0].status, "queued");
    assert.equal(result.state.nanites, footprint);
  });

  it("produces identical mnemonic progress when stepped or event-jumped", () => {
    let state = researchReadyState(6_000_000);
    state.nanites = 180n;
    state.completedResearch.push("parallel-directives", "relative-allocation");
    state = success(queueResearch(state, "cohort-ratio-prognostics", state.simTime));

    const target = state.simTime + 240_000;
    const jumped = advanceSimulation(state, target);
    let stepped = state;
    for (let at = state.simTime + 1_000; at <= target; at += 1_000) {
      stepped = advanceSimulation(stepped, at);
    }
    assert.equal(serializeState(stepped), serializeState(jumped));
  });

  it("migrates version 11 queues by refunding resources and retaining intent", () => {
    const state = researchReadyState(7_000_000);
    state.version = 11;
    state.energy = 100n;
    state.atoms = { carbon: 1n, silicon: 2n, copper: 3n, gold: 4n };
    state.researchQueue = [{
      id: "parallel-directives",
      progressNaniteMs: 12n,
      reservedCost: {
        energy: 20n,
        atoms: { carbon: 10n, silicon: 20n, copper: 30n, gold: 40n },
      },
    }];
    delete state.mnemonicNanites;
    delete state.mnemonicBanks;
    delete state.legacyCoreEncoding;
    delete state.researchUpdatedAt;

    const raw = JSON.stringify(state, (_key, value) =>
      typeof value === "bigint" ? { $bigint: value.toString() } : value);
    const migrated = deserializeState(raw);
    assert.equal(migrated.version, 12);
    assert.equal(migrated.energy, 120n);
    assert.deepEqual(migrated.atoms, {
      carbon: 11n,
      silicon: 22n,
      copper: 33n,
      gold: 44n,
    });
    assert.equal(migrated.researchQueue[0].status, "queued");
    assert.equal(migrated.researchQueue[0].progressNaniteMs, 0n);
  });
});
