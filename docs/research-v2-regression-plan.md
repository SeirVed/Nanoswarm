# Research v2 regression plan

## Purpose

Research v2 changes population accounting, event ordering, queue semantics, save migration, UI state and the research catalogue. It must be tested as a simulation rewrite, not merely as a cost-field replacement.

This plan is additive. Do not delete, rename or sideline the current regression suite.

## Test-discovery rule

All executable tests must retain filenames discovered by `node --test`, preferably `*.test.js`.

The previous broad simulation suite remains in `tests/simulation.test.js`. Research v2 tests may be added to that file or split into clearly named files such as:

- `tests/research-v2.test.js`
- `tests/research-v2-migration.test.js`
- `tests/research-v2-ui-model.test.js`

Never move old tests into a non-discovered `*-legacy.js` file to obtain a green run.

---

## A. Catalogue invariants

### A1 — no loose-atom costs

For every research definition:

- no active atom-cost field exists, or every compatibility atom cost is exactly zero;
- energy cost is a non-negative `bigint`;
- memory footprint is a non-negative `bigint`;
- required compute is a positive `bigint`.

### A2 — bootstrap topics

Assert exactly these current topics have zero mnemonic footprint:

- Parallel Directive Scheduling
- Relative Directive Allocation

Cohort Ratio Prognostics must have a footprint of exactly 16 nanites.

### A3 — fixed footprints

Assert memory footprints do not depend on current state or swarm population.

The same research definition must report the same `memoryNanites` at 180, `10^6`, `10^15` and `10^20` active nanites.

### A4 — current catalogue completeness

Every currently authored research ID on `main` must survive conversion. No topic may disappear accidentally because its old cost shape changed.

### A5 — prerequisites and gates

Existing prerequisite, stage, search and discovery rules remain intact unless explicitly changed by approved design.

---

## B. Bootstrap behaviour

### B1 — population-free Parallel Directive Scheduling

Given two active nanites and sufficient energy:

- queueing reserves nothing;
- starting consumes energy only;
- active nanite count remains unchanged;
- no mnemonic bank is created;
- completion adds the research and a bootstrap encoding/log entry.

### B2 — population-free Relative Directive Allocation

Repeat B1 at its reveal threshold and confirm the active swarm is unchanged.

### B3 — bootstrap duration

At core capacity 100:

- Parallel Directive Scheduling completes in four minutes;
- Relative Directive Allocation completes in two minutes thirty seconds.

### B4 — no implicit one-percent scaling

Increasing the active swarm while no mnemonic banks exist must not increase bootstrap research capacity through an old `1% of swarm` rule.

---

## C. First mnemonic bank

### C1 — Cohort Ratio Prognostics conversion

Given 180 active nanites, completed prerequisites, sufficient energy and 16 idle nanites:

- start consumes the authored energy;
- active swarm becomes 164;
- a constructing bank with 16 nanites is created;
- the bank contributes to current research capacity;
- completion marks it installed;
- active swarm remains 164;
- installed memory totals 16;
- the existing replication diagnostics unlock.

### C2 — matter-state conservation

The 16 nanites are not counted as active after start and are not lost from the physical ledger.

Test the identity:

```text
pre-start active swarm
=
post-start active swarm
+ constructing bank nanites
```

### C3 — allocation reconciliation

When active population falls by 16:

- no allocation count exceeds the new active swarm;
- relative targets remain internally valid;
- locked-target rules remain deterministic;
- no worker is double-counted between a cohort and a mnemonic bank.

---

## D. Queue semantics

### D1 — queueing is intent only

Queueing a topic:

- changes no atoms;
- changes no energy;
- changes no active population;
- creates no bank;
- records the waiting topic in order.

### D2 — explicit start

A waiting topic starts only through its start command or an explicitly enabled authored auto-continuation rule.

Completing an active topic must leave the next topic waiting by default.

### D3 — reorder waiting topics

Waiting entries may move up and down without changing cost snapshots or progress.

They cannot move ahead of an active or paused bank occupying the slot.

### D4 — remove waiting intent

Removing an unstarted topic has no refund because nothing was reserved.

### D5 — insufficient energy

Starting with insufficient energy:

- fails or remains waiting with a precise reason;
- converts no nanites;
- creates no bank;
- preserves queue intent.

### D6 — insufficient idle nanites

When enough active nanites exist but too many are in indivisible cohorts:

- research waits;
- no in-flight workers are seized;
- start succeeds after enough cohorts return.

### D7 — final nanite protection

For any mnemonic topic:

```text
active nanites - memory footprint >= 1
```

must be required.

A topic whose footprint equals or exceeds all active nanites remains queued and does not consume energy or population.

### D8 — pause and resume

Pausing:

- preserves progress;
- preserves the constructing bank;
- returns no nanites;
- refunds no energy;
- stops progress over elapsed simulation time.

Resuming continues from the same progress and bank without charging again.

### D9 — active cancellation

If active cancellation is intentionally unavailable, verify the command is rejected without state mutation.

---

## E. Capacity and bank accounting

### E1 — base formula

Before Distributed Reasoning Mesh:

```text
capacity
=
100
+ constructing bank nanites
+ installed bank nanites / 16
```

Use integer division and exact expected values.

### E2 — mesh formula

After Distributed Reasoning Mesh:

```text
installed contribution
=
installed bank nanites / 8
```

### E3 — bank total invariant

For every state transition and save round trip:

- installed total equals the sum of installed bank footprints;
- constructing total equals the sum of constructing and paused bank footprints;
- no bank is simultaneously constructing and installed;
- every active non-bootstrap queue item references exactly one bank;
- no two queue items reference the same bank.

### E4 — second bank slot

If the mesh implements two concurrent slots:

- two projects may progress independently;
- a third remains waiting;
- simultaneous completion is deterministic;
- each bank has separate cost snapshots and progress;
- queue ordering remains stable.

If parallel construction is deferred, the research effect and UI must not claim it exists.

---

## F. Deterministic event ordering

### F1 — stepped versus jumped progress

Create a state where research completes midway through an interval.

Compare:

- one `advanceSimulation` call to the final timestamp;
- many smaller calls that cross the same completion timestamp.

Serialized states must be identical.

### F2 — research effect changes later jobs

Use a research effect that changes throughput or job duration.

Arrange:

- research completion at time `T`;
- an existing cohort completion at or before `T`;
- replacement work launched after `T`.

Assert jobs launched after `T` use the new research effect, while jobs started before `T` retain their original payload and completion time.

This specifically detects the invalid “advance cohorts first, then research” implementation.

### F3 — simultaneous completion

Make a cohort and a research bank complete at the same timestamp.

Assert the documented tie order:

1. settle all already-running completions;
2. apply research effects;
3. reconcile population and allocations;
4. launch replacement work.

### F4 — offline equivalence

Save immediately before a research completion, then load after a long absence.

The result must equal an always-open simulation advanced to the same timestamp.

### F5 — no zero-time loop

Paused research, blocked queue entries and simultaneous events must not create a zero-time event loop or exhaust a safety counter.

---

## G. Zero-gold chassis regression

This is the playtester-reported failure and a release-blocking test.

### Setup

Given:

- Stage 2 reached;
- material search 4 complete;
- atmosphere visible;
- Residuum Indexing complete;
- active swarm large enough for M4 banks;
- loose gold exactly zero;
- no complete nanite recipe available;
- sufficient energy.

### G1 — iron research starts

Ferromagnetic Phase Analysis must:

- reveal normally;
- queue normally;
- start without loose gold;
- leave loose gold at zero;
- convert only its fixed active-nanite footprint;
- complete and catalogue iron.

### G2 — atmosphere research starts

Atmospheric Spectroscopy must:

- queue while the iron bank is active;
- remain waiting by default after iron completes;
- start explicitly without loose gold;
- complete and catalogue N/O/Ar/C signatures.

### G3 — progression remains live

The player must retain at least one actionable progression path despite zero gold and halted nanite replication.

The test should verify research controls are enabled based on energy and active nanites, not atom inventory.

### G4 — no hidden bailout gold

The fix must not add gold to the chassis, refund fabricated gold, or create matter. Loose gold remains zero throughout the test.

---

## H. Save migration version 11 to 12

### H1 — queued reservation refund

Given a version 11 queue item with reserved:

- energy;
- C;
- Si;
- Cu;
- Au;

migration must refund each exact amount once and preserve the topic as unstarted queue intent.

### H2 — partial work reset

Old partial `progressNaniteMs` is reset because the work and cost model changed.

The migration log must explain recalibration without pretending the old work survived.

### H3 — completed research preservation

All valid completed topics remain completed and preserve effects.

They become legacy core encodings with zero mnemonic footprint and zero reusable-bank contribution.

### H4 — old research allocation removal

Old `allocations.research`, target and lock values must not assign workers or affect population after migration.

### H5 — retired/renamed topics

Retain all existing rename and retirement handling from earlier save migrations. Unknown queue topics are dropped safely after refunding any valid stored reservation.

### H6 — idempotence

After migrating and saving as version 12, loading again must not repeat refunds, logs or legacy-encoding creation.

### H7 — round trip

A version 12 state with:

- active bank;
- paused bank;
- installed banks;
- waiting queue;
- legacy core encodings;
- large BigInt footprints;

must round-trip exactly through serialization.

### H8 — old save corpus

Run migration against representative saves from every earlier version already supported by the repository, not only an artificial version 11 object.

---

## I. Existing-system regressions

Research conversion must not break:

- exact starter recipe packets;
- collection reservation and completion;
- sorting and hidden-element Residuum;
- local search progression and persisted search count;
- atmosphere collection;
- relative allocation and locks;
- cohort synchronization and resonance;
- replication batching;
- Temporary Burst charging, reservation, cancellation and restoration;
- replication readiness diagnostics;
- lifetime material and energy accounting;
- log significance retention;
- new-feature acknowledgements;
- tooltips and focus restoration;
- feedback issue generation;
- quantity formatting;
- audio composition determinism;
- save/load offline catch-up.

Every current test covering these systems remains active.

---

## J. UI model tests

Where UI behaviour can be separated into pure helpers, test:

- research card cost labels show memory and energy only;
- bootstrap cards show zero converted nanites;
- active-after count never displays a negative value;
- queue status labels distinguish waiting, active and paused;
- start control is disabled with a precise energy or idle-worker reason;
- next queued topic does not auto-start by default;
- bank ledger totals match state;
- old atom-reservation text is absent;
- Research is absent from allocation rows;
- percentage target totals exclude Research.

Avoid brittle full-DOM snapshots where pure formatting helpers are possible.

---

## K. Research planner tests

Verify the planner:

- loads every live research definition;
- edits memory, energy and compute fields;
- contains no C/Si/Cu/Au research-cost inputs;
- exports BigInt-compatible values safely;
- validates non-negative memory and energy;
- preserves dependencies and gates;
- upgrades or isolates old local-storage drafts by versioned key;
- does not silently import an old atom-cost draft as a valid Research v2 plan.

---

## L. Tooltip and audio tests

### Tooltips

Assert research tooltips describe:

- queue intent;
- commitment at start;
- energy and mnemonic footprint;
- irreversible active construction;
- no loose-atom cost.

No tooltip may say queued research reserves atoms.

### Audio

Assert research activity derives from active mnemonic construction or bank state rather than `allocations.research`.

The audio observer must remain deterministic and read-only.

---

## M. CI acceptance

The implementation branch is not ready until GitHub Actions runs and passes:

```text
npm test
npm run build
```

The test output should demonstrate that the original broad suite and the new Research v2 suite were both discovered.

A build-only or `node --check`-only validation is insufficient.

---

## Manual playtest checklist

After automated tests pass:

1. Start a clean game with one nanite.
2. Reach two nanites and complete Parallel Directive Scheduling.
3. Reach twelve and complete Relative Directive Allocation.
4. Reach 180 and observe the 16-nanite Cohort Ratio Prognostics commitment.
5. Leave a project running across an offline interval.
6. Queue at least two projects and verify the second waits after completion.
7. Pause and resume a physical bank.
8. Reach the chassis with zero loose gold.
9. Complete iron and atmospheric research.
10. Confirm replication remains gold-blocked while non-replication progression continues.
11. Load a version 11 save with queued research and inspect exact refunds.
12. Exercise Temporary Burst after the research rewrite.
13. Open both design workbenches and confirm old resource-cost and bridge-review language is gone.
14. Hover every research control and verify tooltip continuity.
15. Check synthetic-mind audio through a research start and completion.

## Release blocker

Any failure in event-jump equivalence, save refund accuracy, zero-gold chassis progression, population conservation, last-nanite protection or preservation of the existing simulation test suite blocks merge.
