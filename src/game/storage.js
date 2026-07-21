import * as legacy from "./storage-legacy.js";
import { advanceSimulation } from "./engine.js";
import { ATOM_KEYS, RESEARCH } from "./content.js";
import { appendLog, ensureMnemonicState } from "./state.js";

const SAVE_KEY = "nanoswarm.save.v1";
const CURRENT_SAVE_VERSION = 12;

const replacer = (_key, value) =>
  typeof value === "bigint" ? { $bigint: value.toString() } : value;
const reviver = (_key, value) =>
  value && typeof value === "object" && typeof value.$bigint === "string"
    ? BigInt(value.$bigint)
    : value;

function normalizeV12(state) {
  ensureMnemonicState(state);
  state.version = CURRENT_SAVE_VERSION;
  for (const item of state.researchQueue) {
    const definition = RESEARCH[item.id];
    if (!definition) continue;
    item.status ??= "queued";
    item.progressNaniteMs ??= 0n;
    item.memoryNanites ??= definition.memoryNanites;
    item.energyCost ??= definition.energyCost;
    item.startedAt ??= null;
    item.bankId ??= null;
    delete item.reservedCost;
  }
  return state;
}

function migrateV11(state) {
  ensureMnemonicState(state);
  const queue = [];
  const seen = new Set();
  let refunded = 0;
  for (const item of state.researchQueue ?? []) {
    if (item.reservedCost) {
      state.energy += item.reservedCost.energy;
      for (const key of ATOM_KEYS) state.atoms[key] += item.reservedCost.atoms[key] ?? 0n;
      refunded += 1;
    }
    if (!RESEARCH[item.id] || state.completedResearch.includes(item.id) || seen.has(item.id)) continue;
    queue.push({
      id: item.id,
      status: "queued",
      progressNaniteMs: 0n,
      memoryNanites: RESEARCH[item.id].memoryNanites,
      energyCost: RESEARCH[item.id].energyCost,
      startedAt: null,
      bankId: null,
    });
    seen.add(item.id);
  }
  state.researchQueue = queue;
  state.mnemonicNanites = 0n;
  state.mnemonicBanks = [];
  state.legacyCoreEncoding = state.completedResearch.map((researchId) => ({
    researchId,
    kind: "legacy-core-encoding",
    completedAt: state.simTime,
  }));
  state.researchUpdatedAt = state.simTime;
  state.researchAutoContinue = false;
  state.allocations.research = 0n;
  state.allocationTargets.research = 0n;
  state.allocationLocks.research = false;
  state.version = CURRENT_SAVE_VERSION;
  appendLog(
    state,
    `RESEARCH ARCHITECTURE REBUILT · ${refunded} LEGACY QUEUED TOPIC${refunded === 1 ? "" : "S"} REFUNDED · COMPLETED MODELS RETAINED AS CORE ENCODINGS.`,
    "good",
    undefined,
    "world",
  );
  return state;
}

export function serializeState(state) {
  return JSON.stringify(normalizeV12(structuredClone(state)), replacer);
}

export function deserializeState(raw) {
  const preview = JSON.parse(raw, reviver);
  let state;
  if (preview?.version <= 11) {
    state = migrateV11(legacy.deserializeState(raw));
  } else if (preview?.version === CURRENT_SAVE_VERSION) {
    state = normalizeV12(preview);
  } else {
    throw new Error("Unsupported or malformed NanoSwarm save");
  }
  if (typeof state.simTime !== "number" || typeof state.nanites !== "bigint") {
    throw new Error("Unsupported or malformed NanoSwarm save");
  }
  globalThis.__nanoswarmState = state;
  return state;
}

export function loadGame(now = Date.now()) {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const state = advanceSimulation(deserializeState(raw), now);
    globalThis.__nanoswarmState = state;
    return state;
  } catch (error) {
    console.error("NanoSwarm save rejected", error);
    return null;
  }
}

export function saveGame(state, now = Date.now()) {
  if (typeof localStorage === "undefined") return;
  const caughtUp = advanceSimulation(state, now);
  caughtUp.lastSavedAt = now;
  localStorage.setItem(SAVE_KEY, serializeState(caughtUp));
  globalThis.__nanoswarmState = caughtUp;
}

export function clearGame() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(SAVE_KEY);
}
