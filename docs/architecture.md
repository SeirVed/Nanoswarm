# NanoSwarm architecture

## Design boundary

The simulation is authoritative. The browser renders state and sends commands; it does not award resources, finish timers, or alter inventories directly.

```text
UI intent
   │
   ▼
validated command ── reserves exact inputs ── creates cohort
                                                │
                                                ▼
advanceSimulation(targetTime) ── jumps to completion event
                                                │
                                                ▼
                                  exact outputs + permanent log
```

The current entry modules wrap the original v11 implementation as `*-legacy.js` modules. Unchanged collection, sorting, replication, prospecting, burst, and allocation behaviour continues through that engine. Version 12 intercepts research state so the discarded resource-purchase model cannot run.

## Exact matter

Feedstock and Residuum are inventories of constituent atoms. The simulation knows the underlying composition, while the interface may hide unidentified constituents. This conserves matter without floating-point percentages or a mutable generic-mass currency.

The starter deposit is a 0.1 g impact-fused contact site containing exactly `702,327,557,648,247,539` whole multiples of the C/Si/Cu/Au nanite recipe. Full exhaustion therefore strands none of the four seed-catalogued elements.

Every later shell uses a fixed integer mass-composition recipe containing all physically authored elements. Sorting transfers catalogued atoms into available storage and retains every other element under its real hidden key in Residuum.

Mnemonic substrate is nanite matter in another state. Research conversion changes the active-nanite count and records the corresponding constructing or installed memory bank; it never deletes the constituent matter conceptually.

## Prospecting and open environments

When all accessible matter in an active shell has been reserved, the simulation records exhaustion once and exposes a scale-aware local survey cohort. Completion advances through the authored nested object: damaged DRAM package, circuit-board fragment, motherboard region, then broken chassis.

Acquiring the chassis begins Stage 2 and identifies atmospheric matter. Atmosphere is an open environmental source rather than a finite deposit.

## Cohorts

A cohort is a group of identical nanites that began the same job at the same time under the same recipe revision. A million workers therefore remain a real million discrete workers without requiring a million independently updated timers.

Inputs are removed from available inventory when a cohort starts. Its payload is stored on the cohort and applied at completion. This prevents two cohorts from spending the same atoms and makes save/load deterministic.

Allocation cohorts enter on synchronization boundaries and may converge into resonant phases without merging authoritative payloads early.

## Time and offline progress

`advanceSimulation` moves between meaningful events and the requested target time. It does not replay display frames. Leaving the game open and loading it later must produce identical state.

Mnemonic research uses the same rule. Progress is integrated from its last authoritative update, and completion is recorded at the exact computed completion time. Waiting research does not accumulate work and never starts automatically during offline catch-up.

## Permanent log

Log significance and visual tone are separate fields. World, critical, and medium history is permanent; only the oldest routine info entries roll off.

Research emits separate records for queue intent, bootstrap encoding, mnemonic construction, bank installation, and cognitive-model completion.

## Research

Research is a physical transformation rather than a resource shop.

The seed contains an extreme computronium processor and a small rewritable Bootstrap Archive. Parallel Directive Scheduling and Relative Directive Allocation fit within that archive and therefore consume energy and compute work but no active nanites.

All later topics define:

```text
memoryNanites
energyCost
requiredCompute
```

Starting a mnemonic topic:

1. validates observations, prerequisites, stage, and search horizon;
2. requires its fixed active-nanite footprint to be idle;
3. consumes its energy cost;
4. removes those nanites from the active swarm;
5. creates a constructing mnemonic bank.

Completion installs the bank permanently and enables the research effect. No loose carbon, silicon, copper, gold, or later chemical inventory is charged.

Initial effective research capacity is:

```text
100 bootstrap units
+ active constructing-bank nanites
+ installed mnemonic nanites / 16
```

Distributed Reasoning Mesh improves the installed-bank contribution to one-eighth. The former `max(100, 1% of swarm)` rule and temporary Research allocation directive are removed.

Queueing reserves nothing. The first affordable topic begins only because the player explicitly queued it. Additional topics wait after the active bank. When the bank completes, the next topic remains waiting until the player explicitly starts it. Active mnemonic construction is irreversible in the initial implementation.

Fixed memory footprints are calibrated against the gold-limited swarm expected at each material horizon, not against current population percentages. Growing first makes a research commitment relatively cheaper without changing its physical requirement.

## Allocation

Relative allocation targets are stored as fixed-point shares. Replication and mnemonic conversion both reconcile whole active-nanite counts without creating fractional workers. Mnemonic construction may use only idle nanites, so workers inside indivisible cohorts are never stolen.

Research is not a workforce directive. The active swarm is allocated only to physical jobs such as collection, sorting, energy acquisition, atmospheric harvesting, and replication.

## Save migration

Version 12 adds mnemonic banks, installed-memory totals, research update time, and queue status.

When a version 11 save is loaded:

- all legacy queued research energy and atoms are refunded;
- queued topics are retained as unstarted intent with zero progress;
- completed research remains enabled as zero-footprint legacy core encoding;
- no active nanites are retroactively removed;
- all future completed research uses physical mnemonic banks.

## Presentation units

All authoritative inventories remain integer atoms, picojoules, nanites, mnemonic nanites, or nanite-milliseconds. Display formatting is pure and never feeds values back into the simulation.

Per-second operation values remain observational averages. Outputs still appear only at discrete completion events.

## Procedural sound

The synthetic-mind sound engine is a read-only observer of authoritative game state. Audio is absent from saves and simulation commands and can never change progression.

## Scale path

Stage 1 allows the alien assemblers to reproduce more alien assemblers. At the chassis, gold exhaustion may end that mode of growth without ending progression. The finite alien swarm can still become memory and use the computronium to bootstrap larger, slower chemical and mechanical systems from iron, atmosphere, polymers, and bulk energy.
