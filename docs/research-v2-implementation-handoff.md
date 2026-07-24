# Research v2 implementation design brief

## Status

Planning handoff, not an implementation order.

Research v2 still contains unresolved product and balance decisions. This document identifies architectural boundaries, affected systems and a safe development sequence. It deliberately avoids freezing state shapes, formulas or catalogue numbers before they have been modelled and playtested.

Start from clean `main`. The superseded prototype branch may be inspected for failure cases, but its runtime structure is not a base for production work.

## Outcome

Explore and, if validated, implement a research economy in which:

- the computronium performs reasoning;
- energy supports computation and construction;
- post-bootstrap knowledge may occupy physical mnemonic substrate made from existing nanites;
- research no longer depends on arbitrary loose-element prices;
- the gold-famine transition remains playable without creating rescue matter.

## Before runtime work

The first implementation task is not converting the catalogue. It is closing or explicitly prototyping the decisions listed in [`research-mnemonic-substrate.md`](research-mnemonic-substrate.md):

- bootstrap topic set;
- permanence or recoverability of converted nanites;
- capacity model;
- contribution of incomplete banks;
- automatic continuation;
- survival reserve;
- migration treatment of completed and queued legacy research;
- initial representative balance fixtures.

Record each decision with:

- chosen behaviour;
- alternatives considered;
- reason;
- evidence or prototype result;
- confidence;
- which parts remain tunable.

No catalogue-wide numeric conversion should begin until the capacity model and balance method exist.

## Architectural boundaries

These are established project rules rather than Research v2 preferences:

- `src/game/` remains the authoritative deterministic simulation.
- The UI issues commands and renders returned state.
- Authoritative quantities remain whole integers.
- Online and offline progress call the same event-jumping simulation.
- Research completion and cohort completion must share one temporal ordering.
- Existing in-flight work keeps the inputs, duration and rule revision with which it started.
- Save changes use explicit versioned migration.
- Existing regression coverage remains active.
- Audio, tooltips and planners observe or author data; they do not mutate the live simulation.

Avoid:

- a second research clock advanced after the main simulation;
- authoritative state exposed through browser globals;
- DOM post-processing that rewrites the native research UI;
- duplicate `*-legacy.js` runtimes;
- compatibility code that becomes a permanent second architecture;
- catalogue values generated from a neat tier formula without economic evidence.

## Candidate domain model

The simulation will probably need to represent:

- research definitions;
- discovered, waiting, active, paused and completed research;
- physical mnemonic commitments, if retained;
- cost snapshots for work that has started;
- migration provenance for old completed topics;
- research capacity and available construction slots.

Those concepts do not dictate one array or object layout. Extend the current state and command patterns with the smallest representation that preserves invariants and remains easy to migrate.

Prefer derived totals over duplicated caches. Add cached aggregates only if profiling justifies them and tests can enforce consistency.

## Lifecycle behaviour to implement after design closure

### Reveal

Reveal remains observation-led and simulation-validated. Prerequisites, stage, search and discovery gates should be audited rather than copied blindly.

### Queue

The current leading design treats queueing as intent:

- no energy spent;
- no nanites converted;
- no physical bank created;
- waiting work freely reorderable or removable.

If testing selects different semantics, update the planning record before code.

### Start

Starting is the likely commitment boundary. Validate:

- topic remains eligible;
- required energy is present;
- any required nanites are idle;
- population remains operational after commitment;
- the relevant research slot is free.

Commit inputs atomically. Do not take nanites from in-flight indivisible cohorts.

### Progress and completion

Progress advances through the main event simulation. If research completes before the requested target time, settle it at that timestamp, apply its effects and continue under the new state.

At a shared timestamp:

1. settle work that was already running;
2. apply completed knowledge and discoveries;
3. reconcile population and allocation;
4. launch later work under the resulting rules.

The exact internal sequence should be verified against current cohort semantics rather than copied mechanically from this document.

### Pause and abandonment

Implement only after the product rule is decided. Whatever the rule:

- no duplicated progress;
- no repeated start charge;
- no disappearing committed bodies;
- no ambiguous slot occupancy;
- state survives save/load exactly.

### Continuation

Do not silently chain into an irreversible project unless the player deliberately enabled that behaviour and the command is revalidated at the start timestamp.

## Population conservation

If mnemonic banks are physical, all replicated nanite bodies must remain accounted for across active, committed, installed, damaged and future states.

Tests should calculate this identity from authoritative state. Do not rely on a displayed aggregate.

## Capacity experimentation

Implement candidate capacity models behind a small pure function or content parameter so they can be compared without rewriting the lifecycle.

At minimum evaluate:

- mostly fixed core throughput;
- diminishing additive benefit from installed memory;
- specialisation by research family;
- parallelism unlocked separately from speed;
- infrastructure gates on memory utilisation.

For each model, run the same captured unlock-state fixtures and compare:

- immediate estimate;
- estimate after realistic growth;
- cumulative effect of several completed topics;
- catch-up behaviour;
- late-topic weight;
- vulnerability to runaway compounding.

The winning model becomes a design decision only after review.

## Catalogue conversion

Use [`research-v2-catalogue-conversion.md`](research-v2-catalogue-conversion.md) as an audit worksheet.

Implementation should:

- enumerate the live catalogue directly;
- create an explicit retain/rename/merge/hide/retire map;
- remove general loose-atom pricing;
- preserve stable IDs only where compatibility needs them;
- add numeric costs only after each topic passes the readiness gate;
- refuse or hide unauthored future content rather than extrapolating it.

Do not encode an assumed catalogue count in migration logic.

## Allocation changes

If research ceases to be an operational worker directive, remove it coherently from:

- directive definitions;
- allocation defaults, targets and locks;
- assignment totals;
- automatic reallocation;
- job-ratio audio inputs;
- UI controls and tooltips;
- save migration.

Search for behavioural assumptions, not only the word `research`.

## Save migration

Migration policy must be decided against real save fixtures. The likely responsibilities are:

- restore any legacy queue resources exactly once if old reservations are retired;
- preserve valid completed effects;
- translate or remove the old Research allocation;
- handle renamed and retired topics;
- initialise any new physical ledger;
- explain unavoidable loss of incompatible partial work;
- remain idempotent after the save version changes.

Do not assign a save version number in planning. Use the next valid version at implementation time.

Old completed research may become legacy core encoding, synthetic banks, or another compatibility representation. Choose the least surprising rule after examining how many completed topics and nanites representative saves contain.

## UI responsibilities

The native research interface should eventually distinguish:

- discovered but unqueued work;
- queued intent;
- why a project cannot start;
- active or paused work;
- physical commitment;
- installed knowledge;
- legacy migrated knowledge.

Before commitment, show the player:

- what will be permanently or temporarily committed;
- current and post-start operating population;
- energy burden;
- estimated time and the assumptions behind it;
- the observation and prerequisites that produced the topic.

Do not expose fictional precision. Estimates should communicate when capacity, growth or missing evidence makes them uncertain.

Preserve existing focus, tooltip and structural-render behaviour.

## Planner responsibilities

The research planner should become a design instrument rather than merely a JSON editor.

Useful fields include:

- role and capability type;
- observation trigger;
- prerequisites and gates;
- candidate costs;
- evidence fixture;
- intended opportunity cost;
- confidence;
- reviewer notes.

Old planner drafts require explicit migration or rejection when their schema changes.

## Audio responsibilities

The synthetic-mind layer may respond to:

- active reasoning;
- mnemonic construction;
- installed memory;
- project completion;
- competing cognitive load.

It remains a read-only interpretation of authoritative state. It should not depend on a removed Research allocation or decide simulation outcomes.

## Verification strategy

Use [`research-v2-regression-plan.md`](research-v2-regression-plan.md). The essential risks are:

- matter or population duplication;
- online/offline divergence;
- event-order disagreement;
- migration loss or repeated refund;
- a new progression deadlock;
- catalogue omissions;
- UI bypass of the command boundary;
- old research assumptions surviving in coupled systems.

The testing document intentionally does not prescribe every test name or assertion sequence.

## Development sequence

1. Capture representative current saves and unlock-state measurements.
2. Close or prototype the unresolved product decisions.
3. Build pure capacity and balance experiments.
4. Add high-risk failing tests for conservation, event ordering, migration and zero-gold progression.
5. Introduce the smallest domain-state changes.
6. Integrate research into the main event loop.
7. Implement queue and lifecycle commands.
8. Convert a narrow vertical slice: bootstrap work, first physical research, one zero-gold material topic.
9. Playtest and calibrate that slice.
10. Audit and convert the remaining catalogue individually.
11. Update allocation, UI, planner, tooltips and audio.
12. Migrate representative old saves and run the full suite and build.
13. Update architecture, roadmap and player-facing documentation to describe only what actually landed.

This sequence is risk-oriented, not mandatory file order.

## Completion criteria

Research v2 is ready to merge when:

- the implemented model has an explicit decision record;
- all accepted costs have evidence and confidence;
- research cannot create or lose nanite bodies;
- time advancement is deterministic across online, offline and stepped runs;
- the zero-gold Stage 2 state has a meaningful, matter-conserving progression path;
- migration is verified against representative saves and is idempotent;
- the live catalogue has an explicit disposition map;
- coupled UI, allocation, planner, tooltip and audio assumptions are updated;
- existing tests remain discoverable and new high-risk coverage passes;
- the production build succeeds;
- documentation clearly distinguishes implemented behaviour from future planning.

