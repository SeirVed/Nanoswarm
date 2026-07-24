# Research v2: Computronium Core and Mnemonic Substrate

## Status

Approved design direction. This document replaces the current atom-cost research economy conceptually; implementation remains pending.

Implementation must follow:

- [`research-v2-catalogue-conversion.md`](research-v2-catalogue-conversion.md) for the complete current research-ID conversion matrix;
- [`research-v2-implementation-handoff.md`](research-v2-implementation-handoff.md) for code architecture, event ordering, migration and UI requirements;
- [`research-v2-regression-plan.md`](research-v2-regression-plan.md) for release-blocking tests;
- [`repository-audit-and-cleanup.md`](repository-audit-and-cleanup.md) for stale material and rejected PR #3 implementation patterns;
- [`stage-2-industrial-transition.md`](stage-2-industrial-transition.md) for the broader gold-famine and conventional-industry phase change.

## Core decision

Research no longer consumes loose carbon, silicon, copper, gold, or other elemental inventory.

Research consumes:

- compute work,
- energy,
- and, after the bootstrap period, active nanites permanently converted into mnemonic substrate.

The nanites are not destroyed. They cease to be mobile assemblers and become stationary, error-corrected memory structures attached to the computronium core. Matter remains conserved.

```text
Active nanites
      +
Electrical energy
      +
Computronium processing
      ↓
Constructing mnemonic bank
      ↓
Installed mnemonic substrate
      +
Completed research
```

This gives research a distinct physical economy:

- replication converts loose matter into active nanites;
- research converts active nanites into knowledge infrastructure;
- energy drives both computation and reconfiguration.

## Computronium model

The seed contains:

- an extraordinarily powerful computronium processing core,
- immutable mission directives,
- working registers and cache,
- a tiny rewritable Bootstrap Archive,
- and no substantial expandable memory.

The core can calculate rapidly but cannot retain large new models of an unfamiliar environment. The first compact coordination routines fit inside the Bootstrap Archive. Everything larger requires mnemonic banks built from nanites.

The early fiction is therefore:

> The seed can think. It cannot remember very much.

## Research classes

### Bootstrap research

Bootstrap research costs time and energy, but zero nanites.

Only research revealed while the swarm is still below roughly twenty active nanites belongs to this class. Losing even one assembler at that scale is punitive rather than strategic.

The current bootstrap topics are:

| Research | Mnemonic cost | Baseline time |
|---|---:|---:|
| Parallel Directive Scheduling | 0 | 4 minutes |
| Relative Directive Allocation | 0 | 2 minutes 30 seconds |

Suggested early energy costs:

| Research | Energy |
|---|---:|
| Parallel Directive Scheduling | 40 |
| Relative Directive Allocation | 400 |

The current dynamic research-capacity rule of `max(100, 1% of active swarm)` is removed. The fixed bootstrap contribution becomes a physical property of the core and Bootstrap Archive.

### Mnemonic research

Every other research topic requires a permanent mnemonic bank.

Each definition should contain:

```js
{
  memoryNanites: bigint,
  requiredCompute: bigint,
  energyCost: bigint
}
```

`memoryNanites` is a fixed physical requirement. It is never calculated as a percentage of the current swarm. The interface may display the current percentage commitment and post-start active population, but waiting and growing must never make identical knowledge more expensive.

## First mnemonic bank

Cohort Ratio Prognostics becomes the first topic that exceeds the Bootstrap Archive.

Initial target:

| Property | Value |
|---|---:|
| Unlock | 180 active nanites |
| Memory footprint | 16 nanites |
| Baseline compute | approximately 4 minutes |
| Energy | approximately 2,000 |

Suggested event sequence:

```text
BOOTSTRAP ARCHIVE CAPACITY EXCEEDED.
EXTERNAL MNEMONIC SUBSTRATE REQUIRED.

16 ACTIVE ASSEMBLERS SELECTED FOR
PERMANENT COGNITIVE RECONFIGURATION.
```

On completion:

```text
MNEMONIC BANK 001 INSTALLED.
COHORT RATIO PROGNOSTICS ENCODED.
ACTIVE ASSEMBLERS: -16
INSTALLED MEMORY: +16 n-eq
```

## Research lifecycle

### Queueing

Adding a topic to the queue consumes nothing. A queue entry represents intent only.

### Starting

Only the first queued topic may begin. Starting requires:

- enough stored energy,
- enough idle active nanites,
- all observations and prerequisites,
- explicit player authorisation.

Nanites already inside indivisible production cohorts are not seized. The project waits until enough assemblers return and become idle.

At start:

```js
state.nanites -= definition.memoryNanites;
state.mnemonicBanks.push({
  researchId: definition.id,
  nanites: definition.memoryNanites,
  status: "constructing",
  progressCompute: 0n,
});
state.energy -= definition.energyCost;
```

Directive allocations are reconciled against the reduced active population.

### Progress

The committed nanites remain unavailable throughout construction. They are physically reconfigured while the computronium writes, verifies, and cross-checks the model.

### Completion

At completion, the bank becomes installed and the research effect activates. Its nanites remain permanently associated with that knowledge.

```js
bank.status = "installed";
state.mnemonicNanites += bank.nanites;
state.completedResearch.push(bank.researchId);
```

### Pause and cancellation

- An unstarted queued topic may be removed freely.
- An active project may be paused and resumed.
- Nanites committed to an active bank are not automatically returned.
- The first implementation should not offer an ordinary active-project refund.
- Later systems may permit dismantling incomplete or installed banks, with losses and loss of knowledge.

### Automatic continuation

The next queued project does not start automatically by default. This prevents an overnight queue from silently converting a large fraction of the swarm into memory.

A later control may allow automatic continuation with a player-defined maximum population commitment.

## Research processing rate

Research speed is limited by memory architecture rather than an arbitrary share of active assemblers.

Initial model:

```text
effective research capacity
=
100 bootstrap units
+ current constructing-bank nanites
+ installed mnemonic nanites / 16
```

Interpretation:

- `100` is the fixed Bootstrap Archive contribution;
- the constructing bank provides its own writable working set;
- installed banks contribute a fraction of their size as reusable cache, bus width, cross-reference capacity, and spare storage.

This preserves the intended long-horizon behaviour:

- early projects can appear formidable;
- completed banks gradually accelerate later work;
- replication makes larger sacrifices affordable;
- research speed no longer scales directly from active swarm population.

The exact divisor is a balance parameter.

## Memory-bank scale

Bank sizes must be calibrated against the gold-limited population reachable at each material horizon, not merely multiplied by ten with shell mass. The chassis contains no gold and therefore does not expand the alien-nanite population simply because it is physically larger.

Initial scale units:

| Unit | Horizon | Fixed memory footprint |
|---|---|---:|
| M1 | first electronic shell | `1 × 10^15` nanites |
| M2 | circuit-board scale | `2 × 10^15` nanites |
| M3 | motherboard scale | `4 × 10^15` nanites |
| M4 | chassis/environment scale | `8 × 10^15` nanites |
| M5 | next local environment | `2 × 10^16` nanites, provisional |
| M6 | later environmental scale | `5 × 10^16` nanites, provisional |

These are design targets, not final balance constants.

## Conversion of the current catalogue

### Bootstrap coordination

| Research | Memory | Baseline compute |
|---|---:|---:|
| Parallel Directive Scheduling | 0 | 4m |
| Relative Directive Allocation | 0 | 2m 30s |
| Cohort Ratio Prognostics | 16 | 4m |

### Incremental refinement series

The following series use the bank associated with the material horizon where each tier is revealed:

- Capacitive Buffer Lattice I-VI
- Payload Frame Reinforcement I-VI
- Packetized Sorting I-VI
- Route Memory I-VI

| Tier | Memory bank |
|---|---:|
| I | M1 |
| II | M2 |
| III | M3 |
| IV | M4 |
| V | M5, provisional |
| VI | M6, provisional |

Suggested baseline compute per tier:

| Series | Baseline |
|---|---:|
| Capacitive Buffer Lattice | 20m |
| Payload Frame Reinforcement | 25m |
| Packetized Sorting | 30m |
| Route Memory | 35m |

Installed mnemonic substrate shortens these times naturally.

### Material interpretation

| Research | Memory | Baseline compute |
|---|---:|---:|
| Residuum Indexing | M1 | 40m |
| Phase-Locked Directive Bus | M3 | 15m |
| Ferromagnetic Phase Analysis | M4 | 10m |
| Atmospheric Spectroscopy | M4 | 12m |

Ferromagnetic Phase Analysis and Atmospheric Spectroscopy must remain possible with zero loose gold. Their gold is physically contained inside the nanites converted into their memory banks.

### Atmospheric development

| Research | Memory | Baseline compute |
|---|---:|---:|
| Atmospheric Fractionation I | M4 | 20m |
| Atmospheric Fractionation II | M5 | 20m |
| Atmospheric Fractionation III | M6 | 20m |
| Later tiers | recalibrate with authored horizons | pending |

The catalogue may retain later hidden tiers, but they remain provisional until their environments and production chains are authored.

### Structural and strategic research

| Research | Suggested memory |
|---|---:|
| Specialized Morphologies I | `2 × M4` |
| Radiofrequency Scavenging | `2 × M5` |
| Local Material Caches | `2 × M5` |
| Distributed Reasoning Mesh | `8 × M5` |
| Autonomous Prospecting | `8 × M5` |
| Directive Compilation | `16 × M5` |

These later values are provisional.

### Distributed Reasoning Mesh

The existing abstract effect of raising research capacity from 1% to 2% of the swarm is removed.

New effect:

- installed mnemonic banks contribute `1/8` of their nanites to reusable research bandwidth instead of `1/16`;
- a second research bank may be active concurrently.

This becomes a genuine architectural transition from one central memory bus to a distributed cognitive system.

## Energy costs

Energy becomes the only expendable resource consumed by research.

Energy should be authored as minutes of expected production at the horizon where a topic appears:

| Research class | Suggested burden |
|---|---:|
| Bootstrap control | several discrete early energy jobs |
| Coordination | 30-120 seconds of horizon production |
| Refinement tier | 1-5 minutes |
| Elemental identification | 5-10 minutes |
| Major architecture | 15-60 minutes |
| Strategic systems | hours or longer at first reveal |

The existing first-horizon measured pipeline constant may retain its energy component. Its carbon, silicon, copper, and gold components are deleted.

## Research directive removal

Research is no longer a workforce allocation alongside Collect, Sort, Energy, Replicate, and Atmospheric Harvesting.

The computronium performs the computation. The project's committed nanites provide memory. Keeping a separate research allocation would count the population cost twice.

Research is controlled through:

- queue order,
- start and pause controls,
- mnemonic commitment,
- energy preparation,
- later parallel-bank architecture.

## Interface requirements

### Computronium Core

Display:

- bootstrap bandwidth,
- reusable mnemonic width,
- maximum active research banks,
- current processor or memory bottleneck.

### Mnemonic Substrate

Display:

- installed memory in nanite-equivalents,
- memory under construction,
- number of installed banks,
- total knowledge mass.

### Research cards

Before start, display:

- mnemonic footprint,
- energy requirement,
- compute estimate,
- current population commitment,
- active population after commitment.

Example:

```text
ATMOSPHERIC SPECTROSCOPY

Mnemonic footprint        8.00 × 10^15 nanites
Energy requirement        6.24 TJ
Compute estimate          10m 42s

Active swarm after start  3.18 × 10^18
Population commitment     0.251%
```

Completed topics move into a physical bank ledger.

## Save migration

The save format should advance from version 11 to version 12.

Migration rules:

1. Refund all elemental and energy costs reserved by queued legacy research.
2. Preserve queue order as unstarted intent.
3. Preserve completed research.
4. Record pre-v12 completed topics as `legacyCoreEncoding`.
5. Legacy encodings consume zero modeled nanites and contribute zero mnemonic bandwidth.
6. All research completed after migration creates physical banks under the new rules.

This avoids retroactively deleting large parts of an existing player's active swarm while allowing the physical model to remain strict going forward.

## Required simulation invariants

- No research consumes loose atoms.
- Bootstrap research consumes zero nanites.
- Mnemonic research cannot start without enough idle active nanites.
- Committed memory nanites never return automatically to the active swarm.
- Research cannot consume the final active nanite.
- Queueing alone never consumes energy or population.
- Offline progress cannot start the next queued project unless automatic continuation was explicitly enabled.
- Total replicated matter remains conserved between the active swarm, mnemonic substrate, and future loss states.

A specific regression test must reproduce the playtester case:

```text
Given:
- chassis reached;
- loose gold = 0;
- active swarm remains.

Then:
- Ferromagnetic Phase Analysis can begin;
- Atmospheric Spectroscopy can begin;
- no elemental research cost is requested;
- progression is not softlocked.
```

## Stage 2 consequence

The absence of gold remains important.

It halts further alien nanite replication, but it no longer halts development.

The computronium can use its remaining super-technology to understand iron, oxygen, nitrogen, polymers, and bulk chemistry. It then begins constructing larger, slower, less precise machinery from abundant local matter.

```text
Stage 1:
Alien assemblers reproduce alien assemblers.

Stage 2:
A finite alien swarm bootstraps conventional industry.
```

The swarm stops solving every problem by making more nanites and begins building:

- chemical reactors;
- magnetic separators;
- electrolysis systems;
- structural frames;
- pressure vessels;
- conductive networks;
- mechanical collection systems;
- crude bulk processors.

The computronium remains impossibly advanced.

Its new machines do not have to be.
