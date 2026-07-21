import {
  RESEARCH as LEGACY_RESEARCH,
  WORK_DIRECTIVES,
  emptyAtoms,
} from "./content-legacy.js";

export const BOOTSTRAP_RESEARCH_IDS = Object.freeze([
  "parallel-directives",
  "relative-allocation",
]);

export const RESEARCH_MEMORY_SCALES = Object.freeze({
  firstElectronic: 1_000_000_000_000_000n,
  circuitBoard: 2_000_000_000_000_000n,
  motherboard: 4_000_000_000_000_000n,
  chassis: 8_000_000_000_000_000n,
  localEnvironment: 20_000_000_000_000_000n,
  broadEnvironment: 50_000_000_000_000_000n,
});

export const DIRECTIVES = Object.freeze([...WORK_DIRECTIVES]);

const MINUTE_MS = 60_000n;
const BOOTSTRAP_CAPACITY = 100n;
const MNEMONIC_WRITE_ENERGY_PER_NANITE = 400n;

const maxBigInt = (left, right) => left > right ? left : right;
const frozenCost = (energy) => Object.freeze({
  energy,
  atoms: Object.freeze(emptyAtoms()),
});

function memoryScaleForSearch(search) {
  if (search <= 1) return RESEARCH_MEMORY_SCALES.firstElectronic;
  if (search === 2) return RESEARCH_MEMORY_SCALES.circuitBoard;
  if (search === 3) return RESEARCH_MEMORY_SCALES.motherboard;
  if (search === 4) return RESEARCH_MEMORY_SCALES.chassis;
  if (search === 5) return RESEARCH_MEMORY_SCALES.localEnvironment;
  return RESEARCH_MEMORY_SCALES.broadEnvironment;
}

function memoryFor(definition) {
  if (BOOTSTRAP_RESEARCH_IDS.includes(definition.id)) return 0n;
  if (definition.id === "cohort-ratio-prognostics") return 16n;
  if (definition.id === "specialized-morphologies") return RESEARCH_MEMORY_SCALES.chassis * 2n;
  if (definition.id === "rf-scavenging") return RESEARCH_MEMORY_SCALES.localEnvironment * 2n;
  if (definition.id === "local-material-caches") return RESEARCH_MEMORY_SCALES.localEnvironment * 2n;
  if (definition.id === "distributed-reasoning-mesh") return RESEARCH_MEMORY_SCALES.localEnvironment * 8n;
  if (definition.id === "autonomous-prospecting") return RESEARCH_MEMORY_SCALES.localEnvironment * 8n;
  if (definition.id === "directive-compilation") return RESEARCH_MEMORY_SCALES.localEnvironment * 16n;
  return memoryScaleForSearch(definition.requiresSearch ?? 1);
}

function baselineMinutesFor(definition) {
  if (definition.id === "parallel-directives") return 4n;
  if (definition.id === "relative-allocation") return 150n / 60n;
  if (definition.id === "cohort-ratio-prognostics") return 4n;
  if (definition.id === "residuum-indexing") return 40n;
  if (definition.id === "phase-locked-directive-bus") return 15n;
  if (definition.id === "ferromagnetic-phase-analysis") return 10n;
  if (definition.id === "atmospheric-spectroscopy") return 12n;
  if (definition.id.startsWith("capacitive-buffer-lattice")) return 20n;
  if (definition.id.startsWith("payload-frame-reinforcement")) return 25n;
  if (definition.id.startsWith("packetized-sorting")) return 30n;
  if (definition.id.startsWith("route-memory")) return 35n;
  if (definition.id.startsWith("atmospheric-fractionation")) return 20n;
  if (definition.id === "specialized-morphologies") return 20n;
  if (definition.id === "rf-scavenging") return 30n;
  if (definition.id === "local-material-caches") return 30n;
  if (definition.id === "distributed-reasoning-mesh") return 60n;
  if (definition.id === "autonomous-prospecting") return 90n;
  if (definition.id === "directive-compilation") return 120n;
  return 30n;
}

function baselineMillisecondsFor(definition) {
  if (definition.id === "relative-allocation") return 150_000n;
  return baselineMinutesFor(definition) * MINUTE_MS;
}

function effectFor(definition) {
  if (definition.id === "distributed-reasoning-mesh") {
    return "Completed mnemonic banks contribute twice as much reusable research bandwidth and a second bank may later be constructed concurrently.";
  }
  return definition.effect;
}

function convertResearch(definition) {
  const memoryNanites = memoryFor(definition);
  const baselineMs = baselineMillisecondsFor(definition);
  const energyCost = memoryNanites === 0n
    ? definition.cost.energy
    : maxBigInt(definition.cost.energy, memoryNanites * MNEMONIC_WRITE_ENERGY_PER_NANITE);
  const startingCapacity = BOOTSTRAP_CAPACITY + memoryNanites;
  const requiredCompute = startingCapacity * baselineMs;
  const memoryNote = memoryNanites === 0n
    ? "Encodes into the finite Bootstrap Archive without converting an active assembler."
    : "Permanently converts its listed active-nanite footprint into an attached mnemonic bank.";
  return Object.freeze({
    ...definition,
    description: `${definition.description} ${memoryNote}`,
    effect: effectFor(definition),
    memoryNanites,
    energyCost,
    baselineMs,
    requiredCompute,
    requiredNaniteMs: requiredCompute,
    cost: frozenCost(energyCost),
  });
}

export const RESEARCH = Object.freeze(Object.fromEntries(
  Object.values(LEGACY_RESEARCH).map((definition) => [
    definition.id,
    convertResearch(definition),
  ]),
));

export const FIRST_HORIZON_RESEARCH_MINUTE = Object.freeze({
  energy: 21_815_649_237_763_464_480n,
  atoms: Object.freeze(emptyAtoms()),
});
