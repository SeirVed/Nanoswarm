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

## Exact matter

Feedstock and Residuum are inventories of constituent atoms. The simulation knows the underlying composition, while the interface may hide unidentified constituents. This conserves matter without floating-point percentages or a mutable generic-mass currency.

The starter deposit is a 0.1 g impact-fused contact site containing exactly `702,327,557,648,247,539` whole multiples of the C/Si/Cu/Au nanite recipe. Full exhaustion therefore strands none of the four seed-catalogued elements. The contact is an intentional arrival anomaly; it is not presented as the natural composition of ordinary solder.

Every later shell uses a fixed integer mass-composition recipe containing all physically authored elements. `MATTER_KEYS` is the full internal element ledger, while `ATOM_KEYS` is the smaller catalogue currently understood by the seed. Sorting transfers catalogued atoms into available storage and retains every other element under its real hidden key in Residuum. The UI may sum that ledger, but it must not erase or prematurely identify it. Legacy `unknown` atoms remain a separate honest key because an older save contains insufficient information to reconstruct their identity.

The planned Residuum extension preserves provenance as well as identity. Every finite local substrate creates its own retained lot; atmosphere, regolith and other open extraction modes create independent bulk lots. The early interface may aggregate these lots, but the simulation must not merge their underlying compositions. A newly catalogued element becomes extractable only after a re-sorting job processes an eligible lot. Spectral Binning may group lots by observed composition without homogenizing them or revealing still-unknown elements.

## Prospecting and open environments

When all accessible matter in an active shell has been reserved, the simulation records exhaustion once and exposes a scale-aware local survey cohort. Searches one through four commit 0.5%, 1%, 2%, and 4% of the current active swarm, rounded upward to a whole nanite, for 30, 45, 60, and 90 seconds. The original close survey remains a ten-second, one-worker job because the solitary seed has no larger cohort to send. Completion archives the depleted shell and advances through the authored nested object: +0.9 g remaining DRAM package, +9 g circuit-board fragment, +90 g motherboard region and +900 g broken chassis. There is no repeating or randomly scaled solid deposit after the chassis.

These nested-object searches are substrate-expansion actions, so their controls, committed workforce and live timer remain in the substrate panel rather than occupying a recurring operational slot. Later free-ranging biomass searches or hunting parties may become full directives when the swarm reaches a genuinely local-area scale.

Acquiring the chassis begins Stage 2 and identifies atmospheric matter. Atmosphere is an open environmental source rather than a finite deposit, so its harvested atoms enter the tracked system at job completion. Base atmospheric throughput is exactly 1% of the current effective solid-collection payload. Its canonical dry-air constituent-atom ratio contains nitrogen, oxygen, argon and carbon; only carbon is part of the seed catalogue, and all other atoms are retained by hidden identity pending later research.

## Cohorts

A cohort is a group of identical nanites that began the same job at the same time under the same recipe revision. A million workers therefore remain a real million discrete workers without requiring a million independently updated timers.

Inputs are removed from available inventory when a cohort starts. Its payload is stored on the cohort and applied at completion. This prevents two cohorts from spending the same atoms and makes save/load deterministic.

Allocation cohorts enter on 500 ms synchronization boundaries. When one phase returns within two seconds of another phase on the same directive, its workers wait for that nearby completion and the following cycle launches as one resonant cohort. This convergence rule changes scheduling only; the interface may group all phases of one directive into a single operational summary without merging their authoritative payloads early.

## Time and offline progress

`advanceSimulation` moves between the next cohort completion, the next research completion, and the requested target time. It does not replay display frames. Leaving the game open and loading it later must produce identical state.

The loop detects a genuine zero-time stall rather than imposing a fixed event-count ceiling. A long absence may contain hundreds of thousands of legitimate cohort completions and must not make an otherwise valid save unloadable.

## Permanent log

Log significance and visual tone are separate fields. `world` records history-scale state changes, `critical` marks conditions requiring attention, `medium` records discoveries and unlocks, and `info` carries routine operations such as job starts and completions. World, critical, and medium history is permanent; only the oldest info entries are removed once 200 routine events are retained. Filters are a presentation concern and never alter retention.

## Research

Research v2 separates queue intent, physical formation and installed memory. Queueing is free and validates discovery gates and prerequisites. When the first waiting topic can start, the simulation permanently removes its mnemonic footprint from idle active nanites, spends its facilitation energy and begins fixed formation work measured in nanite-milliseconds. Only one bank forms at a time. Active formation is irreversible but pausable; waiting intent may be reordered or removed.

Parallel Directive Scheduling and Relative Directive Allocation are transit-compressed firmware restoration. They use the same work clock but commit no memory or energy. The whole-number allocation interface appears at two nanites. Before Parallel Directive Scheduling completes, assignment controls edit intent without launching work; explicit dispatch launches one cohort cycle and returned workers wait for redispatch. Completion enables automatic concurrent relaunch of every assigned directive. Relative Directive Allocation later adds persistent fixed-point shares, automatic placement of newly replicated nanites, and allocation locks. Every other live topic has an authored mnemonic footprint and energy demand. A topic can begin only when that footprint is no larger than the largest single-digit quantity one exponent below the active swarm. Only idle nanites can be committed; workers inside indivisible cohorts are never seized.

Capacity is stored and accumulated in hundredths of a nanite-equivalent:

```text
100 n-eq fixed seed core
+ genuinely available nanites assigned to Research
+ 1% of installed mnemonic-bank nanites
```

The active swarm has no passive proportional contribution. Fixed-point capacity makes a 1-nanite bank worth exactly `0.01` n-eq without floating-point drift. Reassigning workers from an indivisible production cohort changes the research target immediately, but they contribute only after the cohort returns.

The runtime catalogue contains only authored opening capabilities. Generated throughput tiers and later topics with unauthored dependencies are excluded rather than exposed as disconnected or fabricated progression. Each definition carries the observation that revealed it.

Ferromagnetic Phase Analysis adds iron to the sortable catalogue. Existing iron remains in its Residuum lot until a sorting cohort processes that lot again. Atmospheric harvest is stored separately as Captured Atmosphere and never becomes solid Residuum. Atmospheric Spectroscopy reveals N/O/Ar/C composition without separation; Atmospheric Fractionation configures future gas-harvest cohorts to deliver separated elements. A cohort preserves the fractionation capability it had when its payload was reserved.

Later morphology research equips the canonical nanite with interchangeable tools, coatings, reservoirs or assembled temporary structures. It must not silently replace the base recipe. Compound recognition and compound decomposition remain separate research layers on the path to universal molecular disassembly and assembly. Elemental transmutation is outside the chemical assembler model and belongs to a much later flux-based nuclear system.

Relative allocation targets are stored as fixed-point shares of `10^12`. Replication reapportions the enlarged integer swarm with the largest-remainder method, so targets persist without fractional nanites or cumulative rounding loss. Target shares may sum to less than 100%; that remainder deliberately stays unassigned.

Replication efficiency remains hidden until Cohort Ratio Prognostics is completed after its 180-nanite observation threshold. It is an exact fixed-point basis-point score derived from the current job durations, job yields, universal recipe, and assigned Collect, Sort, Energy, and Replicate workers. It measures directive coherence; it deliberately does not pretend a heterogeneous substrate contains the recipe ratio. The reported bottleneck is the path with the lowest sustainable recipe rate.

The accompanying substrate-conversion projection counts recipe-complete catalogued material that remains accessible in the active deposit, Feedstock, sorted inventory, or collection/sorting cohorts. It compares the live pipeline with an exact coherent redistribution of the same production workforce and models continued proportional allocation as geometric growth. It is an operational forecast rather than an authoritative future event: unavailable elements, player intervention, research work, and changing job bonuses can invalidate it.

The local substrate panel separately projects physical exhaustion of the active deposit from its accessible atom count, current collection throughput and current replication growth curve. Matter already reserved by collectors is already absent from the displayed deposit. This ETA appears with Cohort Ratio Prognostics and is likewise a live forecast rather than a scheduled completion.

Once Cohort Ratio Prognostics is complete, a partial replication payload waits for a five-second batching window when other production inputs are already in flight. Inputs that arrive inside the window form a larger replication cohort, limiting phase proliferation; an isolated complete payload with no upstream work is not delayed.

Temporary Burst requires completed Cohort Ratio Prognostics and at least 30 continuous seconds at 99% efficiency. If fewer than 1% of the swarm can be built from the current complete-recipe buffer, starting a burst enters a cancellable charging state: normal replication is held while the existing upstream ratios continue collecting, sorting and acquiring energy. The burst arms automatically on reaching that minimum. Arming removes every whole buffered recipe from available inventory into an authoritative reservation, snapshots all relative targets and locks, and temporarily targets replication. Each burst cohort consumes only that reservation. Once the reservation has been dispatched, the exact snapshot is restored; cancellation during charging releases normal replication, while cancellation after arming refunds only undispatched recipes. Already-launched cohorts remain indivisible.

## Presentation units

All authoritative inventories remain integer atoms, picojoules, nanites, or nanite-milliseconds. Display formatting is pure and never feeds values back into the simulation. Whole counts switch to `10^x` notation above 100 million; energy uses six-significant-digit SI scaling. Physical matter estimates derive from the exact per-element inventory and atomic weights, then scale from yoctograms upward. Unknown matter uses a documented silicon/nitrogen-scale average solely for its approximate display mass.

Per-second values in the operations panel are observational averages computed from each in-flight cohort's already-reserved payload and exact job duration. Outputs still appear only at the discrete completion event.

Fixed operation slots are a presentation rule. A slot appears only after its directive is discovered, then retains its authored position whether active or idle. The simulation exposes replication shortages from exact available energy and identified-atom inventories. It also reports the exact idle assigned population unable to begin. A shortage is labelled waiting only when scheduled sort, collection, and energy payloads contain enough of every missing input; otherwise it is a genuine halt. The interface displays those diagnostics without mutating scheduling or resources.

Progressive interface targets have stable unlock identifiers. Version 7 saves retain the identifiers the player has acknowledged; any currently visible target absent from that set receives the new-unlock pulse until a click bubbles through it. Migration seeds acknowledgements from the old save's existing discoveries so established interfaces do not relight. Tooltip delegation covers controls, timers, individually keyed resource cards, intro lore, status regions, and individual log events after a 1.5-second hover. Semantic tooltip keys rebind an active inspection to replacement DOM after a structural render, while focus snapshots restore the matching control and any uncommitted percentage text.

Feedback selection is presentation-only. A capture-phase click intercepts the chosen interface target before its normal action, derives a stable semantic key and descriptive context, and opens a form whose draft survives structural renders. The static client never holds a GitHub credential: it constructs a public new-issue URL containing the player's report and optional coarse diagnostics, then GitHub performs authentication and requires the player to confirm submission.

## Procedural sound

The synthetic-mind sound engine is a read-only observer of authoritative game state. Active job ratios choose a harmonic field, cohort boundaries provide gestures, and digits of π and e deterministically gate rhythm, voicing, spacing, and slow filter motion. New voices emerge with swarm magnitude and discoveries rather than with raw loudness.

Audio is deliberately absent from saves and simulation commands. Muting, browser suspension, or unavailable audio hardware can therefore never change progression. The player's `BEGIN` gesture creates the Web Audio context in compliance with browser autoplay policy; returning players may awaken it from the header control.

## Scale path

Resource and worker counts use `bigint`. Wall-clock timestamps are integer milliseconds. Replication efficiency uses fixed-point basis points and never enters authoritative state as floating point. Cohorts may later include recipe revisions, targets, and failure modes without changing the event model.

Future loss states should distinguish active, damaged, immobilized, captured, dispersed and destroyed nanites. Destruction does not automatically delete their constituent matter: recoverable bodies become scrap or Residuum, while genuinely dispersed or inaccessible material remains tracked by its physical destination. Human detection is a strategy-sensitive system driven by observable emissions and consequences rather than a fixed nanite-count timer.
