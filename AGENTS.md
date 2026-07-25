# NanoSwarm contributor guidance

- Treat `src/game/` as the authoritative deterministic simulation.
- UI code may issue commands and render state; it must never award resources directly.
- Nanites, atoms, energy, research work, and job counts remain whole `bigint` values.
- Inputs are reserved when a cohort begins. Outputs are applied atomically at completion.
- Online and offline progress must call the same event-jumping simulation.
- Preserve matter exactly across deposits, Feedstock, in-flight payloads, identified storage, and Residuum.
- Add or update tests whenever simulation rules change.
- Do not add a runtime dependency without a concrete need and an explicit architectural decision.

## APEX change protocol

Every change must pass APEX before it reaches GitHub:

### A — Assess the exact scope

- Identify the smallest set of files and behaviours required by the request.
- Treat unrelated edits, formatting changes, line-ending changes, renames, generated-file churn, and speculative cleanup as out of scope.
- Preserve existing user changes. If required work overlaps unclear or unrelated changes, stop and inspect before editing.
- Set an expected diff shape before implementation. If the observed diff is materially larger or touches unexpected files, do not publish it.

### P — Patch minimally

- Use targeted patches. Do not rewrite a whole file when a local edit is sufficient.
- Preserve each file's encoding, newline style, structure, and surrounding formatting.
- Change documentation only when requested or when an existing statement would become materially false.
- Change tests only with focused coverage for changed behaviour; never use test rewrites to disguise a broad implementation diff.
- Avoid compatibility scaffolding, migrations, or refactors unless the requested behaviour actually requires them.

### E — Execute proportional verification

- Inspect `git status`, `git diff --check`, `git diff --stat`, and the full relevant diff.
- Run syntax checks, focused tests, the full suite, and the production build in proportion to the change's risk.
- Verify authoritative simulation invariants: discrete jobs, exact reservations, whole outputs, deterministic event progression, and matter conservation.
- A passing build is not proof of a valid browser module. Run an explicit syntax check for edited JavaScript entry points.
- Do not report completion while an expected check is failing or while the checked source differs from the source intended for publication.

### X — eXamine and publish atomically

- Publish one coherent, reviewable commit based on the current remote head.
- Never publish large source files through a transport that can truncate, reformat, or silently normalize them.
- When normal Git push is unavailable, construct the commit from complete Git blobs and verify every remote blob SHA against the tested local Git blob SHA before moving a branch ref.
- Never update production source file-by-file when intermediate commits could be deployed.
- Before moving the ref, compare the proposed commit with its parent and confirm the exact files and addition/deletion counts match the expected diff.
- After publishing, compare remote `main` with the intended base, confirm it is one commit ahead when appropriate, and verify the deployed site uses the resulting release.
- If any upload, hash, diff, build, or deployment check is uncertain, restore the last known-good release and stop. Do not improvise on production.

## Communication discipline

- Keep progress updates concise and report outcomes rather than dumping command output.
- Do not make the user spend context on large diffs, generated files, or tool noise.
- State the exact files changed, the final diff size, the checks run, and the published commit.
- Never claim that code is live or fixed until the corresponding remote and deployment checks support that claim.
