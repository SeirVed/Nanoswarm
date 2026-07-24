# NanoSwarm documentation index

This directory contains several kinds of material. Their status matters.

## Status vocabulary

- **Current implementation** — describes behaviour present on `main` and expected to be covered by tests.
- **Working design** — promising direction that still contains unresolved product or balance questions.
- **Validated decision** — a choice supported by evidence and ready to constrain implementation.
- **Implementation design brief** — architectural boundaries, risks and sequencing; not permission to copy unvalidated values.
- **Roadmap** — planned work that remains open to sequencing and balance changes.
- **Historical** — provenance or discarded approaches retained for context; never use as current architecture.
- **Audit** — repository continuity findings, stale material, and required cleanup.

## Authoritative documents

| Document | Status | Purpose |
|---|---|---|
| [`architecture.md`](architecture.md) | Current implementation | Deterministic simulation boundary, matter conservation, cohorts, saves, research and presentation rules. Update its research section only when a replacement is validated and implemented. |
| [`design-goals.md`](design-goals.md) | Working design principles | Long-horizon principles: discovery before capability, exact matter, earned chemistry, universal base nanites, entropy and strategy-sensitive human response. Individual quantities still require validation. |
| [`horizon-roadmap.md`](horizon-roadmap.md) | Working design overview | Human-readable long-horizon mass progression. Treat stage boundaries and quantities as planning until modelled. |
| [`../src/design/horizons.js`](../src/design/horizons.js) | Editable canonical design data | Structured horizon data used by the mass-horizon workbench. The obsolete bridge-review text is identified for removal in the repository audit. |
| [`roadmap.md`](roadmap.md) | Roadmap | Active implementation checklist. Keep validated decisions distinct from exploratory design work. |
| [`research-mnemonic-substrate.md`](research-mnemonic-substrate.md) | Working design | Purified Research v2 principles, confidence levels, open decisions and balance-evidence requirements. |
| [`research-v2-catalogue-conversion.md`](research-v2-catalogue-conversion.md) | Working inventory and calibration method | Catalogue families, audit template and evidence required before assigning any cost. Earlier linear values are withdrawn. |
| [`research-v2-implementation-handoff.md`](research-v2-implementation-handoff.md) | Implementation design brief | Architectural boundaries, affected systems and a risk-oriented development sequence without premature schema or balance mandates. |
| [`research-v2-regression-plan.md`](research-v2-regression-plan.md) | Verification charter | Critical risks, representative scenarios and release evidence without micromanaging individual tests. |
| [`stage-2-industrial-transition.md`](stage-2-industrial-transition.md) | Working design | Candidate phase change from alien nanite replication to larger, slower chemical and mechanical production systems. |
| [`repository-audit-and-cleanup.md`](repository-audit-and-cleanup.md) | Audit | Findings from the repository continuity review, including stale bridge material, orphaned documentation, CI gaps and the unsafe PR #3 implementation spike. |
| [`prototype-audit.md`](prototype-audit.md) | Historical | Record of what was and was not retained from the Lovable prototype. Its old resource-funded research wording is historical, not current design. |

## Branch and pull-request authority

- `main` is the current playable implementation.
- Draft PR #4, branch `agent/research-mnemonic-substrate`, is the working planning branch for Research v2. Its structural ideas and all quantities remain subject to review.
- Draft PR #3, branch `agent/mnemonic-research`, is a superseded implementation spike. It may be consulted for isolated migration ideas and test scenarios, but it must not be merged or used as the base of the final implementation.

PR #3 duplicates the runtime into `*-legacy.js` files, advances legacy simulation and mnemonic research in separate passes, patches the UI after render through a `MutationObserver`, exposes state through `globalThis`, and sidelines much of the existing regression suite. These are explicitly rejected implementation patterns.

## Source-of-truth rules

1. The deterministic simulation remains authoritative. UI code issues commands and renders returned state.
2. Current implementation documents describe the game as shipped. Working design documents influence future work but do not supersede code until a decision is validated and implemented.
3. A new implementation must modify the existing modules directly. Do not preserve old runtime copies inside the shipped tree.
4. Existing regression tests remain active. New tests are added alongside them rather than replacing or renaming them out of discovery.
5. Research v2 must be integrated into the same event-jumping loop as cohorts. A second post-processing simulation pass is invalid.
6. Documentation that describes removed mechanics must be updated in the same implementation PR.
7. Before merging a broad design branch, squash incidental connector commits so the final history reflects intentional changes.
