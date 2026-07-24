# Research v2 verification charter

## Status

Risk-based planning document.

This is not a script for the implementer and not an attempt to pre-write every unit test. It identifies the failures that would make Research v2 unsafe, the evidence required for confidence, and a small set of representative scenarios.

Exact costs, durations, capacity formulas, reveal thresholds and catalogue counts are deliberately absent. Tests should verify accepted rules and invariants, not turn today’s guesses into permanent behaviour.

## Verification principles

- Test outcomes and invariants, not private implementation shape.
- Preserve the existing regression suite.
- Prefer a few deep scenario tests over dozens of mechanically repeated examples.
- Use property or parameterised tests for broad state spaces.
- Keep balance validation separate from correctness tests.
- Derive catalogue completeness from source or an explicit migration map.
- Verify migrations with real or representative old saves.
- Compare online, offline and stepped advancement using the same final timestamp.
- Add a regression test for every observed player-facing deadlock or conservation failure.

## Critical risks

### Conservation failure

Research must not duplicate, destroy or double-count:

- active nanites;
- committed or installed mnemonic substrate;
- energy;
- legacy queued resources;
- research progress.

Evidence:

- population identity before and after every lifecycle transition;
- save round trips;
- pause/resume and failed-start cases;
- migration with both queued and completed legacy research.

### Temporal divergence

A large simulation jump must agree with smaller steps through the same cohort and research events.

Evidence:

- research completing between cohort events;
- research and cohort work completing at the same timestamp;
- an effect changing work launched after completion;
- an offline interval crossing one or more research completions;
- blocked or paused work that cannot cause a zero-time loop.

### Migration corruption

A legacy save must not lose completed effects, receive repeated refunds or retain ghost Research workers.

Evidence:

- a small corpus covering empty, queued, partially progressed, completed and renamed research;
- load–migrate–save–reload idempotence;
- exact accounting of any refunded reservations;
- clear handling of incompatible partial progress;
- continued play after migration.

### Progression deadlock

The redesign exists partly to stop a material bottleneck from disabling the knowledge needed to escape it.

Evidence:

- a chassis-era state with replication halted by a missing recipe element;
- no fabricated rescue material;
- at least one understandable research-to-industry path;
- enough operational population remains to pursue it;
- the player can identify why unavailable actions are blocked.

### Command-boundary violation

The UI, planner, audio and tooltip systems must not award progress or mutate authoritative state.

Evidence:

- simulation commands validate start, pause, resume and queue changes;
- render refresh does not alter resources or progress;
- audio remains observational;
- planner drafts cannot leak into a live save without an explicit import command.

### Catalogue omission

No live topic should silently disappear or retain incompatible old costs.

Evidence:

- enumerate the runtime catalogue during conversion;
- compare it with an explicit disposition map;
- fail validation for unclassified topics;
- verify renamed, merged, hidden and retired IDs through migration tests.

## Structural invariants

These should be checked wherever relevant:

- Authoritative quantities are whole integers.
- Waiting intent commits nothing unless the final design explicitly says otherwise.
- Failed starts leave state unchanged.
- Nanites already committed to indivisible work are not seized.
- Research cannot consume the protected operating population.
- Started work retains its cost and rules across later balance changes.
- Pausing cannot duplicate work, free physical memory accidentally or charge twice.
- Completion applies once at a precise timestamp.
- Installed and incomplete memory totals agree with their authoritative records.
- Completed effects survive save/load.
- Hidden future content does not reveal merely because a definition exists.

The exact protected population, cost model and pause rules must come from the final design record rather than this document.

## Representative scenarios

### Opening bootstrap

Purpose:

- teach the research interaction;
- verify any bootstrap exception;
- ensure tiny populations cannot self-disable;
- confirm early allocation controls arrive at a sensible point.

Use one scenario that follows the actual opening progression. Avoid isolated tests for every UI line.

### First physical commitment

Purpose:

- demonstrate the active-to-memory transition;
- reconcile allocation;
- show the opportunity cost clearly;
- verify permanent population accounting;
- confirm the unlocked capability appears exactly once.

Use whatever first project the design ultimately selects. Do not pin its cost here.

### Concurrent production and research

Purpose:

- exercise the shared event loop;
- prove event ordering when a research effect alters later jobs;
- compare one large advance with many smaller advances.

This is the core deterministic scenario and deserves detailed automated coverage.

### Blocked start and recovery

Purpose:

- verify insufficient energy, idle population or slots do not partially commit inputs;
- show a precise block reason;
- start successfully once the condition changes.

Cover several block reasons through one parameterised scenario where practical.

### Pause, resume and abandonment

Purpose:

- verify the final product rule;
- preserve progress and physical accounting;
- prevent repeated charges or slot ambiguity.

Do not write this scenario until those interactions are decided.

### Gold-famine transition

Purpose:

- reproduce the reported failure;
- keep gold scarcity meaningful;
- verify research and industrial progression do not require hidden gold;
- ensure no matter is created as a bailout.

This is a release-critical gameplay regression, but it should test the player outcome rather than a specific research name or guessed bank size unless those become stable content.

### Legacy migration

Purpose:

- cover reservations, partial work, completed effects and old allocation;
- prove one-time migration;
- continue simulation afterward.

Prefer table-driven fixtures over a separate hand-written test for every field.

### Long offline return

Purpose:

- cross multiple event types;
- verify final state equivalence;
- check log and UI summaries remain bounded and useful;
- ensure no safety counter rejects valid work merely because much happened.

## Balance validation

Balance is not a conventional pass/fail regression target while values are exploratory.

Use simulation sweeps and captured saves to review:

- commitment as a share of reachable and idle population;
- recovery time;
- energy burden under realistic allocations;
- immediate and post-growth research estimates;
- cumulative memory commitment across plausible paths;
- dominant ordering;
- dead ends;
- long-offline distortion;
- how quickly installed memory compounds future work.

Store the assumptions and outputs used to accept a value. Once a value is intentionally stabilised, add only the smallest regression needed to stop accidental order-of-magnitude changes.

Avoid tests that freeze:

- every displayed duration;
- every individual card’s exact energy;
- arbitrary tier ratios;
- a temporary catalogue count;
- provisional UI wording;
- one specific internal state layout.

## UI and accessibility coverage

Verify behaviours with user impact:

- queue state and block reason are distinguishable;
- irreversible commitment is visible before confirmation;
- estimates state their assumptions;
- focus and uncommitted input survive unrelated renders;
- keyboard controls remain usable;
- new panels appear only when relevant;
- migrated legacy knowledge is not misrepresented as physical memory;
- tooltips do not contradict actual commitment semantics.

Prefer component or integration coverage for these outcomes. Snapshotting large HTML fragments is unlikely to be useful.

## Planner and audio coverage

The planner should:

- author the fields the final model actually uses;
- retain evidence and confidence metadata;
- migrate or reject old drafts explicitly;
- export data that validates before entering content.

Audio should:

- derive activity from read-only state;
- survive missing or newly introduced fields;
- remain outside saves and simulation decisions.

Only test meaningful contracts. Exact tones, labels or visual geometry do not belong in the core regression suite.

## Continuous integration

Every proposed implementation must run:

- the complete automated test suite;
- the production build.

Additional linting or type checks may be useful, but they do not replace behavioural tests.

CI should make old-test disappearance visible. A green run achieved by renaming tests out of discovery is a failure.

## Manual review

Automated tests cannot judge whether permanent nanite conversion feels understandable or worthwhile.

A focused playtest should answer:

- Did the first physical research commitment feel surprising, exciting or merely punitive?
- Was the lost operating capacity legible?
- Did the displayed estimate respond understandably to growth and installed memory?
- Did the player know why a topic appeared?
- After gold exhaustion, was the next meaningful action clear?
- Did research feel like building a synthetic mind rather than buying upgrades?

Capture the save, chosen path, observed times and player interpretation. Feed those observations back into calibration rather than immediately hard-coding a new global multiplier.

## Release evidence

Before merge, provide:

- the final decision record;
- the catalogue disposition map;
- balance evidence for the initial playable topics;
- passing conservation, determinism, migration and gold-famine scenarios;
- full existing-suite and production-build results;
- manual playtest notes for the opening and Stage 2 transition;
- a list of deliberately deferred questions.

Research v2 should be blocked only by failures that threaten correctness, migration, progression or the intended player experience—not by absence of every hypothetical micro-test listed in an earlier planning draft.

