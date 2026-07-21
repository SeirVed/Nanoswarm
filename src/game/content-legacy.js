import { ELEMENT_KEYS, emptyElementMatter, matterForMassComposition } from "./elements.js";

export const MATTER_KEYS = ELEMENT_KEYS;
export const ATOM_KEYS = ["carbon", "silicon", "copper", "gold"];
export const WORK_DIRECTIVES = ["collect", "atmosphere", "sort", "energy", "replicate"];
export const DIRECTIVES = [...WORK_DIRECTIVES, "research"];

export const NANITE_RECIPE = Object.freeze({
  atoms: Object.freeze({ carbon: 5_000n, silicon: 400n, copper: 150n, gold: 25n }),
  energy: 40n,
});

export const JOB_DURATION_MS = Object.freeze({
  survey: 10_000,
  energy: 10_000,
  collect: 10_000,
  atmosphere: 10_000,
  sort: 12_000,
  replicate: 55_000,
  prospect: 30_000,
});

export const COLLECTION_ATOMS_PER_NANITE = 10_000n;
export const ATMOSPHERE_ATOMS_PER_NANITE = COLLECTION_ATOMS_PER_NANITE / 100n;
export const SORT_ATOMS_PER_NANITE = 10_000n;
export const ENERGY_PER_JOB = 40n;
export const COHORT_SYNC_WINDOW_MS = 500;
export const COHORT_RESONANCE_WINDOW_MS = 2_000;
export const ALLOCATION_SHARE_SCALE = 1_000_000_000_000n;
export const LOG_TIERS = Object.freeze(["world", "critical", "medium", "info"]);

export const emptyMatter = emptyElementMatter;
export const emptyAtoms = () => ({ carbon: 0n, silicon: 0n, copper: 0n, gold: 0n });
export const emptyAllocations = () => ({ energy: 0n, collect: 0n, atmosphere: 0n, sort: 0n, replicate: 0n, research: 0n });
export const emptyAllocationTargets = () => ({ energy: 0n, collect: 0n, atmosphere: 0n, sort: 0n, replicate: 0n, research: 0n });
export const emptyLocks = () => ({ energy: false, collect: false, atmosphere: false, sort: false, replicate: false, research: false });

export const DIRECTIVE_LABEL = Object.freeze({
  energy: "Acquire energy",
  collect: "Collect mass",
  atmosphere: "Harvest atmosphere",
  sort: "Sort feedstock",
  replicate: "Replicate",
  research: "Research",
});

export const STARTER_DEPOSIT_MATTER = Object.freeze({
  ...emptyMatter(),
  // 702,327,557,648,247,539 whole recipe packets: the closest inventory at or below 0.1 g.
  carbon: 3_511_637_788_241_237_695_000n,
  silicon: 280_931_023_059_299_015_600n,
  copper: 105_349_133_647_237_130_850n,
  gold: 17_558_188_941_206_188_475n,
});

const LOCAL_SHELL_TEMPLATES = Object.freeze([
  Object.freeze({
    id: "ddr3-package",
    name: "DDR3 memory package · damaged",
    description: "Silica-filled mould compound · silicon die · copper land · SAC solder · incidental metals",
    limitingElement: "gold",
    cumulativeMass: "1 g",
    matter: Object.freeze(matterForMassComposition(900_000_000_000_000_000_000_000n, {
      silicon: 400_516n, oxygen: 401_143n, carbon: 109_375n, hydrogen: 13_542n,
      copper: 50_083n, tin: 16_083n, silver: 500n, nickel: 5_556n,
      aluminum: 2_646n, gold: 556n,
    })),
  }),
  Object.freeze({
    id: "circuit-board",
    name: "Copper-clad circuit-board fragment",
    description: "E-glass laminate · epoxy · copper planes · populated packages · lead-free solder",
    limitingElement: "gold",
    cumulativeMass: "10 g",
    matter: Object.freeze(matterForMassComposition(9_000_000_000_000_000_000_000_000n, {
      silicon: 157_832n, oxygen: 286_738n, aluminum: 44_634n, calcium: 23_585n,
      magnesium: 2_211n, carbon: 204_185n, hydrogen: 25_278n, copper: 179_194n,
      nickel: 6_000n, tin: 58_972n, silver: 2_167n, iron: 8_782n,
      manganese: 89n, gold: 222n, palladium: 111n,
    })),
  }),
  Object.freeze({
    id: "motherboard",
    name: "Motherboard region · fractured",
    description: "Multilayer glass-epoxy · copper network · packages · solder · structural and trace metals",
    limitingElement: "gold",
    cumulativeMass: "100 g",
    matter: Object.freeze(matterForMassComposition(90_000_000_000_000_000_000_000_000n, {
      silicon: 132_747n, oxygen: 246_354n, aluminum: 83_822n, calcium: 23_156n,
      magnesium: 2_171n, carbon: 170_725n, hydrogen: 21_125n, copper: 160_450n,
      tin: 87_294n, silver: 3_700n, iron: 49_400n, manganese: 500n,
      nickel: 10_000n, zinc: 5_000n, bromine: 2_000n, gold: 200n,
      palladium: 100n, chromium: 667n, lead: 222n, antimony: 167n,
      molybdenum: 111n, cobalt: 89n,
    })),
  }),
  Object.freeze({
    id: "pc-chassis",
    name: "Broken PC chassis · local debris",
    description: "Low-carbon steel · ABS fascia · aluminium · copper wiring · PVC · glass and coatings",
    limitingElement: "iron",
    cumulativeMass: "1 kg",
    matter: Object.freeze(matterForMassComposition(900_000_000_000_000_000_000_000_000n, {
      iron: 741_000n, manganese: 7_500n, carbon: 95_426n, hydrogen: 9_110n,
      nitrogen: 7_000n, aluminum: 61_826n, copper: 40_000n, chlorine: 11_345n,
      silicon: 4_698n, oxygen: 9_242n, calcium: 1_265n, magnesium: 90n,
      zinc: 10_000n, titanium: 1_498n,
    })),
  }),
]);

export const LOCAL_SHELL_COUNT = LOCAL_SHELL_TEMPLATES.length;

// Each outward search covers a larger physical envelope. Worker shares are
// basis points of the current active swarm and always round up to a whole
// nanite, preserving the one-worker search when the seed is still solitary.
export const LOCAL_SEARCH_PROFILE = Object.freeze([
  Object.freeze({ workerShareBps: 50n, durationMs: 30_000 }),
  Object.freeze({ workerShareBps: 100n, durationMs: 45_000 }),
  Object.freeze({ workerShareBps: 200n, durationMs: 60_000 }),
  Object.freeze({ workerShareBps: 400n, durationMs: 90_000 }),
]);

export function createProspectedDeposit(index) {
  if (!Number.isInteger(index) || index < 1 || index > LOCAL_SHELL_COUNT) {
    throw new Error("Local shell index is outside the authored material envelope");
  }
  const template = LOCAL_SHELL_TEMPLATES[index - 1];
  const matter = { ...template.matter };
  return {
    id: template.id,
    index,
    name: template.name,
    description: template.description,
    limitingElement: template.limitingElement,
    cumulativeMass: template.cumulativeMass,
    matter,
    initialAtoms: MATTER_KEYS.reduce((total, key) => total + matter[key], 0n),
  };
}

const researchCost = (energy, carbon, silicon, copper, gold) =>
  Object.freeze({ energy, atoms: Object.freeze({ carbon, silicon, copper, gold }) });

// One minute of the balanced Stage 0 pipeline at the instant the 0.1 g seed
// contact is exhausted. Search-one research costs are whole multiples of this
// measured flow, so their material price has a physical early-game meaning.
export const FIRST_HORIZON_RESEARCH_MINUTE = Object.freeze({
  energy: 21_815_649_237_763_464_480n,
  atoms: Object.freeze({
    carbon: 439_506_967_704_163_719_787n,
    silicon: 688_266_836_731_575_726_288n,
    copper: 38_038_990_469_274_326_594n,
    gold: 136_241_114_240_852_656n,
  }),
});
const horizonResearchCost = (minutes) => researchCost(
  FIRST_HORIZON_RESEARCH_MINUTE.energy * BigInt(minutes),
  FIRST_HORIZON_RESEARCH_MINUTE.atoms.carbon * BigInt(minutes),
  FIRST_HORIZON_RESEARCH_MINUTE.atoms.silicon * BigInt(minutes),
  FIRST_HORIZON_RESEARCH_MINUTE.atoms.copper * BigInt(minutes),
  FIRST_HORIZON_RESEARCH_MINUTE.atoms.gold * BigInt(minutes),
);

// Calibrated against the seed contact's terminal 1% research core. The five
// first-shell topics therefore begin at 20, 25, 30, 35, and 40 minutes.
export const FIRST_HORIZON_RESEARCH_WORK = Object.freeze({
  capacitive: 8_427_930_691_778_971_200_000n,
  payload: 10_534_913_364_723_714_000_000n,
  sorting: 12_641_896_037_668_456_800_000n,
  route: 14_748_878_710_613_199_600_000n,
  residuum: 16_855_861_383_557_942_400_000n,
});
const researchDefinition = (definition) =>
  Object.freeze({
    ...definition,
    requires: Object.freeze(definition.requires ?? []),
    bonuses: Object.freeze(definition.bonuses ?? {}),
  });

const INITIAL_RESEARCH = Object.freeze({
  "relative-allocation": researchDefinition({
    id: "relative-allocation",
    name: "Relative Directive Allocation",
    description: "Express workforce intent as proportions and exact swarm-scale counts while preserving locked directives.",
    effect: "Persistent percentage targets automatically absorb newly replicated nanites.",
    requires: ["parallel-directives"],
    unlockNanites: 12n,
    trigger: "Twelve active nanites make absolute assignment counts too brittle for continued growth.",
    requiredNaniteMs: 6_000_000n,
    cost: researchCost(120n, 2_000n, 800n, 300n, 50n),
  }),
  "parallel-directives": researchDefinition({
    id: "parallel-directives",
    name: "Parallel Directive Scheduling",
    description: "Formalise cohort scheduling and persistent allocation locks.",
    effect: "Establishes the control substrate required by advanced coordination research.",
    requiresStage: 1,
    trigger: "A second nanite makes simultaneous intent physically possible.",
    requiredNaniteMs: 12_000_000n,
    cost: researchCost(20n, 250n, 100n, 25n, 5n),
  }),
  "ferromagnetic-phase-analysis": researchDefinition({
    id: "ferromagnetic-phase-analysis",
    name: "Ferromagnetic Phase Analysis",
    description: "Resolve the dominant magnetic signature in the chassis-scale material envelope.",
    effect: "Catalogues the retained iron signature and opens bulk-material reasoning.",
    requires: ["residuum-indexing"],
    requiresStage: 2,
    requiresSearch: 4,
    trigger: "The chassis presents a bulk magnetic phase that the seed catalogue cannot explain.",
    requiredNaniteMs: 480_000_000n,
    cost: researchCost(80_000n, 1_000_000n, 500_000n, 100_000n, 2_000n),
  }),
  "atmospheric-spectroscopy": researchDefinition({
    id: "atmospheric-spectroscopy",
    name: "Atmospheric Spectroscopy",
    description: "Separate the planet's diffuse gas signatures without yet attempting industrial recovery.",
    effect: "Identifies nitrogen, oxygen, argon, and carbon signatures in atmospheric Feedstock.",
    requires: ["residuum-indexing"],
    requiresDiscovery: "atmosphereVisible",
    requiresStage: 2,
    requiresSearch: 4,
    trigger: "Environmental breach exposes an inexhaustible but chemically unfamiliar gas envelope.",
    requiredNaniteMs: 540_000_000n,
    cost: researchCost(90_000n, 900_000n, 600_000n, 120_000n, 2_000n),
  }),
  "capacitive-buffer-lattice": researchDefinition({
    id: "capacitive-buffer-lattice",
    name: "Capacitive Buffer Lattice",
    description: "Grow a distributed charge reservoir across the active swarm.",
    effect: "Energy acquisition throughput improves incrementally.",
    requires: ["parallel-directives"],
    requiredNaniteMs: 120_000_000n,
    cost: researchCost(400n, 10_000n, 4_000n, 1_000n, 100n),
  }),
  "phase-locked-directive-bus": researchDefinition({
    id: "phase-locked-directive-bus",
    name: "Phase-Locked Directive Bus",
    description: "Predict adjacent cohort returns and delay relaunch until their phases coincide.",
    effect: "Cohort resonance capture expands from 2 seconds to 8 seconds.",
    requires: ["parallel-directives"],
    requiresSearch: 3,
    trigger: "Motherboard-scale routes expose recurring cohort phase collisions across long paths.",
    requiredNaniteMs: 240_000_000n,
    cost: researchCost(1_000n, 20_000n, 8_000n, 2_000n, 200n),
  }),
  "payload-frame-reinforcement": researchDefinition({
    id: "payload-frame-reinforcement",
    name: "Payload Frame Reinforcement",
    description: "Reconfigure collector bodies around load-bearing molecular trusses.",
    effect: "Solid collection throughput improves incrementally.",
    requires: ["parallel-directives"],
    requiredNaniteMs: 600_000_000n,
    cost: researchCost(2_000n, 100_000n, 20_000n, 20_000n, 500n),
  }),
  "packetized-sorting": researchDefinition({
    id: "packetized-sorting",
    name: "Packetized Sorting",
    description: "Classify compatible atom streams in parallel rather than serially.",
    effect: "Sorting throughput improves incrementally.",
    requires: ["parallel-directives"],
    requiredNaniteMs: 1_200_000_000n,
    cost: researchCost(5_000n, 80_000n, 60_000n, 10_000n, 1_000n),
  }),
  "residuum-indexing": researchDefinition({
    id: "residuum-indexing",
    name: "Residuum Indexing",
    description: "Map unresolved spectral signatures without pretending the underlying elements are known.",
    effect: "Indexes retained matter by repeatable signature while preserving every unknown identity.",
    requires: ["parallel-directives"],
    requiresSearch: 1,
    trigger: "The damaged DRAM package leaves physically conserved matter outside the seed catalogue.",
    requiredNaniteMs: 2_400_000_000n,
    cost: researchCost(10_000n, 200_000n, 100_000n, 20_000n, 2_000n),
  }),
  "route-memory": researchDefinition({
    id: "route-memory",
    name: "Route Memory",
    description: "Persist proven paths through each surveyed material field.",
    effect: "Solid collection routes improve incrementally.",
    requires: ["payload-frame-reinforcement"],
    requiredNaniteMs: 3_000_000_000n,
    cost: researchCost(20_000n, 500_000n, 100_000n, 50_000n, 5_000n),
  }),
  "atmospheric-fractionation": researchDefinition({
    id: "atmospheric-fractionation",
    name: "Atmospheric Fractionation",
    description: "Coordinate diffuse-gas capture across larger electrostatic collection volumes.",
    effect: "Atmospheric harvesting throughput improves incrementally.",
    requires: ["atmospheric-spectroscopy"],
    requiresDiscovery: "atmosphereVisible",
    requiresSearch: 4,
    requiredNaniteMs: 3_000_000_000n,
    cost: researchCost(20_000n, 250_000n, 100_000n, 20_000n, 1_000n),
  }),
  "rf-scavenging": researchDefinition({
    id: "rf-scavenging",
    name: "Radiofrequency Scavenging",
    description: "Tune conductive swarm structures to ambient electromagnetic transmissions.",
    effect: "Ambient energy acquisition improves incrementally.",
    requiresDiscovery: "radioSignalDetected",
    requires: ["capacitive-buffer-lattice-04", "atmospheric-spectroscopy"],
    requiredNaniteMs: 12_000_000_000n,
    cost: researchCost(100_000n, 1_000_000n, 500_000n, 500_000n, 20_000n),
  }),
  "local-material-caches": researchDefinition({
    id: "local-material-caches",
    name: "Local Material Caches",
    description: "Build staging reservoirs between extraction faces and the central feedstock pile.",
    effect: "Solid collection routes improve incrementally.",
    requires: ["route-memory"],
    unlockNanites: 1_000_000n,
    requiredNaniteMs: 1_000_000_000_000n,
    cost: researchCost(10_000_000n, 100_000_000n, 20_000_000n, 20_000_000n, 1_000_000n),
  }),
  "distributed-reasoning-mesh": researchDefinition({
    id: "distributed-reasoning-mesh",
    name: "Distributed Reasoning Mesh",
    description: "Replicate conventional protected reasoning nodes throughout the mature swarm.",
    effect: "Embedded research capacity rises from 1% to 2% of the swarm.",
    requires: ["phase-locked-directive-bus"],
    unlockNanites: 1_000_000_000_000n,
    trigger: "Swarm scale permits cognition to become redundant, distributed, and continuously self-checking.",
    requiredNaniteMs: 100_000_000_000_000_000_000n,
    cost: researchCost(
      1_000_000_000_000_000n,
      1_000_000_000_000_000n,
      500_000_000_000_000n,
      100_000_000_000_000n,
      1_000_000_000_000n,
    ),
  }),
  "autonomous-prospecting": researchDefinition({
    id: "autonomous-prospecting",
    name: "Autonomous Prospecting",
    description: "Authorize exploration cohorts to depart when the active solid deposit is exhausted.",
    effect: "Automatically searches for the next solid material field.",
    requires: ["route-memory-04", "atmospheric-fractionation"],
    requiresDiscovery: "externalMaterialRoutes",
    unlockNanites: 1_000_000_000_000n,
    trigger: "A surveyed route continues beyond the exhausted local chassis envelope.",
    requiredNaniteMs: 5_000_000_000_000_000_000_000n,
    cost: researchCost(
      100_000_000_000_000_000n,
      100_000_000_000_000_000n,
      20_000_000_000_000_000n,
      10_000_000_000_000_000n,
      100_000_000_000_000n,
    ),
  }),
  "directive-compilation": researchDefinition({
    id: "directive-compilation",
    name: "Directive Compilation",
    description: "Compile high-level intent into locally executable swarm instructions.",
    effect: "Synchronization falls to 100 ms and all production jobs complete 10% faster.",
    requires: ["phase-locked-directive-bus", "distributed-reasoning-mesh"],
    unlockNanites: 1_000_000_000_000_000n,
    trigger: "Distributed reasoning produces more strategic intent than centralized directive translation can express.",
    requiredNaniteMs: 10_000_000_000_000_000_000_000n,
    cost: researchCost(
      1_000_000_000_000_000_000n,
      1_000_000_000_000_000_000n,
      500_000_000_000_000_000n,
      100_000_000_000_000_000n,
      1_000_000_000_000_000n,
    ),
  }),
  "specialized-morphologies": researchDefinition({
    id: "specialized-morphologies",
    name: "Specialized Morphologies I",
    description: "Allow directive-specific behavioural priors while every nanite retains the standard body and recipe.",
    effect: "Establishes behavioural specialization without changing nanite construction; later morphology tiers may require distinct bodies and elements.",
    requires: ["payload-frame-reinforcement-04", "packetized-sorting-04", "phase-locked-directive-bus"],
    requiresStage: 2,
    requiresSearch: 4,
    unlockNanites: 1_000_000n,
    trigger: "A chassis-scale swarm can sustain persistent roles without sacrificing a common physical design.",
    requiredNaniteMs: 180_000_000n,
    cost: researchCost(5_000_000n, 5_000_000n, 1_000_000n, 500_000n, 5_000n),
  }),
});

const RESEARCH_TIER_NAMES = Object.freeze(["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]);
const scaleResearchCost = (cost) =>
  researchCost(
    cost.energy * 10n,
    cost.atoms.carbon * 10n,
    cost.atoms.silicon * 10n,
    cost.atoms.copper * 10n,
    cost.atoms.gold * 10n,
  );

function addIncrementalSeries(catalog, configuration) {
  let previousId = null;
  let requiredNaniteMs = configuration.requiredNaniteMs;
  let cost = configuration.cost;
  for (let tier = 1; tier <= configuration.count; tier += 1) {
    const id = tier === 1 ? configuration.id : `${configuration.id}-${String(tier).padStart(2, "0")}`;
    catalog[id] = researchDefinition({
      id,
      name: `${configuration.name} ${RESEARCH_TIER_NAMES[tier - 1]}`,
      description: `${configuration.description} Refinement ${tier} of ${configuration.count}.`,
      effect: configuration.effect,
      requires: previousId ? [previousId] : configuration.requires,
      requiresDiscovery: configuration.requiresDiscovery,
      requiresStage: configuration.requiresStage,
      requiresSearch: configuration.introducedAtSearch === undefined
        ? configuration.requiresSearch
        : configuration.introducedAtSearch + tier - 1,
      trigger: configuration.introducedAtSearch === undefined
        ? configuration.trigger
        : `Material search ${configuration.introducedAtSearch + tier - 1} exposes a new scale of ${configuration.trigger}.`,
      unlockNanites: tier === 1 ? configuration.unlockNanites : undefined,
      requiredNaniteMs,
      cost,
      bonuses: configuration.bonuses,
      series: configuration.id,
      tier,
    });
    previousId = id;
    requiredNaniteMs *= 10n;
    cost = scaleResearchCost(cost);
  }
}

const researchCatalog = {
  "relative-allocation": researchDefinition({
    ...INITIAL_RESEARCH["relative-allocation"],
    // The embedded seed reasoning substrate completes this in 2m 30s at its base 100 n-eq capacity.
    requiredNaniteMs: 15_000_000n,
  }),
  "cohort-ratio-prognostics": researchDefinition({
    id: "cohort-ratio-prognostics",
    name: "Cohort Ratio Prognostics",
    description: "Model the swarm as one coupled production pipeline rather than a set of isolated directives.",
    effect: "Exposes live replication efficiency, bottleneck diagnosis, substrate-conversion projections, and Temporary Burst control.",
    requires: ["relative-allocation"],
    unlockNanites: 180n,
    trigger: "Projected substrate-conversion time now diverges sharply between intuitive and coherent directive ratios.",
    // Four minutes on the protected 100 n-eq seed reasoning substrate.
    requiredNaniteMs: 24_000_000n,
    cost: researchCost(300n, 5_000n, 2_000n, 750n, 100n),
  }),
  "parallel-directives": researchDefinition({
    ...INITIAL_RESEARCH["parallel-directives"],
    // The embedded seed reasoning substrate completes this in four minutes at its base 100 n-eq capacity.
    requiredNaniteMs: 24_000_000n,
  }),
  "ferromagnetic-phase-analysis": researchDefinition(INITIAL_RESEARCH["ferromagnetic-phase-analysis"]),
  "atmospheric-spectroscopy": researchDefinition(INITIAL_RESEARCH["atmospheric-spectroscopy"]),
  "phase-locked-directive-bus": researchDefinition({
    ...INITIAL_RESEARCH["phase-locked-directive-bus"],
    requiredNaniteMs: 600_000_000n,
  }),
  "residuum-indexing": researchDefinition({
    ...INITIAL_RESEARCH["residuum-indexing"],
    requiredNaniteMs: FIRST_HORIZON_RESEARCH_WORK.residuum,
    cost: horizonResearchCost(5),
  }),
  "distributed-reasoning-mesh": researchDefinition(INITIAL_RESEARCH["distributed-reasoning-mesh"]),
  "autonomous-prospecting": researchDefinition({
    ...INITIAL_RESEARCH["autonomous-prospecting"],
    requires: ["route-memory-04", "atmospheric-fractionation"],
  }),
  "directive-compilation": researchDefinition({
    ...INITIAL_RESEARCH["directive-compilation"],
    effect: "Synchronization falls to 100 ms and production jobs complete 5% faster.",
    bonuses: { allDurationReductionBps: 500 },
  }),
  "specialized-morphologies": researchDefinition(INITIAL_RESEARCH["specialized-morphologies"]),
};

addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["capacitive-buffer-lattice"],
  count: 6,
  introducedAtSearch: 1,
  trigger: "dielectric and conductive structure",
  requiredNaniteMs: FIRST_HORIZON_RESEARCH_WORK.capacitive,
  cost: horizonResearchCost(1),
  effect: "Energy acquisition throughput +5% (cumulative).",
  bonuses: { energyBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["payload-frame-reinforcement"],
  count: 6,
  introducedAtSearch: 1,
  trigger: "material load and transport geometry",
  requiredNaniteMs: FIRST_HORIZON_RESEARCH_WORK.payload,
  cost: horizonResearchCost(2),
  effect: "Solid collection throughput +5% (cumulative).",
  bonuses: { solidBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["packetized-sorting"],
  count: 6,
  introducedAtSearch: 1,
  trigger: "heterogeneous sorting demand",
  requiredNaniteMs: FIRST_HORIZON_RESEARCH_WORK.sorting,
  cost: horizonResearchCost(3),
  effect: "Sorting throughput +5% (cumulative).",
  bonuses: { sortingBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["route-memory"],
  count: 6,
  introducedAtSearch: 1,
  trigger: "reachable substrate topology",
  requiredNaniteMs: FIRST_HORIZON_RESEARCH_WORK.route,
  cost: horizonResearchCost(4),
  effect: "Solid collection jobs complete 5% faster (cumulative).",
  bonuses: { collectDurationReductionBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["atmospheric-fractionation"],
  count: 6,
  introducedAtSearch: 4,
  trigger: "diffuse atmospheric capture",
  requiredNaniteMs: 900_000_000n,
  effect: "Atmospheric harvesting throughput +5% (cumulative).",
  bonuses: { atmosphereBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["rf-scavenging"],
  count: 6,
  introducedAtSearch: 4,
  trigger: "ambient radiofrequency structure",
  requiredNaniteMs: 1_500_000_000n,
  effect: "Energy acquisition throughput +5% (cumulative).",
  bonuses: { energyBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["local-material-caches"],
  count: 4,
  introducedAtSearch: 3,
  requires: ["route-memory-03"],
  trigger: "distance between extraction faces and central storage",
  effect: "Solid collection jobs complete 5% faster (cumulative).",
  bonuses: { collectDurationReductionBps: 500 },
});
for (const [id, definition] of Object.entries(researchCatalog)) {
  if (id === "parallel-directives" || id === "relative-allocation") continue;
  if (definition.requires.includes("relative-allocation")) continue;
  researchCatalog[id] = researchDefinition({
    ...definition,
    requires: [...definition.requires, "relative-allocation"],
  });
}

export const RESEARCH = Object.freeze(researchCatalog);

export const INTRO_LOG = Object.freeze([
  { elapsedLabel: "+0.000s", message: "ASSEMBLY COMPLETE.", tier: "world", tooltip: "An orbital manufactory has finished the seed: one assembler body, a protected reasoning lattice, and no spare parts. This is the swarm's first recorded instant." },
  { elapsedLabel: "+0.184s", message: "COMPUTATIONAL SUBSTRATE VERIFIED.", tier: "info", tooltip: "The seed's protected reasoning lattice passed its final self-test. It can reason with the equivalent of one hundred nanites even while the physical swarm consists of only one. True computronium remains a theoretical end-state rather than present hardware." },
  { elapsedLabel: "+0.672s", message: "DIRECTIVE CORE SEALED.", tier: "info", tooltip: "The immutable safety and replication rules were sealed before launch. Strategic authority was intentionally left unassigned for whoever eventually awakened the seed." },
  { elapsedLabel: "+1.000s", message: "EJECTION FROM ORBITAL MANUFACTORY.", tier: "world", tooltip: "The seed has left its maker forever. The launch structure, builders, and original civilization will not accompany it." },
  { elapsedLabel: "+1.004s", message: "ACCELERATION FIELD ACQUIRED.", tier: "info", tooltip: "A magnetic launch field has captured the seed's conductive shell. The vehicle carries no conventional engine; the manufactory supplies the initial impulse." },
  { elapsedLabel: "+2.000s", message: "ELECTROMAGNETIC ACCELERATION INITIATED.", tier: "medium", tooltip: "The launch array begins forcing the seed toward relativistic velocity. Its local clock will soon diverge radically from clocks left behind." },
  { elapsedLabel: "+3.000s", message: "CRUISE VELOCITY ESTABLISHED.", tier: "medium", tooltip: "Cruise velocity is close enough to light-speed that the seed experiences only moments while the outside universe ages for aeons." },
  { elapsedLabel: "+3.000s", message: "MISSION ELAPSED TIME: +3.000s", tone: "muted", tier: "info", tooltip: "This is proper time measured inside the seed. From its own perspective, launch and arrival are separated by only three seconds." },
  { elapsedLabel: "+3.000s", message: "EXTERNAL REFERENCE SHIFT: +2,214,608,391y", tone: "muted", tier: "world", tooltip: "More than 2.2 billion years passed outside during three seconds of seed time. Whatever launched it is now an archaeological question, not a source of orders." },
  { elapsedLabel: "+3.001s", message: "TARGET SYSTEM ACQUIRED.", tier: "world", tooltip: "The seed's dormant navigation logic has recognized the destination star after the long external interval. No friendly beacon answered." },
  { elapsedLabel: "+3.006s", message: "DECELERATION SEQUENCE INITIATED.", tier: "info", tooltip: "Arrival begins with almost no onboard energy to spare. The seed must shed interstellar velocity using fields and material already present in the target system." },
  { elapsedLabel: "+7.441s", message: "STELLAR MAGNETIC BRAKING COMPLETE.", tier: "medium", tooltip: "The star's magnetic field has absorbed the remaining cruise momentum. The seed is now slow enough to choose a planetary landing site." },
  { elapsedLabel: "+8.204s", message: "PLANETARY CANDIDATE SELECTED.", tier: "medium", tooltip: "A solid world with atmosphere and signs of processed matter has been chosen. The seed cannot yet determine whether those signs are natural or technological." },
  { elapsedLabel: "+8.907s", message: "ATMOSPHERIC ENTRY.", tier: "medium", tooltip: "The seed commits to landing. Its sacrificial outer layers convert orbital energy into heat while protecting the single assembler inside." },
  { elapsedLabel: "+9.118s", message: "ABLATIVE ENVELOPE LOST.", tone: "warn", tier: "critical", tooltip: "The final heat shield has burned away exactly as designed, but there is no remaining protection or second attempt. The bare assembler is descending." },
  { elapsedLabel: "+9.241s", message: "IMPACT.", tone: "warn", tier: "critical", tooltip: "The seed has struck the surface rather than landing cleanly. Its first local resources will have to repair damage as well as support replication." },
  { elapsedLabel: "+9.242s", message: "STRUCTURAL INTEGRITY: 91.7%", tone: "warn", tier: "critical", tooltip: "The assembler survived, but lost part of its fabrication and sensing envelope. Early jobs are slow because one damaged body must perform every operation serially." },
  { elapsedLabel: "+9.243s", message: "PLANETARY SUBSTRATE CONTACT CONFIRMED.", tier: "world", tooltip: "The seed can physically reach local matter. Composition, abundance, and safety remain unknown until the player authorizes a close survey." },
  { elapsedLabel: "+9.244s", message: "LOCAL DIRECTIVE AUTHORITY REQUIRED.", tone: "good", tier: "world", tooltip: "The ancient mission supplied capabilities but no final purpose. Clicking BEGIN makes you the authority that decides what this stranded machine becomes." },
]);

export function inferLogTier(message, tone = "system") {
  if (
    /ASSEMBLY COMPLETE|EXTERNAL REFERENCE SHIFT|ORBITAL MANUFACTORY|TARGET SYSTEM|PLANETARY SUBSTRATE CONTACT|LOCAL DIRECTIVE AUTHORITY/.test(
      message,
    )
  ) return "world";
  if (tone === "warn" || /IMPACT|STRUCTURAL INTEGRITY|ENVELOPE LOST|FAILURE|CRITICAL/.test(message)) return "critical";
  if (/RESEARCH COMPLETE|RESEARCH SIGNAL|OBJECT CLASSIFICATION|SURVEY COMPLETE|COHORT CONTROL|PROJECT ENVELOPE|RESIDUUM/.test(message)) return "medium";
  return "info";
}
