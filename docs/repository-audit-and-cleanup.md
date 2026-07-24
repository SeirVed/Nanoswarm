# Repository audit and cleanup plan

## Status

Repository continuity audit completed against `main`, draft PR #3 and draft PR #4.

This document records findings and required disposition. It does not itself alter playable runtime behaviour.

## Executive summary

The `main` branch is compact and mostly contiguous. The principal problems are:

1. an obsolete research-gap review distributed across design data, UI, roadmap prose and tests;
2. one unlinked historical prototype document with outdated research wording;
3. no test run in the current `main` Pages workflow;
4. contradictory documentation while Research v2 is exploratory but was presented as approved;
5. draft PR #3, a green-CI implementation spike that duplicates the runtime, weakens regression discovery and violates the event-loop architecture.

The correct implementation path is clean `main` plus design decisions that have been validated from the Research v2 planning material in PR #4. PR #3 is reference material only.

---

## Finding A — PR #3 is a superseded implementation spike

### Pull request

- PR: `#3 Replace research costs with mnemonic banks`
- Branch: `agent/mnemonic-research`
- Status: open draft
- Disposition: **close as superseded; do not merge**

### Useful material that may be consulted

PR #3 contains some ideas worth retaining as examples:

- version 11 queue refunds during save migration;
- zero-gold chassis regression scenarios;
- last-active-nanite protection;
- fixed mnemonic footprint conversion;
- explicit waiting research start;
- bootstrap research with zero population cost;
- a CI workflow that runs both tests and build.

These ideas must be reimplemented cleanly rather than copied wholesale.

### Rejected architecture

PR #3 preserves the previous runtime and tests in files such as:

- `content-legacy.js`
- `engine-legacy.js`
- `state-legacy.js`
- `storage-legacy.js`…13714 tokens truncated…comes. Snapshotting large HTML fragments is unlikely to be useful.

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
