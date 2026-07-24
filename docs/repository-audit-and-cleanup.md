# Repository audit and cleanup plan

## Status

Repository continuity audit completed against `main`, draft PR #3 and draft PR #4.

This document records findings and required disposition. It does not itself alter playable runtime behaviour.

## Executive summary

The `main` branch is compact and mostly contiguous. The principal problems are:

1. an obsolete research-gap review distributed across design data, UI, roadmap prose and tests;
2. one unlinked historical prototype document with outdated research wording;
3. no test run in the current `main` Pages workflow;
4. contradictory documentation while Research v2 is approved but not implemented;
5. draft PR #3, a green-CI implementation spike that duplicates the runtime, weakens regression discovery and violates the event-loop architecture.

The correct implementation path is clean `main` plus the approved Research v2 specifications in PR #4. PR #3 is reference material only.

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
- `storage-legacy.js`
- `app-legacy.js`
- `simulation-legacy.js`

The replacement entry modules then wrap, re-export or post-process those copies. This creates two overlapping architectures in the shipped source tree.

The final implementation must instead modify the current files directly.

### Deterministic event-loop violation

PR #3 advances the legacy simulation to the target timestamp first and advances mnemonic research afterward.

That means a research project completing partway through a long online or offline interval cannot affect work launched after its true completion time inside the same interval. The result can differ from stepping through the interval in smaller increments.

Research completion must be an event inside the same event-jumping loop as cohort completion.

### Global mutable state channel

PR #3 publishes authoritative state through `globalThis.__nanoswarmState` and uses UI-side in-place replacement.

This breaks the intended command boundary and makes testing, rendering and future concurrency harder to reason about. The final implementation must preserve the existing pattern:

```text
UI command
  -> validated simulation operation
  -> returned authoritative state
  -> render
```

### DOM post-processing

PR #3 loads the old application and then uses a `MutationObserver` to rewrite the research panel after each render.

This is temporary scaffolding, not acceptable permanent UI architecture. Research v2 must be rendered natively by `src/ui/app.js` and supported directly by the tooltip, focus and unlock systems.

### Regression-suite displacement

PR #3 renames the existing large `tests/simulation.test.js` suite to `tests/simulation-legacy.js` and replaces it with a much smaller Research v2 suite.

The repository runs `node --test`; a file named `simulation-legacy.js` is not a reliable test-discovery target. A green workflow can therefore omit most historical simulation coverage.

Required rule:

> Preserve every existing test under its discoverable `.test.js` filename and add Research v2 tests alongside it.

### Unconverted coupling points

PR #3 does not cleanly update all systems tied to the old research model:

- audio still models research as an allocated workforce and proportional seed-reasoning share;
- general tooltips still describe immediate atom and energy reservations;
- the research planner still edits C, Si, Cu and Au costs;
- the old application still renders the previous research structure before being patched;
- documentation and implementation are split between multiple Research v2 files.

### Required disposition

- Close PR #3 as superseded after PR #4 contains the full handoff.
- Do not merge its `*-legacy.js` files.
- Do not base a new branch on `agent/mnemonic-research`.
- Copy individual test ideas only after re-deriving them against clean `main`.

---

## Finding B — stale research-empty bridge material

Cohort Ratio Prognostics now fills the earlier coordination gap and provides replication forecasting. Several files still describe that gap as unresolved.

### Stale locations

- `README.md`
  - says the mass-horizon workbench exposes a research-empty bridge after Relative Directive Allocation;
- `src/design/horizons.js`
  - `DEFAULT_BRIDGE_REVIEW` says no topic appears until material search 1;
  - still lists Replication Forecasting as an unapproved candidate;
- `src/ui/horizon-planner.js`
  - displays an `OPEN BRIDGE REVIEW` panel based on the obsolete text;
- `docs/roadmap.md`
  - retains an unchecked task to review or fill the bridge;
- `tests/horizons.test.js`
  - asserts that the obsolete review string remains present.

### Required cleanup

1. Remove `DEFAULT_BRIDGE_REVIEW` from canonical design data, or replace it with a current open question that is not already solved.
2. Remove the bridge panel from the horizon planner unless a new unresolved design review is approved.
3. Update the README workbench description.
4. Mark the old roadmap item completed or replace it with the next genuine progression question.
5. Replace the test with assertions about the actual Cohort Ratio Prognostics placement or remove the obsolete string test.

### Acceptance criterion

No player-facing or author-facing surface may claim that the interval after Relative Directive Allocation is empty.

---

## Finding C — historical prototype audit is orphaned

### File

`docs/prototype-audit.md`

### Current state

- useful provenance record;
- not linked from the repository README;
- says instant upgrades were replaced by resource-funded research queue jobs;
- that research statement is historical after Research v2 approval.

### Required cleanup

Preferred treatment:

1. keep the document;
2. label it clearly as historical;
3. revise the research line to explain that the first rebuild used resource-funded queues and Research v2 later replaced that economy;
4. link it through `docs/README.md`, not necessarily the top-level README.

Deletion is not required because it documents why the Lovable prototype was not imported.

---

## Finding D — roadmap discoverability

`docs/roadmap.md` is an active implementation checklist but is not linked from the top-level README.

`docs/horizon-roadmap.md` is a separate human-readable mass progression. The two files are not duplicates:

- `roadmap.md` tracks implementation work;
- `horizon-roadmap.md` explains the mass/stage path.

Both should remain, but the documentation index must distinguish them.

---

## Finding E — CI on main does not run tests

The current Pages workflow builds and deploys but does not execute `npm test`.

### Required change

Add a normal test workflow or add test execution before the Pages build.

Recommended structure:

```yaml
on:
  push:
    branches: [main, "agent/**"]
  pull_request:

steps:
  - checkout
  - setup Node
  - npm test
  - npm run build
```

Test logs may be uploaded as a short-lived artifact on failure.

### Acceptance criterion

Every pull request and every push to `main` must run both the entire test suite and production build.

---

## Finding F — approved and current research documentation conflict

Until Research v2 is implemented:

- `main` accurately documents the old atom-funded research system;
- PR #4 accurately documents the approved replacement;
- readers can mistake both for simultaneously current behaviour.

### Required documentation convention

Use explicit status labels:

- **Current implementation — save v11**
- **Approved replacement — Research v2 / save v12**

When Research v2 lands, update in the same PR:

- top-level README;
- `docs/architecture.md`;
- `docs/roadmap.md`;
- research planner labels and fields;
- tooltips;
- audio activity description;
- save-version notes;
- any prototype or historical document that makes a present-tense claim.

---

## Finding G — PR #4 final tree is clean but history is noisy

PR #4's final tree initially contained only:

- the README link;
- `docs/research-mnemonic-substrate.md`.

During connector work, temporary helper and placeholder files were created and deleted. Nothing remains in the final tree, but the branch history contains incidental commits.

### Required disposition

Squash PR #4 when merging, or let the final implementation branch absorb the documents and produce a clean intentional history.

---

## Repository material judged contiguous

The following are connected and should not be treated as random debris:

- `research-planner/` and `src/ui/research-planner.*` — linked from README and copied by build;
- `horizon-planner/` and `src/ui/horizon-planner.*` — linked from README and copied by build;
- `src/design/horizons.js` — canonical structured horizon draft;
- `src/audio/*` — used by the synthetic-mind system;
- `src/ui/cohort-groups.js`, `feedback.js`, `tooltips.js` — connected UI modules with tests;
- `AGENTS.md` — root contributor guidance, intentionally not player-facing;
- `.github/workflows/pages.yml` — active GitHub Pages deployment;
- `docs/design-goals.md`, `horizon-roadmap.md`, `roadmap.md` — different purposes, not duplicates.

No imported Lovable source tree, generated component library, committed `dist`, `node_modules`, random binary assets or incomplete helper script remains on `main`.

---

## Cleanup execution order

1. Preserve and merge the approved documentation set from PR #4.
2. Close PR #3 as superseded.
3. Start the actual implementation from clean `main`, not either wrapper branch.
4. Add CI test/build coverage before or with the implementation.
5. Remove obsolete bridge-review data, UI and tests.
6. Implement Research v2 directly in existing simulation modules.
7. Update all coupled UI, planner, audio, tooltip and documentation surfaces.
8. Preserve all historical regression tests and add the Research v2 suite.
9. Run full tests and build.
10. Squash incidental documentation-connector commits before merge.

## Definition of done

The repository is considered contiguous when:

- only one authoritative implementation of each runtime module is shipped;
- no `*-legacy.js` runtime copies exist as compatibility scaffolding;
- every approved mechanic has one clear source-of-truth document;
- current and future behaviour are explicitly distinguished until implementation;
- no stale bridge review is visible or test-pinned;
- all tests remain discoverable;
- CI runs tests and build;
- Research v2 is integrated into the event loop rather than applied afterward;
- top-level documentation links the active design, roadmap and handoff material.
