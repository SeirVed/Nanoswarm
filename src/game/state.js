import * as legacy from "./state-legacy.js";

export * from "./state-legacy.js";

export function ensureMnemonicState(state) {
  if (!state) return state;
  state.mnemonicNanites ??= 0n;
  state.mnemonicBanks ??= [];
  state.legacyCoreEncoding ??= [];
  state.researchUpdatedAt ??= state.simTime;
  state.researchQueue ??= [];
  state.researchAutoContinue ??= false;
  state.allocations ??= {};
  state.allocationTargets ??= {};
  state.allocationLocks ??= {};
  state.allocations.research = 0n;
  state.allocationTargets.research = 0n;
  state.allocationLocks.research = false;
  return state;
}

export function cloneState(state) {
  return ensureMnemonicState(legacy.cloneState(state));
}

export function createInitialState(now = Date.now()) {
  const state = ensureMnemonicState(legacy.createInitialState(now));
  state.version = 12;
  globalThis.__nanoswarmState = state;
  return state;
}

export function activeResearchWorkers(_state) {
  return 0n;
}

export function activeWorkers(state) {
  return state.cohorts.reduce((total, cohort) => total + cohort.workers, 0n);
}

export function idleWorkers(state) {
  const idle = state.nanites - activeWorkers(state);
  return idle > 0n ? idle : 0n;
}
