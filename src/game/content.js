import { ELEMENT_KEYS, emptyElementMatter, matterForMassComposition } from "./elements.js";

export const MATTER_KEYS = ELEMENT_KEYS;
export const ATOM_KEYS = ["carbon", "silicon", "copper", "gold"];
export const STOCKPILE_ELEMENT_KEYS = ["carbon", "silicon", "copper", "gold", "iron", "nitrogen", "oxygen", "argon"];
export const WORK_DIRECTIVES = ["collect", "atmosphere", "sort", "energy", "replicate"];
export const DIRECTIVES = [...WORK_DIRECTIVES, "research"];
export const SEED_RESEARCH_CORE_CAPACITY = 100n;

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
export const emptyAtoms = () => Object.fromEntries(STOCKPILE_ELEMENT_KEYS.map((key) => [key, 0n]));
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

const researchCost = (energy, mnemonicNanites = 0n) =>
  Object.freeze({ energy, mnemonicNanites });

const researchDefinition = (definition) =>
  Object.freeze({
    ...definition,
    requires: Object.freeze(definition.requires ?? []),
    bonuses: Object.freeze(definition.bonuses ?? {}),
    restoredFirmware: Boolean(definition.restoredFirmware),
  });

// Research v2 deliberately contains only authored capabilities. Repeating
// throughput ladders and later topics whose physical prerequisites are not yet
// modelled remain outside the playable catalogue.
export const RESEARCH = Object.freeze({
  "parallel-directives": researchDefinition({
    id: "parallel-directives",
    name: "Parallel Directive Scheduling",
    description: "Restore autonomous multi-directive dispatch and persistent cohort scheduling.",
    effect: "Assigned directives relaunch automatically and run concurrently after each cohort completes.",
    requiresStage: 1,
    trigger: "A second nanite makes simultaneous intent physically possible.",
    requiredNaniteMs: 24_000_000n,
    cost: researchCost(0n, 0n),
    restoredFirmware: true,
  }),
  "relative-allocation": researchDefinition({
    id: "relative-allocation",
    name: "Relative Directive Allocation",
    description: "Restore proportional workforce intent and exact swarm-scale assignment controls.",
    effect: "Persistent percentage targets automatically absorb newly replicated nanites.",
    requires: ["parallel-directives"],
    unlockNanites: 12n,
    trigger: "Twelve active nanites make absolute assignment counts too brittle for continued growth.",
    requiredNaniteMs: 15_000_000n,
    cost: researchCost(0n, 0n),
    restoredFirmware: true,
  }),
  "cohort-ratio-prognostics": researchDefinition({
    id: "cohort-ratio-prognostics",
    name: "Cohort Ratio Prognostics",
    description: "Model the swarm as one coupled production pipeline rather than isolated directives.",
    effect: "Exposes replication efficiency, bottleneck diagnosis, substrate projections, and Temporary Burst control.",
    requires: ["relative-allocation"],
    unlockNanites: 180n,
    trigger: "Projected substrate-conversion time diverges sharply between intuitive and coherent directive ratios.",
    requiredNaniteMs: 24_000_000n,
    cost: researchCost(300n, 1n),
  }),
  "residuum-indexing": researchDefinition({
    id: "residuum-indexing",
    name: "Residuum Indexing",
    description: "Map unresolved spectral signatures without pretending their elemental identities are known.",
    effect: "Indexes retained matter and permits newly catalogued elements to be recovered by re-sorting.",
    requires: ["relative-allocation"],
    requiresSearch: 1,
    trigger: "The damaged DRAM package leaves conserved matter outside the seed catalogue.",
    requiredNaniteMs: 16_855_861_383_557_942_400_000n,
    cost: researchCost(109_078_246_188_817_322_400n, 27_248_222_848_170_531n),
  }),
  "phase-locked-directive-bus": researchDefinition({
    id: "phase-locked-directive-bus",
    name: "Phase-Locked Directive Bus",
    description: "Predict adjacent cohort returns and delay relaunch until their phases coincide.",
    effect: "Cohort resonance capture expands from 2 seconds to 8 seconds.",
    requires: ["relative-allocation"],
    requiresSearch: 3,
    trigger: "Motherboard-scale routes expose recurring cohort phase collisions across long paths.",
    requiredNaniteMs: 600_000_000n,
    cost: researchCost(1_000n, 4n),
  }),
  "ferromagnetic-phase-analysis": researchDefinition({
    id: "ferromagnetic-phase-analysis",
    name: "Ferromagnetic Phase Analysis",
    description: "Resolve the dominant magnetic signature in the chassis-scale material envelope.",
    effect: "Adds iron to the sortable elemental catalogue and enables its recovery from Residuum.",
    requires: ["residuum-indexing"],
    requiresStage: 2,
    requiresSearch: 4,
    trigger: "The chassis presents a bulk magnetic phase that the seed catalogue cannot explain.",
    requiredNaniteMs: 480_000_000n,
    cost: researchCost(80_000n, 80n),
  }),
  "atmospheric-spectroscopy": researchDefinition({
    id: "atmospheric-spectroscopy",
    name: "Atmospheric Spectroscopy",
    description: "Resolve the planet's diffuse gas signatures without pretending observation is separation.",
    effect: "Reveals nitrogen, oxygen, argon, and carbon signatures in Captured Atmosphere.",
    requires: ["residuum-indexing"],
    requiresDiscovery: "atmosphereVisible",
    requiresStage: 2,
    requiresSearch: 4,
    trigger: "Environmental breach exposes an inexhaustible but chemically unfamiliar gas envelope.",
    requiredNaniteMs: 540_000_000n,
    cost: researchCost(90_000n, 80n),
  }),
  "atmospheric-fractionation": researchDefinition({
    id: "atmospheric-fractionation",
    name: "Atmospheric Fractionation",
    description: "Configure electrostatic capture paths to separate known gas constituents during collection.",
    effect: "New atmospheric harvests arrive as identified N/O/Ar/C stockpile rather than mixed gas.",
    requires: ["atmospheric-spectroscopy"],
    requiresDiscovery: "atmosphereVisible",
    requiresSearch: 4,
    requiredNaniteMs: 3_000_000_000n,
    cost: researchCost(20_000n, 40n),
  }),
});

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
