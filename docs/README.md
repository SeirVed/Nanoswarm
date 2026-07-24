# NanoSwarm documentation index

This directory contains several kinds of material. Their status matters.

## Status vocabulary

- **Current implementation** — describes behaviour present on `main` and expected to be covered by tests.
- **Approved design** — a decision that supersedes current behaviour but has not necessarily been implemented yet.
- **Implementation handoff** — concrete instructions and acceptance criteria for changing the playable code.
- **Roadmap** — planned work that remains open to sequencing and balance changes.
- **Historical** — provenance or discarded approaches retained for context; never use as current architecture.
- **Audit** — repository continuity findings, stale material, and required cleanup.

## Authoritative documents

| Document | Status | Purpose |
|---|---|---|
| [`architecture.md`](architecture.md) | Current implementation until Research v2 lands | Deterministic simulation boundary, matter conservation, cohorts, saves, research and presentation rules. Its research section must be replaced during the Research v2 implementation. |
| [`design-goals.md`](design-goals.md) | Approved design | Long-horizon design principles: discovery before capability, exact matter, earned chemistry, universal base nanites, entropy and strategy-sensitive human response. |
| [`horizon-roadmap.md`](horizon-roadmap.md) | Approved design overview | Human-readable seven-stage, seventeen-horizon mass progression. |
| [`../src/design/horizons.js`](../src/design/horizons.js) | Editable canonical design data | Structured horizon data used by the mass-horizon workbench. The obsolete bridge-review text is identified for removal in the repository audit. |
| [`roadmap.md`](roadmap.md) | Roadmap | Active implementation checklist. It should be kept aligned with approved design decisions and linked from the repository README. |
| [`research-mnemonic-substrate.md`](research-mnemonic-substrate.md) | Approved design | Full Research v2 model: bootstrap archive, mnemonic banks, energy, catalogue conversion, lifecycle, UI, save migration and Stage 2 consequences. |
| [`research-v2-catalogue-conversion.md`](research-v2-catalogue-conversion.md) | Approved design / implementation handoff | Explicit conversion matrix for all 51 currently generated research IDs, including fixed memory footprints, baseline compute and provisional future tiers. |
| [`research-v2-implementation-handoff.md`](research-v2-implementation-handoff.md) | Implementation handoff | Required code architecture, affected files, event ordering, migration behaviour and completion criteria for the Work chat or developer implementing Research v2. |
| [`research-v2-regression-plan.md`](research-v2-regression-plan.md) | Implementation handoff | Required tests, especially deterministic event interleaving and the zero-gold chassis progression case. |
| [`stage-2-industrial-transition.md`](stage-2-industrial-transition.md) | Approved design | The phase change from alien nanite replication to larger, slower chemical and mechanical production systems. |
| [`repository-audit-and-cleanup.md`](repository-audit-and-cleanup.md) | Audit | Findings from the repository continuity review, including stale bridge material, orphaned documentation, CI gaps and the unsafe PR #3 implementation spike. |
| [`prototype-audit.md`](prototype-audit.md) | Historical | Record of what was and was not retained from the Lovable prototype. Its old resource-funded research wording is historical, not current design. |

## Branch and pull-request authority

- `main` is the current playable implementation.
- Draft PR #4, branch `agent/research-mnemonic-substrate`, is the approved documentation and implementation-handoff branch for Research v2.
- Draft PR #3, branch `agent/mnemonic-research`, is a superseded implementation spike. It may be consulted for isolated migration ideas and test scenarios, but it must not be merged or used as the base of the final implementation.

PR #3 duplicates the runtime into `*-legacy.js` files, advances legacy simulation and mnemonic research in separate passes, patches the UI after render through a `MutationObserver`, exposes state through `globalThis`, and sidelines much of the existing regression suite. These are explicitly rejected implementation patterns.

## Source-of-truth rules

1. The deterministic simulation remains authoritative. UI code issues commands and renders returned state.
2. Approved design documents supersede contradictory roadmap notes or historical prose.
3. A new implementation must modify the existing modules directly. Do not preserve old runtime copies inside the shipped tree.
4. Existing regression tests remain active. New tests are added alongside them rather than replacing or renaming them out of discovery.
5. Research v2 must be integrated into the same event-jumping loop as cohorts. A second post-processing simulation pass is invalid.
6. Documentation that describes removed mechanics must be updated in the same implementation PR.
7. Before merging a broad design branch, squash incidental connector commits so the final history reflects intentional changes.
