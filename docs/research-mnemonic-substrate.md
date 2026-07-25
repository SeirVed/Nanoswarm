# Research v2 planning brief

## Status

Working design, not an approved specification.

This document records the strongest ideas from the Research v2 discussion while separating them from untested balance values and implementation guesses. Nothing here makes a number authoritative. Any quantity previously proposed for nanites, energy, compute, duration, capacity, reveal thresholds or concurrent slots is discarded until it is derived from the live economy and tested.

The related documents have distinct purposes:

- [`research-v2-catalogue-conversion.md`](research-v2-catalogue-conversion.md) inventories the research catalogue and defines how costs should eventually be calibrated.
- [`research-v2-implementation-handoff.md`](research-v2-implementation-handoff.md) describes implementation boundaries without prescribing premature data structures.
- [`research-v2-regression-plan.md`](research-v2-regression-plan.md) defines risk-based verification rather than a test-by-test script.
- [`stage-2-industrial-transition.md`](stage-2-industrial-transition.md) explores the industrial phase change that motivates this redesign.

## Why the current model needs reconsideration

The current implementation treats research as another production directive funded partly by loose elements. That produces several design problems:

- knowledge competes with fabrication through arbitrary elemental shopping lists;
- consuming a recipe element can halt both replication and the research intended to escape that bottleneck;
- assigning ordinary nanites to an abstract Research directive does not express what they physically do;
- rapid swarm growth can collapse long estimates without creating a corresponding physical research system;
- queued resource reservations make experimentation expensive before the player has actually committed to a project.

The reported zero-gold chassis state is the clearest example. Gold scarcity is an interesting constraint on universal-nanite replication. It is not interesting when it also prevents the swarm from learning how to use iron, atmosphere and conventional machinery.

## Design direction worth preserving

The promising core idea is that research changes the swarm physically.

The computronium core performs reasoning, but durable post-bootstrap knowledge needs attached mnemonic substrate. Active nanites can be reorganised into permanent memory and interface structures. Research therefore has three conceptually separate demands:

- computation over time;
- energy;
- a permanent or long-lived commitment of existing nanite bodies to knowledge storage.

This gives research an opportunity cost without pretending knowledge consumes arbitrary atoms. It also makes accumulated research visible in the fiction: the seed gradually grows a physical memory architecture around itself.

This remains a design direction. We have not yet established the correct conversion scale, processing curve or energy burden.

## Current confidence levels

### Strong principles

These fit the game’s existing architecture and should be treated as constraints unless playtesting disproves them:

- Research must not create matter or hidden bailout resources.
- Loose elemental inventories should not be the general currency for knowledge.
- Research must use the same authoritative simulation clock as cohort work.
- Online, offline and stepped progression must agree.
- The interface issues research commands but never awards progress or resources.
- Completed knowledge, committed nanites and population totals must survive save round trips without duplication.
- Gold exhaustion may stop universal-nanite replication but must leave a legible route into bulk industry.
- Discovery and observation should reveal research; catalogue presence alone should not.

### Promising but unsettled mechanics

These need prototypes or explicit decisions:

- a small internal bootstrap archive for the earliest coordination topics;
- post-bootstrap mnemonic banks built from active nanites;
- queueing as free intent, with commitment occurring only when work starts;
- explicit start rather than silent automatic continuation;
- committed memory remaining physically attached after completion;
- installed memory contributing to later research capability;
- pausing preserving work and committed substrate;
- one or more simultaneous bank-construction slots.

### Unvalidated balance territory

No value from the previous planning pass should be copied into production without recalculation:

- first-bank nanite cost;
- every later memory footprint;
- energy costs;
- compute requirements and displayed durations;
- core capacity;
- contribution from installed or constructing banks;
- reveal thresholds;
- number of concurrent projects;
- growth multipliers;
- Stage 2 swarm-scale targets.

## Research lifecycle sketch

This is the clearest current interaction model, but its details remain editable.

### Discovery

A research signal appears because the swarm observed a limitation, material, pattern or opportunity. Prerequisites express intellectual dependency; observation gates express why the idea exists now.

### Queue

Queueing records player intent. It should not itself reserve matter, energy or workers. The player may reorder or remove work that has not started.

### Start

Starting validates the current state and commits the real inputs chosen for the final model. If mnemonic conversion is retained, only idle nanites may be committed; workers already inside indivisible cohorts are not seized.

The game must never accidentally consume the final operational nanite. Whether a more conservative survival reserve is required is an open design question.

### Progress

Research progress belongs inside the deterministic event simulation. The eventual rate model may depend on the core, the bank under construction, installed memory or other infrastructure, but it must be:

- integer-authoritative;
- explainable to the player;
- stable across save/load;
- independent of render frequency;
- testable by comparing large time jumps with smaller steps.

### Pause, abandonment and completion

Pausing should not duplicate or refund physical commitments. Whether an incomplete mnemonic bank can be dismantled, salvaged or permanently abandoned is not settled.

Completion installs knowledge and applies its effects at a precise simulation timestamp. Jobs already underway retain the rules and reservations with which they began; later jobs may use the new capability.

Automatic continuation should be opt-in, if it exists at all. A newly completed topic can materially alter population, capacity, allocations or priorities, so a default pause gives the player a chance to reassess.

## Bootstrap question

The first coordination researches may plausibly live inside a rewritable archive already present in the arriving computronium. This explains why the seed can improve scheduling before sacrificing part of a tiny swarm.

The candidate bootstrap set currently includes:

- Parallel Directive Scheduling;
- Relative Directive Allocation.

That list is not yet sacred. It should be judged by the opening experience:

- Does the player reach useful allocation controls before manual assignment becomes irritating?
- Does the fiction explain the improvement without inventing new matter?
- Does the sequence teach research before asking for an irreversible population commitment?
- Does it avoid making every early topic free by precedent?

Cohort Ratio Prognostics is a good candidate for the first visible mnemonic-bank project because its effect is explicitly about modelling the swarm. Its footprint, reveal point and duration are all unvalidated.

## Population accounting

If mnemonic conversion survives prototyping, the game needs one auditable physical identity:

```text
all replicated nanite bodies
= active workers
+ nanites committed to incomplete memory
+ nanites installed as memory
+ any future damaged, lost or otherwise modelled states
```

The exact state representation should follow the existing engine’s conventions. The planning documents should not prescribe parallel ledgers or cached totals unless profiling demonstrates a need.

## Capacity must be designed, not guessed

The previous proposal supplied a tidy formula for core, constructing and installed memory. It had narrative appeal but no economic derivation.

Before selecting a formula, compare at least these models:

- **Core-limited:** installed banks store knowledge but barely accelerate new work.
- **Additive memory:** each bank provides a diminishing contribution to reasoning throughput.
- **Specialised acceleration:** banks accelerate related branches more than unrelated research.
- **Infrastructure-gated:** memory helps only after buses, cooling or coordination upgrades.
- **Slot-focused:** installed memory expands parallelism more than raw speed.

The chosen model should create interesting choices rather than automatic compounding. It must not let early bank accumulation trivialise every later timer, nor make permanent nanite conversion feel like a tax with no systemic benefit.

## How balance values will be earned

Every proposed cost should carry a small evidence record:

```text
unlock state:
available active nanites:
idle nanites:
replication rate and limiting element:
stored and sustainable energy:
competing projects:
intended decision:
target wait if pursued immediately:
target recovery time:
tested save or simulation fixture:
confidence:
```

Memory cost should be selected as an opportunity cost, not as a fraction copied from a tier table. Energy cost should be derived from attainable generation and competing demand. Compute should be chosen for pacing and acceleration behaviour after the capacity model exists.

Useful questions include:

- What percentage of the actually reachable swarm is being committed?
- How long does replication take to replace that lost operating capacity, if it can?
- Is the player choosing between growth, knowledge and infrastructure, or merely waiting?
- Does waiting to grow make the decision easier in a healthy way?
- What happens when the recipe bottleneck prevents replacement?
- Does the research arrive before, during or after the problem it explains?
- How does the cost behave for a player returning from a long offline interval?

No smooth mathematical sequence is automatically desirable. Different research families should have different economic shapes when their fiction and gameplay roles differ.

## Catalogue conversion principles

When the catalogue is converted:

- retain stable IDs where save compatibility requires them;
- re-evaluate every reveal gate and prerequisite against the actual observation sequence;
- remove elemental research prices unless a specific experiment physically consumes material;
- give every topic an authored role, not just a tier number;
- distinguish throughput refinements from new capabilities and strategic systems;
- hide unauthored future tiers rather than filling them with extrapolated values;
- record the evidence and confidence behind every final cost.

The live catalogue must be enumerated from source when implementation begins. A count written in planning prose is not a substitute for checking the code.

## Stage 2 consequence

The research redesign is valuable because it lets the gold famine remain real.

The finite alien swarm can redirect some of itself into understanding bulk materials and then use ordinary matter and energy to construct larger, slower systems. Research, construction and operation become separate economic layers:

```text
observation
→ mnemonic commitment and reasoning
→ process knowledge
→ physical machine construction
→ recurring industrial transformation
```

This does not decide which machine comes first or what any machine costs. Those choices belong to the Stage 2 design and must be grounded in the actual chassis composition and player state.

## Decisions required before implementation

The following questions should be answered—or deliberately delegated to a small prototype—before the runtime rewrite:

1. Which topics, if any, use only bootstrap memory?
2. Are converted nanites permanently unavailable, recoverable at a loss, or reconfigurable later?
3. What does an incomplete bank contribute, if anything?
4. Does installed memory primarily increase speed, parallelism, specialisation or some combination?
5. Can research begin automatically when requirements become available?
6. What survival reserve prevents self-disabling commitments?
7. How are old completed topics represented after migration?
8. How should old queued reservations and partial work migrate?
9. Which current research branches remain worthwhile, and which are placeholder ladders that should be redesigned?
10. What measured game states will anchor initial balance?

## Definition of a usable design

Research v2 is ready for implementation only when:

- the physical fiction and player interaction are coherent;
- structural invariants are separated from tunable content;
- representative saves establish real unlock-state economics;
- every initial cost has evidence, intent and a confidence label;
- at least one spreadsheet or simulation sweep shows how the system behaves across plausible player strategies;
- migration policy is explicit;
- the zero-gold transition remains playable without creating free matter;
- open questions are visible rather than concealed behind precise-looking constants.

