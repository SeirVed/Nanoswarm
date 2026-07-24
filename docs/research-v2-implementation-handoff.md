# Research v2 implementation handoff

## Status and authority

This is the implementation handoff for the approved Research v2 design in [`research-mnemonic-substrate.md`](research-mnemonic-substrate.md).

It is intended for the Work chat or developer with a real repository checkout and test/build loop.

Start from clean `main`. Do not use draft PR #3 as the implementation base.

## Goal

Replace the current loose-atom research economy with one physically coherent system:

```text
compute work
+ electrical energy
+ active nanites converted after bootstrap
=
permanent attached mnemonic memory
+ completed research
```

Research must remain deterministic, event-driven, matter-conserving and integrated with the existing cohort simulation.

## Non-negotiable implementation constraints

1. Modify the existing source modules directly.
2. Do not create or ship `*-legacy.js` copies of the runtime.
3. Do not publish authoritative state through `globalThis`.
4. Do not patch the rendered interface afterward with a `MutationObserver`.
5. Do not advance legacy simulation and research in separate passes.
6. Do not replace or rename the existing test suite out of test discovery.
7. Do not charge loose C, Si, Cu, Au or future chemical inventories for any research.
8. Do not convert a nanite for Parallel Directive Scheduling or Relative Directive Allocation.
9. Do not allow mnemonic construction to consume the final active nanite.
10. Do not silently auto-start further queued projects after one completes unless the player has explicitly enabled an authored auto-continuation rule.

---

## Research definition model

Every research definition should expose these authoritative fields:

```js
{
  id,
  name,
  description,
  effect,
  requires,
  unlockNanites,
  requiresStage,
  requiresSearch,
  requiresDiscovery,
  trigger,
  bonuses,

  memoryNanites,   // fixed active nanites converted at start
  energyCost,      // energy consumed at start
  requiredCompute, // fixed compute work required
}
```

### Removed definition fields

The following concepts must disappear from active Research v2 logic:

- `cost.atoms`
- resource-funded queue reservation
- research worker allocation
- dynamic `max(100, 1% of swarm)` embedded capacity

A temporary compatibility alias from `requiredNaniteMs` to `requiredCompute` may exist only during migration work. The final catalogue should have one authoritative work field.

### Fixed costs

`memoryNanites` is a fixed property of the knowledge bank. It is never a percentage of the player's current swarm.

The UI may calculate and display:

```text
memoryNanites / activeNanites
```

as the current commitment percentage, but waiting and growing must never increase the fixed bank requirement.

---

## Bootstrap archive

The computronium core contains a small rewritable Bootstrap Archive.

The only zero-memory current topics are:

- Parallel Directive Scheduling
- Relative Directive Allocation

They consume time and energy, but convert zero active nanites.

Cohort Ratio Prognostics is the first physical external bank:

- reveal at 180 active nanites;
- commit 16 active nanites;
- preserve approximately four minutes of baseline compute time;
- introduce the mnemonic-substrate UI and log language.

No general rule such as “all research below twenty nanites is free” should be evaluated dynamically. Bootstrap status is explicitly authored per topic.

---

## State model

### Authoritative mnemonic banks

Add a bank ledger to simulation state:

```js
mnemonicBanks: [
  {
    id,
    researchId,
    nanites,
    status,          // constructing | paused | installed
    progressCompute,
    startedAt,
    installedAt,
  }
]
```

The bank ledger is the authoritative physical record.

Installed and constructing totals should preferably be derived from the ledger. If a cached `mnemonicNanites` total is retained for performance or save compatibility, tests must enforce:

```text
cached installed total
=
sum(installed bank nanites)
```

### Research queue

Queue entries represent intent and scheduling, not reserved matter:

```js
researchQueue: [
  {
    id,
    status,          // queued | active | paused
    bankId,          // null for unstarted and bootstrap research
    progressCompute,
    memoryNanites,   // cost snapshot for save stability
    energyCost,      // cost snapshot for save stability
    startedAt,
  }
]
```

Cost snapshots prevent a future balance patch from changing an already-started project mid-construction.

### Legacy completed research

Version 11 completed research remains completed after migration without retroactively deleting population.

Record it explicitly as legacy encoding, for example:

```js
legacyCoreEncodings: [
  {
    researchId,
    migratedAt,
  }
]
```

These encodings:

- preserve effects and prerequisites;
- consume zero modeled mnemonic nanites;
- contribute zero reusable mnemonic bandwidth;
- cannot occur in a new version 12 game.

### Population accounting

The physical population identity is:

```text
replicated nanite bodies
=
active swarm
+ constructing mnemonic banks
+ installed mnemonic banks
+ future damaged/lost states
```

Research conversion reduces `state.nanites` only when construction actually starts.

---

## Research lifecycle

### Reveal

Reveal rules remain observation-led and simulation-validated:

- prerequisites;
- swarm threshold;
- stage;
- material-search horizon;
- discovery signal.

### Queue

Queueing:

- consumes no energy;
- converts no nanites;
- creates no bank;
- may be reordered or removed freely while unstarted.

The log should say the topic is queued as intent and no inputs were reserved.

### Start

Starting requires:

- the topic is first among eligible waiting entries for its research slot;
- prerequisites and gates remain valid;
- enough stored energy;
- enough currently idle active nanites for `memoryNanites`;
- at least one active nanite remains after conversion.

Nanites in indivisible cohorts are not seized. The topic waits until enough workers return.

At start:

1. consume the fixed energy cost;
2. record lifetime energy spent;
3. reduce active nanites by `memoryNanites`;
4. create a constructing bank when `memoryNanites > 0`;
5. mark the queue item active;
6. reconcile directive allocations against the smaller active population;
7. append a permanent significant log entry.

Bootstrap research skips steps 3 and 4.

### Progress

Progress is fixed compute work:

```text
progressCompute += effectiveResearchCapacity × elapsedMilliseconds
```

Use integer arithmetic.

### Pause

Pausing active research:

- stops compute progress;
- leaves energy spent;
- leaves bank nanites committed;
- preserves all completed work;
- does not free a research slot unless the design explicitly permits another bank to use it.

Initial recommended behaviour: a paused bank still occupies its slot because the memory construction is physically attached and incomplete.

### Resume

Resume continues the same bank and progress. No second energy charge or population conversion occurs.

### Cancel

- Unstarted queued intent may be removed freely.
- Active or paused mnemonic construction is irreversible in the first implementation.
- Bootstrap research may also be treated as irreversible after start, avoiding special refund semantics.

Later memory dismantling or deliberate amnesia is separate future design.

### Completion

At completion:

1. mark the bank installed;
2. add the research ID to completed research;
3. apply effects and discoveries;
4. remove or archive the queue item;
5. release the research slot;
6. append completion, bank-installation and model-update log entries;
7. do not start the next waiting topic unless explicit auto-continuation is enabled.

---

## Research capacity

Initial capacity:

```text
100 bootstrap units
+ constructing bank nanites
+ installed mnemonic nanites / 16
```

Interpretation:

- `100` is the core and Bootstrap Archive;
- the bank under construction provides its own writable working set;
- installed banks contribute reusable cache, cross-reference capacity and bus width.

Distributed Reasoning Mesh changes the installed contribution divisor from 16 to 8.

Its second effect is an additional simultaneous research-bank slot. The implementation must either:

- support two independent active banks when this topic is complete; or
- explicitly defer the second slot in both catalogue effect and documentation.

Do not advertise parallel banks without implementing them.

---

## Deterministic event integration

Research must be a first-class simulation event.

### Incorrect pattern

```text
advance all cohorts to target time
then advance research to target time
```

This makes large jumps disagree with small steps.

### Required pattern

At each simulation iteration:

1. calculate the next cohort-completion timestamp;
2. calculate the next active research-completion timestamp or timestamps;
3. choose the earliest timestamp not later than the requested target;
4. advance the simulation clock to that timestamp;
5. settle all events occurring exactly at that timestamp;
6. apply completed research effects before scheduling new work that begins after that timestamp;
7. reconcile allocation and launch eligible work;
8. continue until the requested target is reached.

### Simultaneous-event ordering

For deterministic behaviour at one timestamp:

1. gather all cohort and research completions at that timestamp;
2. settle their already-reserved outputs and research work without launching replacements;
3. apply research unlocks and capacity effects;
4. apply discovery and stage consequences;
5. reconcile the active population and targets;
6. launch replacement cohorts or newly authorised research.

Tests must prove that one large event jump equals many small advances.

---

## Allocation changes

Remove Research from:

- `DIRECTIVES` used by workforce assignment;
- empty allocation objects;
- allocation targets;
- allocation locks;
- percentage controls;
- assignment totals;
- replication reallocation logic;
- audio job-ratio calculations.

The operational directives remain:

- Collect
- Harvest atmosphere
- Sort
- Acquire energy
- Replicate

Research is controlled by its own queue, bank slots, pause/resume and start commands.

### Save compatibility

Migration should tolerate old `allocations.research`, target and lock fields, then remove or zero them. New saves should not continue storing meaningless research-allocation fields.

---

## Catalogue conversion

Convert every current topic.

### Bootstrap coordination

| Topic | Memory |
|---|---:|
| Parallel Directive Scheduling | 0 |
| Relative Directive Allocation | 0 |
| Cohort Ratio Prognostics | 16 |

### Memory scale

| Scale | Fixed bank footprint |
|---|---:|
| M1 · first electronic shell | `1 × 10^15` nanites |
| M2 · circuit-board scale | `2 × 10^15` nanites |
| M3 · motherboard scale | `4 × 10^15` nanites |
| M4 · chassis/environment scale | `8 × 10^15` nanites |
| M5 · next local environment | `2 × 10^16` nanites, provisional |
| M6 · later environmental scale | `5 × 10^16` nanites, provisional |

### Incremental branches

For each current tier of:

- Capacitive Buffer Lattice
- Payload Frame Reinforcement
- Packetized Sorting
- Route Memory

use M1 through M6 according to the material search that reveals the tier.

### Material and environment topics

- Residuum Indexing — M1
- Phase-Locked Directive Bus — M3
- Ferromagnetic Phase Analysis — M4
- Atmospheric Spectroscopy — M4
- Atmospheric Fractionation I — M4
- Atmospheric Fractionation II — M5
- Atmospheric Fractionation III — M6
- later hidden fractionation tiers — provisional until environments are authored

### Strategic topics

- Specialized Morphologies I — `2 × M4`
- Radiofrequency Scavenging — `2 × M5`
- Local Material Caches — `2 × M5`
- Distributed Reasoning Mesh — `8 × M5`
- Autonomous Prospecting — `8 × M5`
- Directive Compilation — `16 × M5`

The M5/M6 and strategic values are balance constants, not architectural uncertainty.

### Energy

Energy is the only expendable research resource.

Retain the existing measured first-horizon energy-minute constant as a useful calibration tool, but delete its atom components from Research v2.

Suggested baseline burdens remain those in the approved design document. Exact energy constants may be tuned after telemetry without changing state architecture.

---

## Save version 12 migration

### Required migration behaviour

For every version 11 save:

1. deserialize through all existing migrations first;
2. refund every old queued research reservation:
   - energy;
   - carbon;
   - silicon;
   - copper;
   - gold;
3. preserve queue order as unstarted intent;
4. discard old partial research work because the work model and costs changed;
5. remove retired or unknown queue entries safely;
6. preserve completed research effects;
7. record completed topics as legacy core encodings;
8. remove or zero the old Research allocation, target and lock;
9. initialize the mnemonic bank ledger;
10. set version 12;
11. append one clear world-tier migration log entry.

### No double refund

The migration must be idempotent through normal load/save flow. A version 12 save must never re-run version 11 refunds.

### Existing migrations

Do not rewrite or bypass migrations for:

- legacy deposits;
- hidden elements;
- log significance;
- allocation targets;
- lifetime material flow;
- renamed research;
- replication tuning and burst reservations.

Version 12 extends that chain.

---

## UI changes

Render Research v2 directly in `src/ui/app.js`.

### Research header

Display:

- core bootstrap capacity;
- constructing memory;
- installed mnemonic substrate;
- active bank slots and used slots;
- current effective compute capacity.

### Research card

Before queue or start, show:

- fixed mnemonic footprint;
- energy requirement;
- compute estimate;
- current population commitment percentage;
- active swarm after commitment;
- prerequisite and observation gates.

Bootstrap topics explicitly say zero active nanites are converted.

### Queue

Clearly distinguish:

- queued intent;
- waiting for energy;
- waiting for idle nanites;
- active construction;
- paused construction;
- installed/completed.

Controls:

- queue;
- start;
- pause;
- resume;
- reorder waiting entries;
- remove waiting intent.

The next queued topic must not silently begin after completion by default.

### Bank ledger

Completed research should have a physical mnemonic-bank presentation showing:

- bank identifier;
- topic;
- installed nanite-equivalent footprint;
- status;
- installation time where useful.

Legacy completed topics may be grouped under `LEGACY CORE ENCODING` with zero modeled footprint.

### Focus and tooltips

Preserve existing stable tooltip identity and focus-restoration behaviour across structural renders.

Do not add a second DOM-patching layer.

---

## Research planner changes

Update `src/ui/research-planner.js` and its labels so the planner edits:

- memory nanites;
- energy cost;
- required compute or baseline time;
- bootstrap status where appropriate;
- prerequisites, gates and bonuses.

Remove editable carbon, silicon, copper and gold cost fields.

Planner import/export must migrate or reject old drafts explicitly. Bump its local-storage key/version to avoid silently interpreting old resource-cost drafts as Research v2 definitions.

---

## Audio changes

The synthetic mind may retain a research voice, but its activity must derive from:

- active mnemonic construction;
- current research compute capacity or progress;
- installed mnemonic-bank presence;

It must not read `allocations.research` or use the old one-percent seed-reasoning rule.

Audio remains a read-only observer and never enters saves or simulation decisions.

---

## Tooltip and text changes

Replace all text that says:

- research reserves atoms when queued;
- cancellation refunds atoms;
- allocated research workers increase capacity;
- embedded capacity is one or two percent of the swarm;
- current topics cost minutes of a material pipeline.

New tooltips must explain:

- queue intent reserves nothing;
- energy and idle nanites commit at start;
- active bank construction is physically irreversible;
- bootstrap topics use internal archive capacity;
- loose elemental inventories are never charged.

---

## Documentation cleanup in the same implementation PR

Update:

- `README.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/prototype-audit.md`
- `docs/README.md` status labels
- save-version references
- research-workbench description

Remove the stale bridge-review material identified in [`repository-audit-and-cleanup.md`](repository-audit-and-cleanup.md).

---

## CI requirements

Add or update GitHub Actions so every pull request and push to `main` runs:

```text
npm test
npm run build
```

Do not rely only on `node --check`.

The full existing test suite must remain discoverable.

---

## Recommended implementation sequence

1. Add failing Research v2 state, migration and zero-gold tests while retaining every existing test.
2. Convert research catalogue fields and remove atom costs.
3. Add mnemonic-bank state and helper selectors.
4. Integrate research completion into the main event loop.
5. Implement queue/start/pause/resume/completion commands.
6. Remove Research from workforce directives and allocation math.
7. Implement version 12 migration and round-trip tests.
8. Update native research UI.
9. Update planner, tooltips and audio.
10. Remove stale bridge material.
11. Update documentation and save-version prose.
12. Run full tests and build.
13. Play through:
    - one-nanite start;
    - early bootstrap research;
    - first mnemonic bank;
    - an offline interval crossing a research completion;
    - zero-gold chassis progression;
    - save migration with queued research;
    - Temporary Burst and existing replication diagnostics after research conversion.

---

## Definition of done

Research v2 is complete only when:

- every current research definition uses energy, compute and fixed memory footprint;
- no research charges loose atoms;
- the two bootstrap topics convert zero nanites;
- Cohort Ratio Prognostics creates the first 16-nanite bank;
- research is absent from workforce allocations;
- mnemonic completion is integrated into the event loop;
- large event jumps equal stepped simulation;
- version 11 reservations refund exactly once;
- zero-gold chassis saves can research iron and atmosphere;
- the last active nanite cannot be converted;
- existing regression tests still run;
- planner, audio, tooltips and UI contain no old research assumptions;
- no `*-legacy.js` runtime scaffolding is added;
- CI passes `npm test` and `npm run build`;
- documentation describes one coherent implemented system.
