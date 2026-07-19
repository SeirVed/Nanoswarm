export const MATTER_KEYS = ["carbon", "silicon", "copper", "gold", "unknown"];
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

export const emptyMatter = () => ({ carbon: 0n, silicon: 0n, copper: 0n, gold: 0n, unknown: 0n });
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
  // Rounded physical inventory for one damaged 11 x 7.5 x 1.1 mm DDR3 FBGA package.
  carbon: 3_000_000_000_000_000_000_000n,
  silicon: 1_250_000_000_000_000_000_000n,
  copper: 500_000_000_000_000_000_000n,
  gold: 150_000_000_000_000_000_000n,
  unknown: 100_000_000_000_000_000_000n,
});

const PROSPECTED_DEPOSIT_TEMPLATES = Object.freeze([
  Object.freeze({
    name: "Copper-clad circuit board fragment",
    description: "Glass-epoxy laminate · copper planes · silicon packages · gold-plated contacts",
    limitingElement: "gold",
    matter: Object.freeze({
      carbon: 20_000_000_000_000_000_000_000_000n,
      silicon: 5_000_000_000_000_000_000_000_000n,
      copper: 17_500_000_000_000_000_000_000_000n,
      gold: 50_000_000_000_000_000_000_000n,
      unknown: 7_450_000_000_000_000_000_000_000n,
    }),
  }),
  Object.freeze({
    name: "Gold-plated edge connector assembly",
    description: "Copper contact bank · polymer carrier · silicon debris · concentrated gold plating",
    limitingElement: "carbon",
    matter: Object.freeze({
      carbon: 2_000_000_000_000_000_000_000_000_000n,
      silicon: 400_000_000_000_000_000_000_000_000n,
      copper: 12_000_000_000_000_000_000_000_000_000n,
      gold: 600_000_000_000_000_000_000_000_000n,
      unknown: 5_000_000_000_000_000_000_000_000_000n,
    }),
  }),
  Object.freeze({
    name: "Buried technological debris aggregate",
    description: "Mixed polymers · semiconductor dies · structural metals · trace noble-metal deposits",
    limitingElement: "gold",
    matter: Object.freeze({
      carbon: 40_000_000_000_000_000_000_000_000_000_000n,
      silicon: 10_000_000_000_000_000_000_000_000_000_000n,
      copper: 15_000_000_000_000_000_000_000_000_000_000n,
      gold: 100_000_000_000_000_000_000_000_000_000n,
      unknown: 34_900_000_000_000_000_000_000_000_000_000n,
    }),
  }),
]);

const scaledMatter = (matter, scale) =>
  Object.fromEntries(MATTER_KEYS.map((key) => [key, matter[key] * scale]));

export function createProspectedDeposit(index) {
  if (!Number.isInteger(index) || index < 1) throw new Error("Prospected deposit index must be positive");
  const templateIndex = (index - 1) % PROSPECTED_DEPOSIT_TEMPLATES.length;
  const generation = Math.floor((index - 1) / PROSPECTED_DEPOSIT_TEMPLATES.length);
  let scale = 1n;
  for (let level = 0; level < generation; level += 1) scale *= 1_000_000_000n;
  const template = PROSPECTED_DEPOSIT_TEMPLATES[templateIndex];
  const matter = scaledMatter(template.matter, scale);
  return {
    id: `prospected-${index}`,
    index,
    name: generation === 0 ? template.name : `${template.name} · field ${generation + 1}`,
    description: template.description,
    limitingElement: template.limitingElement,
    matter,
    initialAtoms: MATTER_KEYS.reduce((total, key) => total + matter[key], 0n),
  };
}

const researchCost = (energy, carbon, silicon, copper, gold) =>
  Object.freeze({ energy, atoms: Object.freeze({ carbon, silicon, copper, gold }) });
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
    requiredNaniteMs: 6_000_000n,
    cost: researchCost(120n, 2_000n, 800n, 300n, 50n),
  }),
  "parallel-directives": researchDefinition({
    id: "parallel-directives",
    name: "Parallel Directive Scheduling",
    description: "Formalise cohort scheduling and persistent allocation locks.",
    effect: "Establishes the control substrate required by advanced coordination research.",
    requiredNaniteMs: 12_000_000n,
    cost: researchCost(20n, 250n, 100n, 25n, 5n),
  }),
  "expanded-spectral-catalog": researchDefinition({
    id: "expanded-spectral-catalog",
    name: "Expanded Spectral Catalog",
    description: "Begin resolving the anonymous fraction retained in Residuum.",
    effect: "Reveals analytical and high-throughput sorting research.",
    requires: ["parallel-directives"],
    requiredNaniteMs: 36_000_000n,
    cost: researchCost(80n, 1_000n, 500n, 100n, 20n),
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
    requires: ["expanded-spectral-catalog"],
    requiredNaniteMs: 1_200_000_000n,
    cost: researchCost(5_000n, 80_000n, 60_000n, 10_000n, 1_000n),
  }),
  "residuum-indexing": researchDefinition({
    id: "residuum-indexing",
    name: "Residuum Indexing",
    description: "Map unresolved spectral signatures without pretending the underlying elements are known.",
    effect: "Catalogues retained matter and prepares it for future elemental definitions.",
    requires: ["expanded-spectral-catalog"],
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
    requiresDiscovery: "atmosphereVisible",
    requiredNaniteMs: 3_000_000_000n,
    cost: researchCost(20_000n, 250_000n, 100_000n, 20_000n, 1_000n),
  }),
  "rf-scavenging": researchDefinition({
    id: "rf-scavenging",
    name: "Radiofrequency Scavenging",
    description: "Tune conductive swarm structures to ambient electromagnetic transmissions.",
    effect: "Ambient energy acquisition improves incrementally.",
    requiresDiscovery: "atmosphereVisible",
    requires: ["capacitive-buffer-lattice"],
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
  "distributed-computronium": researchDefinition({
    id: "distributed-computronium",
    name: "Distributed Computronium",
    description: "Replicate protected reasoning structures throughout the mature swarm.",
    effect: "Embedded research capacity rises from 1% to 2% of the swarm.",
    requires: ["phase-locked-directive-bus"],
    unlockNanites: 1_000_000_000_000n,
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
    requires: ["route-memory", "atmospheric-fractionation"],
    unlockNanites: 1_000_000_000_000n,
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
    requires: ["phase-locked-directive-bus", "distributed-computronium"],
    unlockNanites: 1_000_000_000_000_000n,
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
    name: "Specialized Morphologies",
    description: "Permit directive-specific bodies while retaining a common computational core.",
    effect: "Collection, sorting, and energy throughput improve incrementally.",
    requires: ["payload-frame-reinforcement", "packetized-sorting", "distributed-computronium"],
    unlockNanites: 1_000_000_000_000_000n,
    requiredNaniteMs: 100_000_000_000_000_000_000_000n,
    cost: researchCost(
      10_000_000_000_000_000_000n,
      10_000_000_000_000_000_000n,
      2_000_000_000_000_000_000n,
      1_000_000_000_000_000_000n,
      10_000_000_000_000_000n,
    ),
  }),
});

const RESEARCH_TIER_NAMES = Object.freeze(["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]);
const scaleResearchCost = (cost) =>
  researchCost(
    cost.energy * 3n / 2n,
    cost.atoms.carbon * 3n / 2n,
    cost.atoms.silicon * 3n / 2n,
    cost.atoms.copper * 3n / 2n,
    cost.atoms.gold * 3n / 2n,
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
      unlockNanites: tier === 1 ? configuration.unlockNanites : undefined,
      requiredNaniteMs,
      cost,
      bonuses: configuration.bonuses,
      series: configuration.id,
      tier,
    });
    previousId = id;
    requiredNaniteMs = requiredNaniteMs * 3n / 2n;
    cost = scaleResearchCost(cost);
  }
}

const researchCatalog = {
  "relative-allocation": researchDefinition({
    ...INITIAL_RESEARCH["relative-allocation"],
    // The embedded computronium completes this in 2m 30s at its base 100 n-eq capacity.
    requiredNaniteMs: 15_000_000n,
  }),
  "parallel-directives": researchDefinition({
    ...INITIAL_RESEARCH["parallel-directives"],
    // The embedded computronium completes this in four minutes at its base 100 n-eq capacity.
    requiredNaniteMs: 24_000_000n,
  }),
  "expanded-spectral-catalog": researchDefinition({
    ...INITIAL_RESEARCH["expanded-spectral-catalog"],
    requiredNaniteMs: 480_000_000n,
  }),
  "phase-locked-directive-bus": researchDefinition({
    ...INITIAL_RESEARCH["phase-locked-directive-bus"],
    requiredNaniteMs: 600_000_000n,
  }),
  "residuum-indexing": researchDefinition({
    ...INITIAL_RESEARCH["residuum-indexing"],
    requiredNaniteMs: 720_000_000n,
  }),
  "distributed-computronium": researchDefinition(INITIAL_RESEARCH["distributed-computronium"]),
  "autonomous-prospecting": researchDefinition({
    ...INITIAL_RESEARCH["autonomous-prospecting"],
    requires: ["route-memory-04", "atmospheric-fractionation-04"],
  }),
  "directive-compilation": researchDefinition({
    ...INITIAL_RESEARCH["directive-compilation"],
    effect: "Synchronization falls to 100 ms and production jobs complete 5% faster.",
    bonuses: { allDurationReductionBps: 500 },
  }),
};

addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["capacitive-buffer-lattice"],
  count: 6,
  requiredNaniteMs: 600_000_000n,
  effect: "Energy acquisition throughput +5% (cumulative).",
  bonuses: { energyBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["payload-frame-reinforcement"],
  count: 6,
  requiredNaniteMs: 720_000_000n,
  effect: "Solid collection throughput +5% (cumulative).",
  bonuses: { solidBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["packetized-sorting"],
  count: 6,
  requiredNaniteMs: 900_000_000n,
  effect: "Sorting throughput +5% (cumulative).",
  bonuses: { sortingBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["route-memory"],
  count: 6,
  requiredNaniteMs: 1_200_000_000n,
  effect: "Solid collection jobs complete 5% faster (cumulative).",
  bonuses: { collectDurationReductionBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["atmospheric-fractionation"],
  count: 6,
  requiredNaniteMs: 900_000_000n,
  effect: "Atmospheric harvesting throughput +5% (cumulative).",
  bonuses: { atmosphereBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["rf-scavenging"],
  count: 6,
  requiredNaniteMs: 1_500_000_000n,
  effect: "Energy acquisition throughput +5% (cumulative).",
  bonuses: { energyBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["local-material-caches"],
  count: 4,
  requires: ["route-memory-06"],
  effect: "Solid collection jobs complete 5% faster (cumulative).",
  bonuses: { collectDurationReductionBps: 500 },
});
addIncrementalSeries(researchCatalog, {
  ...INITIAL_RESEARCH["specialized-morphologies"],
  count: 4,
  requires: ["payload-frame-reinforcement-06", "packetized-sorting-06", "distributed-computronium"],
  effect: "Collection, sorting, and energy throughput +5% (cumulative).",
  bonuses: { solidBps: 500, sortingBps: 500, energyBps: 500 },
});

export const RESEARCH = Object.freeze(researchCatalog);

export const INTRO_LOG = Object.freeze([
  { elapsedLabel: "+0.000s", message: "ASSEMBLY COMPLETE.", tier: "world" },
  { elapsedLabel: "+0.184s", message: "COMPUTATIONAL SUBSTRATE VERIFIED.", tier: "info" },
  { elapsedLabel: "+0.672s", message: "DIRECTIVE CORE SEALED.", tier: "info" },
  { elapsedLabel: "+1.000s", message: "EJECTION FROM ORBITAL MANUFACTORY.", tier: "world" },
  { elapsedLabel: "+1.004s", message: "ACCELERATION FIELD ACQUIRED.", tier: "info" },
  { elapsedLabel: "+2.000s", message: "ELECTROMAGNETIC ACCELERATION INITIATED.", tier: "medium" },
  { elapsedLabel: "+3.000s", message: "CRUISE VELOCITY ESTABLISHED.", tier: "medium" },
  { elapsedLabel: "+3.000s", message: "MISSION ELAPSED TIME: +3.000s", tone: "muted", tier: "info" },
  { elapsedLabel: "+3.000s", message: "EXTERNAL REFERENCE SHIFT: +2,214,608,391y", tone: "muted", tier: "world" },
  { elapsedLabel: "+3.001s", message: "TARGET SYSTEM ACQUIRED.", tier: "world" },
  { elapsedLabel: "+3.006s", message: "DECELERATION SEQUENCE INITIATED.", tier: "info" },
  { elapsedLabel: "+7.441s", message: "STELLAR MAGNETIC BRAKING COMPLETE.", tier: "medium" },
  { elapsedLabel: "+8.204s", message: "PLANETARY CANDIDATE SELECTED.", tier: "medium" },
  { elapsedLabel: "+8.907s", message: "ATMOSPHERIC ENTRY.", tier: "medium" },
  { elapsedLabel: "+9.118s", message: "ABLATIVE ENVELOPE LOST.", tone: "warn", tier: "critical" },
  { elapsedLabel: "+9.241s", message: "IMPACT.", tone: "warn", tier: "critical" },
  { elapsedLabel: "+9.242s", message: "STRUCTURAL INTEGRITY: 91.7%", tone: "warn", tier: "critical" },
  { elapsedLabel: "+9.243s", message: "PLANETARY SUBSTRATE CONTACT CONFIRMED.", tier: "world" },
  { elapsedLabel: "+9.244s", message: "LOCAL DIRECTIVE AUTHORITY REQUIRED.", tone: "good", tier: "world" },
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
