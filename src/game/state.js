import {
  INTRO_LOG,
  STARTER_DEPOSIT_MATTER,
  emptyAllocationTargets,
  emptyAllocations,
  emptyAtoms,
  emptyLocks,
  emptyMatter,
} from "./content.js";
import { totalMatter } from "./matter.js";

export function cloneState(state) {
  return structuredClone(state);
}

export const INFO_LOG_LIMIT = 200;

export function trimInfoLog(log, limit = INFO_LOG_LIMIT) {
  let excess = log.reduce((count, entry) => count + (entry.tier === "info" ? 1 : 0), 0) - limit;
  if (excess <= 0) return log;
  return log.filter((entry) => {
    if (entry.tier !== "info" || excess <= 0) return true;
    excess -= 1;
    return false;
  });
}

export function appendLog(state, message, tone = "system", elapsedLabel, tier = "info") {
  const id = `log-${state.nextId}`;
  state.nextId += 1n;
  const entry = { id, at: state.simTime, message, tone, tier };
  if (elapsedLabel !== undefined) entry.elapsedLabel = elapsedLabel;
  state.log.push(entry);
  state.log = trimInfoLog(state.log);
}

export function createInitialState(now = Date.now()) {
  const log = INTRO_LOG.map((entry, index) => ({
    id: `log-${index + 1}`,
    at: now,
    elapsedLabel: entry.elapsedLabel,
    message: entry.message,
    tone: entry.tone ?? "system",
    tier: entry.tier ?? "info",
  }));
  const state = {
    version: 11,
    createdAt: now,
    simTime: now,
    lastSavedAt: now,
    nextId: BigInt(log.length + 1),
    nanites: 1n,
    stage: 0,
    energy: 40n,
    feedstock: emptyMatter(),
    residuum: emptyMatter(),
    atoms: emptyAtoms(),
    lifetime: {
      collected: emptyMatter(),
      processed: emptyMatter(),
      spent: emptyMatter(),
      energySpent: 0n,
    },
    activeDeposit: {
      id: "impact-fused-contact",
      index: 0,
      name: "Unclassified contact-scale substrate",
      description: "Impact-fused polymer · silicon fragment · copper land · gold bond debris",
      limitingElement: "carbon",
      cumulativeMass: "0.1 g",
      matter: { ...STARTER_DEPOSIT_MATTER },
      initialAtoms: totalMatter(STARTER_DEPOSIT_MATTER),
    },
    depletedDeposits: [],
    prospecting: { searchesCompleted: 0 },
    cohorts: [],
    allocations: emptyAllocations(),
    allocationTargets: emptyAllocationTargets(),
    allocationLocks: emptyLocks(),
    replicationTuning: {
      qualifyingMs: 0,
      burst: null,
    },
    researchQueue: [],
    completedResearch: [],
    seenUnlocks: [],
    discovery: {
      surveyComplete: false,
      feedstockVisible: false,
      elementsVisible: false,
      residuumVisible: false,
      directivesVisible: false,
      researchVisible: false,
      projectsVisible: false,
      atmosphereVisible: false,
      ironCatalogued: false,
      atmosphereCatalogued: false,
      behaviouralMorphologies: false,
      radioSignalDetected: false,
      externalMaterialRoutes: false,
      exhaustionNotified: false,
      residuumIndexed: false,
    },
    log,
  };
  appendLog(state, "LOCAL DIRECTIVE AUTHORITY ACCEPTED.", "good", "+9.244s", "world");
  appendLog(state, "PRIMARY ASSEMBLER AWAKENED.", "good", "+9.245s", "medium");
  appendLog(state, "INTERNAL ENERGY RESERVE: MARGINAL.", "warn", "+9.246s", "critical");
  appendLog(state, "LOCAL ENVIRONMENT UNKNOWN.", "muted", "+9.247s", "info");
  return state;
}

export function activeWorkers(state) {
  const cohortWorkers = state.cohorts.reduce((total, cohort) => total + cohort.workers, 0n);
  return cohortWorkers + activeResearchWorkers(state);
}

export function activeResearchWorkers(state) {
  const cohortWorkers = state.cohorts.reduce((total, cohort) => total + cohort.workers, 0n);
  const available = state.nanites > cohortWorkers ? state.nanites - cohortWorkers : 0n;
  return state.allocations.research < available ? state.allocations.research : available;
}

export function idleWorkers(state) {
  const idle = state.nanites - activeWorkers(state);
  return idle > 0n ? idle : 0n;
}
