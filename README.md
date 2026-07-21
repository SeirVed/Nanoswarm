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

The mass-horizon workbench is available at `http://127.0.0.1:4173/horizon-planner/`. It authors the complete 0.1 g–1 Gt pathway, stage assignments, observations, discoveries, research opportunities, source-specific Residuum, losses, and strategy-dependent human response. It also exposes the current research-empty bridge after Relative Directive Allocation for review.

## Play online

The `main` branch deploys automatically to GitHub Pages:

`https://seirved.github.io/Nanoswarm/`

The deployment workflow builds the dependency-free static site, uploads `dist/`, and publishes it through GitHub Pages. Each browser keeps an independent local save.

## Simulation rules

- Nanites are whole `bigint` counts; production never uses fractional workers.
- Work is represented by cohorts with exact start and completion times.
- Allocation cohorts begin on a 500 ms synchronization boundary and wait briefly for nearby same-directive phases to resonate together.
- Inputs are reserved at job start and outputs appear atomically at completion.
- Matter is stored as exact constituent-atom inventories. Collection does not identify it.
- Sorting transfers the seed-catalogued C/Si/Cu/Au atoms to storage and physically retains every other element by its hidden identity inside Residuum.
- The initial 0.1 g contact contains exactly 702,327,557,648,247,539 whole nanite recipes. Later authored shells add 0.9 g of damaged DRAM package, 9 g of circuit board, 90 g of motherboard and 900 g of PC chassis with fixed real-world-inspired compositions.
- Exhausted shells expose a discrete local survey in the substrate panel, including its committed workforce and live timer rather than an operational cohort slot.
- Reaching the chassis begins Stage 2 and identifies atmosphere as inexhaustible external feedstock at exactly 1% of effective solid collection throughput.
- Offline progress calls the same event-jumping simulation used while the page is open.
- UI controls issue commands; they never mutate resources directly.
- Saves use an explicit version and a BigInt-aware codec. Version 12 migrates legacy research reservations into unreserved intent and introduces physical mnemonic banks.
- Research never consumes loose elemental inventory. Bootstrap control routines cost time and energy only; later topics permanently convert fixed active-nanite populations into mnemonic substrate attached to the computronium core.
- Research capacity is the fixed Bootstrap Archive plus the active writable bank and a fraction of installed mnemonic substrate. The former `max(100, 1% of swarm)` rule and temporary Research allocation directive are removed.
- Parallel Directive Scheduling is the sole initial research signal. Relative Directive Allocation remains population-free; Cohort Ratio Prognostics is the first physical 16-nanite memory bank.
- Additional queued topics reserve nothing and do not begin automatically after the active bank completes.
- At 180 nanites, Cohort Ratio Prognostics exposes replication efficiency, bottleneck diagnosis, substrate-conversion projections, and Temporary Burst control.
- Replication batches partial inputs for up to five seconds while upstream payloads converge. Temporary Burst may hold normal replication until its minimum buffer exists, then restores prior shares and locks.
- Completed research modifies authoritative capacity functions used when new cohorts reserve payloads; already-running cohorts retain the recipe and output with which they began.
- Throughput development is a ladder of additive 5% refinements, with one new tier exposed per authored material horizon.
- Whole counts use `10^x` notation above 100 million. Energy advances through SI units at six significant digits, and every numeric matter inventory includes estimated physical mass.
- Active cohort summaries expose approximate per-second flow without turning discrete jobs into continuous production.
- Sound is synthesized live with Web Audio and never affects authoritative state.

See `docs/architecture.md` for the model boundary and extension rules.

See `docs/research-v2.md` for the computronium and mnemonic-substrate research model.

See `docs/design-goals.md` and `docs/horizon-roadmap.md` for the approved long-horizon direction.
