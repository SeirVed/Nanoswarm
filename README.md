# NanoSwarm

NanoSwarm is a long-horizon incremental game about rebuilding a stranded nanite seed into an industrial and eventually interstellar swarm.

The current playable slice begins with the seed's deep-time arrival, then reveals the interface only as the player discovers it: one active assembler, a recipe-perfect impact-fused DDR3 contact, nested electronic and chassis material shells, collection, Feedstock, exact elemental sorting, Residuum, energy acquisition, replication, cohort allocation, research, atmospheric harvesting, and the first distant project. The running log separates permanent significant events from a rolling 200-item routine record, while the operations display consolidates nearby cohort phases into fixed directive slots.

## Run locally

NanoSwarm currently has no external runtime or build dependencies. Node.js 18 or newer is sufficient.

```text
npm run dev
npm test
npm run build
```

Open `http://127.0.0.1:4173` after starting the development server. The production-ready static files are emitted to `dist/`.

The research workbench is available at `http://127.0.0.1:4173/research-planner/`. It loads the live catalogue, supports zooming, panning, draggable layouts, editable dependencies, observation/stage/search gates and freeform suggestions, retains drafts in browser storage, and exports either a compact review diff or the full plan as JSON.

The mass-horizon workbench is available at `http://127.0.0.1:4173/horizon-planner/`. It authors the complete 0.1 g–1 Gt pathway, stage assignments, observations, discoveries, research opportunities, source-specific Residuum, losses, and strategy-dependent human response.

Research v2 is live. Its design history remains in [`docs/research-mnemonic-substrate.md`](docs/research-mnemonic-substrate.md), the implementation boundary is described in [`docs/research-v2-implementation-handoff.md`](docs/research-v2-implementation-handoff.md), and [`docs/README.md`](docs/README.md) identifies the status of every design document.

The proposed replacement for unrestricted linear energy acquisition is documented in [`docs/energy-locality-storage-and-thermal-model.md`](docs/energy-locality-storage-and-thermal-model.md). It treats per-nanite yield as a microscopic processing ceiling while local source power, accessible interface, transmission, storage and heat rejection constrain total realised power.

## Play online

The `main` branch deploys automatically to GitHub Pages:

`https://seirved.github.io/Nanoswarm/`

The deployment workflow builds the dependency-free static site, uploads `dist/`, and publishes it through GitHub Pages. Each browser keeps an independent local save.

## Current playable simulation rules · save version 12

- Nanites are whole `bigint` counts; production never uses fractional workers.
- Work is represented by cohorts with exact start and completion times.
- Allocation cohorts begin on a 500 ms synchronization boundary and wait briefly for nearby same-directive phases to resonate together.
- Inputs are reserved at job start and outputs appear atomically at completion.
- Matter is stored as exact constituent-atom inventories. Collection does not identify it.
- Sorting transfers currently catalogued elements to storage and physically retains every other solid element by hidden identity inside Residuum. Ferromagnetic Phase Analysis adds iron to that catalogue; existing iron must then be physically re-sorted.
- The initial 0.1 g contact contains exactly 702,327,557,648,247,539 whole nanite recipes. Later authored shells add 0.9 g of damaged DRAM package, 9 g of circuit board, 90 g of motherboard and 900 g of PC chassis with fixed real-world-inspired compositions.
- Exhausted shells expose a discrete local survey in the substrate panel, including its committed workforce and live timer rather than an operational cohort slot. The four authored searches commit 0.5%, 1%, 2%, and 4% of the current swarm for 30, 45, 60, and 90 seconds respectively, while the solitary seed's first close survey remains one nanite. Success advances outward through the nested object without generating or repeating arbitrary deposits; later local-area biomass searches or hunting parties remain candidates for true operational directives.
- Reaching the chassis begins Stage 2 and identifies atmosphere as an inexhaustible gas source at exactly 1% of solid collection throughput. Gas enters a separate Captured Atmosphere inventory, never solid Feedstock or Residuum. Spectroscopy reveals N/O/Ar/C signatures; Atmospheric Fractionation separates future captures into elemental stockpile.
- Offline progress calls the same event-jumping simulation used while the page is open.
- Long offline spans are bounded by actual event progress rather than an arbitrary completion count, so a busy returning swarm is not rejected merely for completing many valid jobs.
- UI controls issue commands; they never mutate resources directly.
- Saves use an explicit version and a BigInt-aware codec. Version 12 is a deliberate physical-law boundary: prior saves receive a red retired-node screen, may export a PNG tombstone with compact metadata, and must restart.
- Log entries carry a significance tier independently of their visual tone. World, critical, and medium events remain permanent; only routine info events roll off after the newest 200.
- Parallel Directive Scheduling is the sole initial research signal and takes four minutes on the embedded 100 n-eq seed reasoning substrate. Research appears with the second nanite and Stage 1; at 12 nanites it reveals Relative Directive Allocation, and every other research signal requires both roots. The research header deliberately withholds the catalog-wide completion fraction.
- Allocation step buttons support accelerating press-and-hold input. Percentage fields retain focus and uncommitted text when an unrelated cohort completion refreshes the dashboard.
- One-by-one allocation omits percentage locks. Once Relative Directive Allocation is complete, new nanites automatically enter target shares and locks protect selected directives.
- The operations panel keeps discovered replication, collection, sorting, and miscellaneous work in fixed slots without exposing unknown jobs. Structural refreshes preserve the page scroll position.
- The replication directive owns the nanite recipe readout, reports the exact population unable to begin, and distinguishes a sufficient upstream pipeline from a genuine material halt.
- At 180 nanites, Cohort Ratio Prognostics turns the swarm's growing self-model into a live comparison between current and coherent substrate-conversion ETAs. It also adds a current-growth-curve exhaustion ETA to the active substrate. Completing it exposes the exact replication-efficiency score, current bottleneck, complete-recipe buffer, and potential speed multiplier.
- Replication batches partial inputs for up to five seconds while upstream payloads are already converging, reducing phase fragmentation without delaying an isolated complete launch. After 30 seconds at 99% efficiency, Temporary Burst can enter a charging state that holds normal replication until its 1%-of-swarm minimum buffer exists; it then reserves every complete recipe, deploys them through replication, and restores the exact previous shares and locks.
- Every manageable control, intro telemetry line, running-log event, timer, resource card, and key status readout exposes a verbose contextual tooltip after a 1.5-second hover. Stable semantic tooltip identities and generic focus restoration preserve the player's inspection or keyboard position across job-completion renders.
- Newly revealed panels, directives, elements, projects, and research signals pulse until clicked. Acknowledgements persist in current saves, while migration treats features visible in older saves as already seen.
- The ◈ brand control enters feedback-selection mode. The next interface click opens an in-game report form with semantic element context and optional non-save diagnostics, then opens a prefilled public `SeirVed/Nanoswarm` GitHub issue for the player to review and submit.
- Research is split into incomplete and complete views. Parallel Directive Scheduling and Relative Directive Allocation are restored firmware: they require work but no physical inputs.
- Post-bootstrap research converts a fixed number of idle active nanites into a permanent mnemonic bank, spends facilitation energy when formation begins, and retains a fixed nanite-work requirement. Waiting queue intent commits nothing and may be reordered or removed; active formation is irreversible but pausable.
- Research capacity is exactly the fixed 100 n-eq seed core, genuinely available assigned researchers, and 1% of installed mnemonic banks. Active nanites provide no passive percentage.
- A bank may not consume more than the largest single-digit quantity one exponent below the current active swarm. Falling below an order-of-magnitude boundary can therefore make a waiting project temporarily unstartable.
- The generated +5% tier ladders are removed. The playable catalogue contains only individually authored opening capabilities; later research with unauthored physical prerequisites remains outside the runtime catalogue.
- Research cards state the observation that caused the swarm to formulate them. Residuum Indexing precedes distinct chassis-scale Ferromagnetic Phase Analysis and Atmospheric Spectroscopy signals.
- Whole counts use `10^x` notation above 100 million. Energy advances through SI units at six significant digits, and every numeric matter inventory includes its estimated physical mass from yoctograms upward.
- Active cohort summaries expose approximate per-second material, energy, or nanite flow without turning the underlying discrete jobs into continuous production.
- Sound is synthesized live with Web Audio. Job ratios select the harmonic field, while digits of π and e govern its pulse and drift; no recorded soundtrack or audio dependency is shipped.

See [`docs/README.md`](docs/README.md) for the documentation source-of-truth index.

See `docs/architecture.md` for the current model boundary and extension rules.

See `docs/design-goals.md`, `docs/horizon-roadmap.md`, `docs/roadmap.md`, `docs/stage-2-industrial-transition.md` and `docs/energy-locality-storage-and-thermal-model.md` for the working long-horizon direction and implementation roadmap.
