import { advanceSimulation } from "./engine.js";

const SAVE_KEY = "nanoswarm.save.v1";

const replacer = (_key, value) => (typeof value === "bigint" ? { $bigint: value.toString() } : value);
const reviver = (_key, value) =>
  value && typeof value === "object" && typeof value.$bigint === "string" ? BigInt(value.$bigint) : value;

export function serializeState(state) {
  return JSON.stringify(state, replacer);
}

export function deserializeState(raw) {
  const parsed = JSON.parse(raw, reviver);
  if (parsed?.version !== 1 || typeof parsed.simTime !== "number" || typeof parsed.nanites !== "bigint") {
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
