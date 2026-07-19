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

export function appendLog(state, message, tone = "system", elapsedLabel, tier = "info") {
  const id = `log-${state.nextId}`;
  state.nextId += 1n;
  const entry = { id, at: state.simTime, message, tone, tier };
  if (elapsedLabel !== undefined) entry.elapsedLabel = elapsedLabel;
  state.log.push(entry);
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
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
    version: 6,
    createdAt: now,
    simTime: now,
    lastSavedAt: now,
    nextId: BigInt(log.length + 1),
    nanites: 1n,
    energy: 40n,
    feedstock: emptyMatter(),
    residuum: emptyMatter(),
    atoms: emptyAtoms(),
    activeDeposit: {
      id: "ddr3-module",
      index: 0,
      name: "Unclassified planetary substrate",
      description: "Artificial polymer · silicon die · copper trace · gold bond material",
      limitingElement: "carbon",
      matter: { ...STARTER_DEPOSIT_MATTER },
      initialAtoms: totalMatter(STARTER_DEPOSIT_MATTER),
    },
    depletedDeposits: [],
    prospecting: { searchesCompleted: 0 },
    cohorts: [],
    allocations: emptyAllocations(),
    allocationTargets: emptyAllocationTargets(),
    allocationLocks: emptyLocks(),
    researchQueue: [],
    completedResearch: [],
    discovery: {
      surveyComplete: false,
      feedstockVisible: false,
      elementsVisible: false,
      residuumVisible: false,
      directivesVisible: false,
      researchVisible: false,
      projectsVisible: false,
      atmosphereVisible: false,
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
