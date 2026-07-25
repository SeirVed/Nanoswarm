import { advanceSimulation } from "./engine.js";
import { RESEARCH, emptyAtoms, emptyMatter } from "./content.js";

const SAVE_KEY = "nanoswarm.save.v1";
export const CURRENT_SAVE_VERSION = 12;

const replacer = (_key, value) => (typeof value === "bigint" ? { $bigint: value.toString() } : value);
const reviver = (_key, value) =>
  value && typeof value === "object" && typeof value.$bigint === "string" ? BigInt(value.$bigint) : value;

const normalizedMatter = (matter) => ({ ...emptyMatter(), ...(matter ?? {}) });

function normalizeCurrentState(state) {
  state.feedstock = normalizedMatter(state.feedstock);
  state.capturedAtmosphere = normalizedMatter(state.capturedAtmosphere);
  state.residuum = normalizedMatter(state.residuum);
  state.atoms = { ...emptyAtoms(), ...(state.atoms ?? {}) };
  state.activeDeposit.matter = normalizedMatter(state.activeDeposit.matter);
  state.mnemonicBanks ??= 0n;
  state.ablation ??= { active: null, dischargesByDeposit: {} };
  state.ablation.dischargesByDeposit ??= {};
  if (state.ablation.active?.matter) state.ablation.active.matter = normalizedMatter(state.ablation.active.matter);
  for (const cohort of state.cohorts ?? []) {
    if (cohort.payload?.matter) cohort.payload.matter = normalizedMatter(cohort.payload.matter);
    if (cohort.payload?.residuum) cohort.payload.residuum = normalizedMatter(cohort.payload.residuum);
    if (cohort.payload?.newlyProcessed) cohort.payload.newlyProcessed = normalizedMatter(cohort.payload.newlyProcessed);
    if (cohort.payload?.atoms) cohort.payload.atoms = { ...emptyAtoms(), ...cohort.payload.atoms };
  }
  for (const key of ["collected", "processed", "spent"]) {
    state.lifetime[key] = normalizedMatter(state.lifetime[key]);
  }
  for (const item of state.researchQueue ?? []) {
    if (!RESEARCH[item.id]) throw new Error(`Unknown Research v2 topic: ${item.id}`);
    if (!["queued", "forming"].includes(item.status)) throw new Error("Malformed Research v2 queue state");
    item.progressCentinaniteMs ??= 0n;
    item.committedNanites ??= 0n;
    item.energySpent ??= 0n;
    item.paused ??= false;
  }
  return state;
}

function obsoleteMetadata(state) {
  const createdAt = Number(state?.createdAt);
  const lastSavedAt = Number(state?.lastSavedAt);
  return Object.freeze({
    iteration: Number.isInteger(state?.version) ? state.version : "unknown",
    nanites: typeof state?.nanites === "bigint" ? state.nanites.toString() : "unknown",
    energy: typeof state?.energy === "bigint" ? state.energy.toString() : "unknown",
    stage: Number.isInteger(state?.stage) ? state.stage : "unknown",
    materialSearches: Number.isInteger(state?.prospecting?.searchesCompleted)
      ? state.prospecting.searchesCompleted
      : "unknown",
    completedResearch: Array.isArray(state?.completedResearch) ? state.completedResearch.length : "unknown",
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
    lastSavedAt: Number.isFinite(lastSavedAt) ? lastSavedAt : null,
  });
}

export function serializeState(state) {
  return JSON.stringify(state, replacer);
}

export function deserializeState(raw) {
  const parsed = JSON.parse(raw, reviver);
  if (
    parsed?.version !== CURRENT_SAVE_VERSION ||
    typeof parsed.simTime !== "number" ||
    typeof parsed.nanites !== "bigint"
  ) {
    throw new Error("This node belongs to a prior NanoSwarm iteration");
  }
  return normalizeCurrentState(parsed);
}

export function loadGame(now = Date.now()) {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw, reviver);
    if (parsed?.version !== CURRENT_SAVE_VERSION) {
      return { obsolete: true, metadata: obsoleteMetadata(parsed) };
    }
    return advanceSimulation(normalizeCurrentState(parsed), now);
  } catch (error) {
    console.error("NanoSwarm save rejected", error);
    return { obsolete: true, metadata: obsoleteMetadata(null) };
  }
}

export function saveGame(state, now = Date.now()) {
  if (typeof localStorage === "undefined" || !state || state.obsolete) return;
  const caughtUp = advanceSimulation(state, now);
  caughtUp.lastSavedAt = now;
  localStorage.setItem(SAVE_KEY, serializeState(caughtUp));
}

export function clearGame() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(SAVE_KEY);
}
