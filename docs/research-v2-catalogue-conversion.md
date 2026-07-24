# Research v2 catalogue conversion matrix

## Status

Approved conversion map for every currently generated research definition.

The architecture and zero-atom rule are fixed. Values marked **provisional** may be tuned before their material horizons become playable.

## Definition formula

For the first implementation, each topic has:

```js
memoryNanites
baselineDurationMs
requiredCompute = (100n + memoryNanites) * BigInt(baselineDurationMs)
energyCost
```

This makes the active bank's own writable memory sufficient to produce approximately the authored baseline duration before acceleration from previously installed banks.

Installed mnemonic substrate then shortens the actual duration through the Research v2 capacity formula.

`requiredCompute` remains fixed after authoring. It never depends on the player's current active swarm.

## Memory scales

| Symbol | Footprint | Meaning |
|---|---:|---|
| B | `0` | Bootstrap Archive; no active nanite conversion |
| P | `16` | First physical prognostics bank |
| M1 | `1,000,000,000,000,000` | First electronic shell |
| M2 | `2,000,000,000,000,000` | Circuit-board scale |
| M3 | `4,000,000,000,000,000` | Motherboard scale |
| M4 | `8,000,000,000,000,000` | Chassis/environment boundary |
| M5 | `20,000,000,000,000,000` | Next local environment; provisional |
| M6 | `50,000,000,000,000,000` | Later environmental scale; provisional |

## Energy calibration

Research consumes energy only.

Exact energy values are authored balance constants. They should be calibrated as a number of minutes of expected energy production at the horizon where the signal appears.

The existing first-horizon energy-minute measurement may remain as a calibration constant, but its C/Si/Cu/Au components are deleted.

Initial fixed bootstrap targets:

| Topic | Energy |
|---|---:|
| Parallel Directive Scheduling | `40` |
| Relative Directive Allocation | `400` |
| Cohort Ratio Prognostics | approximately `2,000` |

For later topics, the implementation should store explicit `energyCost` values generated from an authored horizon-energy table. Do not derive energy from current swarm population at runtime.

## Coordination and material analysis

| ID | Player name | Memory | Baseline compute | Status |
|---|---|---:|---:|---|
| `parallel-directives` | Parallel Directive Scheduling | B | 4m | fixed |
| `relative-allocation` | Relative Directive Allocation | B | 2m 30s | fixed |
| `cohort-ratio-prognostics` | Cohort Ratio Prognostics | P | 4m | fixed |
| `residuum-indexing` | Residuum Indexing | M1 | 40m | fixed |
| `phase-locked-directive-bus` | Phase-Locked Directive Bus | M3 | 15m | fixed |
| `ferromagnetic-phase-analysis` | Ferromagnetic Phase Analysis | M4 | 10m | fixed |
| `atmospheric-spectroscopy` | Atmospheric Spectroscopy | M4 | 12m | fixed |
| `specialized-morphologies` | Specialized Morphologies I | `2 × M4` | 20m initial | footprint fixed; duration tunable |
| `distributed-reasoning-mesh` | Distributed Reasoning Mesh | `8 × M5` | 60m initial | provisional balance |
| `autonomous-prospecting` | Autonomous Prospecting | `8 × M5` | 90m initial | provisional balance |
| `directive-compilation` | Directive Compilation | `16 × M5` | 120m initial | provisional balance |

## Electronic refinement series

These four branches use the same memory scale by tier.

| Tier | Material search | Memory |
|---:|---:|---:|
| I | 1 | M1 |
| II | 2 | M2 |
| III | 3 | M3 |
| IV | 4 | M4 |
| V | 5 | M5, provisional |
| VI | 6 | M6, provisional |

### Capacitive Buffer Lattice

Baseline compute: 20 minutes per tier before installed-bank acceleration.

| ID | Tier | Memory |
|---|---:|---:|
| `capacitive-buffer-lattice` | I | M1 |
| `capacitive-buffer-lattice-02` | II | M2 |
| `capacitive-buffer-lattice-03` | III | M3 |
| `capacitive-buffer-lattice-04` | IV | M4 |
| `capacitive-buffer-lattice-05` | V | M5, provisional |
| `capacitive-buffer-lattice-06` | VI | M6, provisional |

### Payload Frame Reinforcement

Baseline compute: 25 minutes per tier before installed-bank acceleration.

| ID | Tier | Memory |
|---|---:|---:|
| `payload-frame-reinforcement` | I | M1 |
| `payload-frame-reinforcement-02` | II | M2 |
| `payload-frame-reinforcement-03` | III | M3 |
| `payload-frame-reinforcement-04` | IV | M4 |
| `payload-frame-reinforcement-05` | V | M5, provisional |
| `payload-frame-reinforcement-06` | VI | M6, provisional |

### Packetized Sorting

Baseline compute: 30 minutes per tier before installed-bank acceleration.

| ID | Tier | Memory |
|---|---:|---:|
| `packetized-sorting` | I | M1 |
| `packetized-sorting-02` | II | M2 |
| `packetized-sorting-03` | III | M3 |
| `packetized-sorting-04` | IV | M4 |
| `packetized-sorting-05` | V | M5, provisional |
| `packetized-sorting-06` | VI | M6, provisional |

### Route Memory

Baseline compute: 35 minutes per tier before installed-bank acceleration.

| ID | Tier | Memory |
|---|---:|---:|
| `route-memory` | I | M1 |
| `route-memory-02` | II | M2 |
| `route-memory-03` | III | M3 |
| `route-memory-04` | IV | M4 |
| `route-memory-05` | V | M5, provisional |
| `route-memory-06` | VI | M6, provisional |

## Atmospheric Fractionation series

Baseline compute: 20 minutes per tier before installed-bank acceleration.

The first three tiers have approved horizon-scale mappings. The remaining generated IDs are retained so current save and prerequisite references remain stable, but their footprints and reveal horizons are provisional until those environments are authored.

| ID | Tier | Memory | Status |
|---|---:|---:|---|
| `atmospheric-fractionation` | I | M4 | fixed |
| `atmospheric-fractionation-02` | II | M5 | provisional balance |
| `atmospheric-fractionation-03` | III | M6 | provisional balance |
| `atmospheric-fractionation-04` | IV | M6 | provisional; hidden until authored |
| `atmospheric-fractionation-05` | V | M6 | provisional; hidden until authored |
| `atmospheric-fractionation-06` | VI | M6 | provisional; hidden until authored |

## Radiofrequency Scavenging series

The current catalogue generates six RF refinements. Research v2 treats RF infrastructure as a later environmental system rather than a normal M4 electronic refinement.

Baseline compute: 30 minutes per tier initially.

| ID | Tier | Memory | Status |
|---|---:|---:|---|
| `rf-scavenging` | I | `2 × M5` | approved strategic footprint; reveal gate retained |
| `rf-scavenging-02` | II | `2 × M6` | provisional |
| `rf-scavenging-03` | III | `2 × M6` | provisional |
| `rf-scavenging-04` | IV | `2 × M6` | provisional; hidden until authored |
| `rf-scavenging-05` | V | `2 × M6` | provisional; hidden until authored |
| `rf-scavenging-06` | VI | `2 × M6` | provisional; hidden until authored |

## Local Material Caches series

The current catalogue generates four cache refinements.

Baseline compute: 30 minutes per tier initially.

| ID | Tier | Memory | Status |
|---|---:|---:|---|
| `local-material-caches` | I | `2 × M5` | approved strategic footprint |
| `local-material-caches-02` | II | `2 × M6` | provisional |
| `local-material-caches-03` | III | `2 × M6` | provisional; hidden until authored |
| `local-material-caches-04` | IV | `2 × M6` | provisional; hidden until authored |

## Total current definition coverage

This matrix covers all currently generated IDs in the live catalogue:

- 11 coordination, analysis, morphology and strategic definitions;
- 24 electronic-refinement definitions;
- 6 Atmospheric Fractionation definitions;
- 6 Radiofrequency Scavenging definitions;
- 4 Local Material Caches definitions;
- **51 total current research definitions**.

The implementation should assert the exact catalogue count during conversion so a future source change cannot silently leave an old atom-cost definition behind.

If `main` contains a different count when implementation begins, the developer must diff the live `RESEARCH` keys against this matrix, document the additional or retired IDs, and ensure every live topic has explicit Research v2 fields.

## Conversion invariants

For every converted ID:

- prerequisites and reveal gates remain unless separately approved;
- `cost.atoms` is removed or exactly zero for compatibility;
- `memoryNanites` is fixed;
- `requiredCompute` is fixed;
- `energyCost` is explicit and fixed at project start;
- the cost snapshot is stored on an active queue item;
- waiting queue intent reserves nothing;
- legacy completion remains valid after save migration;
- hidden future tiers cannot become visible merely because their definitions exist.
