import { advanceSimulation } from "./engine.js";
import {
  ALLOCATION_SHARE_SCALE,
  DIRECTIVES,
  MATTER_KEYS,
  RESEARCH,
  STARTER_DEPOSIT_MATTER,
  emptyAllocationTargets,
  inferLogTier,
} from "./content.js";
import { totalMatter } from "./matter.js";

const SAVE_KEY = "nanoswarm.save.v1";
const CURRENT_SAVE_VERSION = 6;
const LEGACY_STARTER_DEPOSIT_MATTER = Object.freeze({
  carbon: 3_000_000n,
  silicon: 1_250_000n,
  copper: 500_000n,
  gold: 150_000n,
  unknown: 100_000n,
});

const replacer = (_key, value) => (typeof value === "bigint" ? { $bigint: value.toString() } : value);
const reviver = (_key, value) =>
  value && typeof value === "object" && typeof value.$bigint === "string" ? BigInt(value.$bigint) : value;

export function serializeState(state) {
  return JSON.stringify(state, replacer);
}

function migrateState(state) {
  if (state.version === 1) {
    if (state.activeDeposit?.id !== "ddr3-module") throw new Error("Unsupported legacy deposit");
    for (const key of MATTER_KEYS) {
      state.activeDeposit.matter[key] += STARTER_DEPOSIT_MATTER[key] - LEGACY_STARTER_DEPOSIT_MATTER[key];
    }
    state.activeDeposit.initialAtoms = totalMatter(STARTER_DEPOSIT_MATTER);
    if (state.discovery.surveyComplete) state.activeDeposit.name = "DDR3 SDRAM package · damaged";
    state.version = 2;
  }
  if (state.version === 2) {
    state.allocationTargets = emptyAllocationTargets();
    if (state.completedResearch.includes("relative-allocation") && state.nanites > 0n) {
      for (const directive of DIRECTIVES) {
        state.allocationTargets[directive] =
          ((state.allocations[directive] ?? 0n) * ALLOCATION_SHARE_SCALE) / state.nanites;
      }
    }
    state.version = 3;
  }
  if (state.version === 3) {
    for (const entry of state.log) entry.tier ??= inferLogTier(entry.message, entry.tone);
    state.version = 4;
  }
  if (state.version === 4) {
    for (const directive of DIRECTIVES) {
      state.allocations[directive] ??= 0n;
      state.allocationTargets[directive] ??= 0n;
      state.allocationLocks[directive] ??= false;
    }
    state.activeDeposit.index ??= 0;
    state.activeDeposit.description ??=
      "Artificial polymer · silicon die · copper trace · gold bond material";
    state.activeDeposit.limitingElement ??= "carbon";
    state.depletedDeposits ??= [];
    state.prospecting ??= { searchesCompleted: state.activeDeposit.index ?? 0 };
    state.discovery.atmosphereVisible ??= false;
    state.discovery.exhaustionNotified ??= false;
    state.discovery.residuumIndexed ??= state.completedResearch.includes("residuum-indexing");
    state.version = 5;
  }
  if (state.version === 5) {
    for (const item of state.researchQueue) {
      const cost = RESEARCH[item.id]?.cost;
      if (cost && !item.reservedCost) {
        item.reservedCost = { energy: cost.energy, atoms: { ...cost.atoms } };
      }
    }
    state.version = CURRENT_SAVE_VERSION;
  }
  return state;
}

export function deserializeState(raw) {
  const parsed = migrateState(JSON.parse(raw, reviver));
  if (
    parsed?.version !== CURRENT_SAVE_VERSION ||
    typeof parsed.simTime !== "number" ||
    typeof parsed.nanites !== "bigint"
  ) {
    throw new Error("Unsupported or malformed NanoSwarm save");
  }
  return parsed;
}

export function loadGame(now = Date.now()) {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return advanceSimulation(deserializeState(raw), now);
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
}

export function clearGame() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(SAVE_KEY);
}
