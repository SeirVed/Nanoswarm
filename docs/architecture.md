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

## Prospecting and open environments

When all accessible matter in an active shell has been reserved, the simulation records exhaustion once and exposes a 30-second, one-worker local survey cohort. Completion archives the depleted shell and advances through the authored nested object: +0.9 g remaining DRAM package, +9 g circuit-board fragment, +90 g motherboard region and +900 g broken chassis. There is no repeating or randomly scaled solid deposit after the chassis.

Acquiring the chassis begins Stage 2 and identifies atmospheric matter. Atmosphere is an open environmental source rather than a finite deposit, so its harvested atoms enter the tracked system at job completion. Base atmospheric throughput is exactly 1% of the current effective solid-collection payload. Its canonical dry-air constituent-atom ratio contains nitrogen, oxygen, argon and carbon; only carbon is part of the seed catalogue, and all other atoms are retained by hidden identity pending later research.

## Cohorts

A cohort is a group of identical nanites that began the same job at the same time under the same recipe revision. A million workers therefore remain a real million discrete workers without requiring a million independently updated timers.

Inputs are removed from available inventory when a cohort starts. Its payload is stored on the cohort and applied at completion. This prevents two cohorts from spending the same atoms and makes save/load deterministic.

Allocation cohorts enter on 500 ms synchronization boundaries. When one phase returns within two seconds of another phase on the same directive, its workers wait for that nearby completion and the following cycle launches as one resonant cohort. This convergence rule changes scheduling only; the interface may group all phases of one directive into a single operational summary without merging their authoritative payloads early.

## Time and offline progress

`advanceSimulation` moves between the next cohort completion, the next research completion, and the requested target time. It does not replay display frames. Leaving the game open and loading it later must produce identical state.

The loop detects a genuine zero-time stall rather than imposing a fixed event-count ceiling. A long absence may contain hundreds of thousands of legitimate cohort completions and must not make an otherwise valid save unloadable.

## Permanent log

Log significance and visual tone are separate fields. `world` records history-scale state changes, `critical` marks conditions requiring attention, `medium` records discoveries and unlocks, and `info` carries routine operations such as job starts and completions. World, critical, and medium history is permanent; only the oldest info entries are removed once 200 routine events are retained. Filters are a presentation concern and never alter retention. Version 3 saves infer the missing significance field during migration.

## Research

Research jobs consume their material cost when queued. Work is measured in nanite-milliseconds. Prerequisites and environmental signals are validated by the simulation, not merely hidden by the interface. Parallel Directive Scheduling is the sole initial root, requires `24,000,000` nanite-milliseconds, and therefore takes four minutes on the base 100 n-eq computronium. Relative Directive Allocation requires that root, and every remaining topic explicitly requires Relative Directive Allocation before it can be revealed or queued. The interface withholds the catalog-wide completed/total fraction. Completed research modifies capacity functions used when new cohorts reserve their payloads; already-running cohorts preserve the recipe and output with which they began.

Queued topics retain their accumulated work when reordered. Cancelling a topic discards that work and releases its reserved input cost. Reassigning nanites from an indivisible production cohort into research changes the target immediately, but those workers do not contribute research capacity until their existing cohort returns.

The embedded computronium initially supplies the greater of 100 nanite-equivalents or 1% of the total swarm; Distributed Computronium raises the proportional contribution to 2%. Explicitly allocated research nanites add to that capacity.

Most throughput branches are authored as additive five-percent refinement series. Their work and resource costs rise by 50% per tier. Because required work is fixed while computronium capacity grows with the swarm, the displayed ETA is intentionally dynamic: an initially formidable job can collapse to minutes after several replication rounds without falsifying its duration.

Relative allocation targets are stored as fixed-point shares of `10^12`. Replication reapportions the enlarged integer swarm with the largest-remainder method, so targets persist without fractional nanites or cumulative rounding loss. Target shares may sum to less than 100%; that remainder deliberately stays unassigned.

## Presentation units

All authoritative inventories remain integer atoms, picojoules, nanites, or nanite-milliseconds. Display formatting is pure and never feeds values back into the simulation. Whole counts switch to `10^x` notation above 100 million; energy uses six-significant-digit SI scaling. Physical matter estimates derive from the exact per-element inventory and atomic weights, then scale from yoctograms upward. Unknown matter uses a documented silicon/nitrogen-scale average solely for its approximate display mass.

Per-second values in the operations panel are observational averages computed from each in-flight cohort's already-reserved payload and exact job duration. Outputs still appear only at the discrete completion event.

Fixed operation slots are a presentation rule. A slot appears only after its directive is discovered, then retains its authored position whether active or idle. The simulation exposes replication shortages from exact available energy and identified-atom inventories; the interface displays that diagnostic without mutating scheduling or resources.

Progressive interface targets have stable unlock identifiers. Version 7 saves retain the identifiers the player has acknowledged; any currently visible target absent from that set receives the new-unlock pulse until a click bubbles through it. Migration seeds acknowledgements from the old save's existing discoveries so established interfaces do not relight. Tooltip delegation covers controls, timers, individually keyed resource cards, intro lore, status regions, and individual log events after a 1.5-second hover. Semantic tooltip keys rebind an active inspection to replacement DOM after a structural render, while focus snapshots restore the matching control and any uncommitted percentage text.

Feedback selection is presentation-only. A capture-phase click intercepts the chosen interface target before its normal action, derives a stable semantic key and descriptive context, and opens a form whose draft survives structural renders. The static client never holds a GitHub credential: it constructs a public new-issue URL containing the player's report and optional coarse diagnostics, then GitHub performs authentication and requires the player to confirm submission.

## Procedural sound

The synthetic-mind sound engine is a read-only observer of authoritative game state. Active job ratios choose a harmonic field, cohort boundaries provide gestures, and digits of π and e deterministically gate rhythm, voicing, spacing, and slow filter motion. New voices emerge with swarm magnitude and discoveries rather than with raw loudness.

Audio is deliberately absent from saves and simulation commands. Muting, browser suspension, or unavailable audio hardware can therefore never change progression. The player's `BEGIN` gesture creates the Web Audio context in compliance with browser autoplay policy; returning players may awaken it from the header control.

## Scale path

Resource and worker counts use `bigint`. Wall-clock timestamps are integer milliseconds. Future efficiency values should use fixed-point basis points rather than floating-point state. Cohorts may later include recipe revisions, targets, and failure modes without changing the event model.
