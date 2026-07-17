export const MATTER_KEYS = ["carbon", "silicon", "copper", "gold", "unknown"];
export const ATOM_KEYS = ["carbon", "silicon", "copper", "gold"];
export const WORK_DIRECTIVES = ["collect", "sort", "energy", "replicate"];
export const DIRECTIVES = [...WORK_DIRECTIVES, "research"];

export const NANITE_RECIPE = Object.freeze({
  atoms: Object.freeze({ carbon: 5_000n, silicon: 400n, copper: 150n, gold: 25n }),
  energy: 40n,
});

export const JOB_DURATION_MS = Object.freeze({
  survey: 10_000,
  energy: 10_000,
  collect: 10_000,
  sort: 12_000,
  replicate: 55_000,
});

export const COLLECTION_ATOMS_PER_NANITE = 10_000n;
export const SORT_ATOMS_PER_NANITE = 10_000n;
export const ENERGY_PER_JOB = 40n;
export const COHORT_SYNC_WINDOW_MS = 500;
export const COHORT_RESONANCE_WINDOW_MS = 2_000;
export const ALLOCATION_SHARE_SCALE = 1_000_000_000_000n;
export const LOG_TIERS = Object.freeze(["world", "critical", "medium", "info"]);

export const emptyMatter = () => ({ carbon: 0n, silicon: 0n, copper: 0n, gold: 0n, unknown: 0n });
export const emptyAtoms = () => ({ carbon: 0n, silicon: 0n, copper: 0n, gold: 0n });
export const emptyAllocations = () => ({ energy: 0n, collect: 0n, sort: 0n, replicate: 0n, research: 0n });
export const emptyAllocationTargets = () => ({ energy: 0n, collect: 0n, sort: 0n, replicate: 0n, research: 0n });
export const emptyLocks = () => ({ energy: false, collect: false, sort: false, replicate: false, research: false });

export const DIRECTIVE_LABEL = Object.freeze({
  energy: "Acquire energy",
  collect: "Collect mass",
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

export const RESEARCH = Object.freeze({
  "relative-allocation": Object.freeze({
    id: "relative-allocation",
    name: "Relative Directive Allocation",
    description: "Express workforce intent as proportions and exact swarm-scale counts while preserving locked directives.",
    unlockNanites: 12n,
    requiredNaniteMs: 6_000_000n,
    cost: Object.freeze({
      energy: 120n,
      atoms: Object.freeze({ carbon: 2_000n, silicon: 800n, copper: 300n, gold: 50n }),
    }),
  }),
  "parallel-directives": Object.freeze({
    id: "parallel-directives",
    name: "Parallel Directive Scheduling",
    description: "Formalise cohort scheduling and expose persistent allocation locks.",
    requiredNaniteMs: 12_000_000n,
    cost: Object.freeze({
      energy: 20n,
      atoms: Object.freeze({ carbon: 250n, silicon: 100n, copper: 25n, gold: 5n }),
    }),
  }),
  "expanded-spectral-catalog": Object.freeze({
    id: "expanded-spectral-catalog",
    name: "Expanded Spectral Catalog",
    description: "Begin resolving the anonymous fraction retained in Residuum.",
    requiredNaniteMs: 36_000_000n,
    cost: Object.freeze({
      energy: 80n,
      atoms: Object.freeze({ carbon: 1_000n, silicon: 500n, copper: 100n, gold: 20n }),
    }),
  }),
});

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
