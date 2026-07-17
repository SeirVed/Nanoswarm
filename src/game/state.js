import {
  INTRO_LOG,
  STARTER_DEPOSIT_MATTER,
  emptyAllocations,
  emptyAtoms,
  emptyLocks,
  emptyMatter,
} from "./content.js";
import { totalMatter } from "./matter.js";

export function cloneState(state) {
  return structuredClone(state);
}

export function appendLog(state, message, tone = "system", elapsedLabel) {
  const id = `log-${state.nextId}`;
  state.nextId += 1n;
  const entry = { id, at: state.simTime, message, tone };
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
  }));
  const state = {
    version: 1,
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
      name: "Unclassified planetary substrate",
      matter: { ...STARTER_DEPOSIT_MATTER },
      initialAtoms: totalMatter(STARTER_DEPOSIT_MATTER),
    },
    cohorts: [],
    allocations: emptyAllocations(),
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
    },
    log,
  };
  appendLog(state, "LOCAL DIRECTIVE AUTHORITY ACCEPTED.", "good", "+9.244s");
  appendLog(state, "PRIMARY ASSEMBLER AWAKENED.", "good", "+9.245s");
  appendLog(state, "INTERNAL ENERGY RESERVE: MARGINAL.", "warn", "+9.246s");
  appendLog(state, "LOCAL ENVIRONMENT UNKNOWN.", "muted", "+9.247s");
  return state;
}

export function activeWorkers(state) {
  return state.cohorts.reduce((total, cohort) => total + cohort.workers, 0n) + state.allocations.research;
}

export function idleWorkers(state) {
  const idle = state.nanites - activeWorkers(state);
  return idle > 0n ? idle : 0n;
}
