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
- Exhausted shells expose a discrete local survey job. Success advances outward through the nested object without generating or repeating arbitrary deposits.
- Reaching the chassis begins Stage 2 and identifies atmosphere as inexhaustible external feedstock at exactly 1% of effective solid collection throughput; Atmospheric Spectroscopy later resolves its nitrogen, oxygen, argon and carbon signatures without pretending industrial recovery is already solved.
- Offline progress calls the same event-jumping simulation used while the page is open.
- Long offline spans are bounded by actual event progress rather than an arbitrary completion count, so a busy returning swarm is not rejected merely for completing many valid jobs.
- UI controls issue commands; they never mutate resources directly.
- Saves use an explicit version and a BigInt-aware codec. Version 9 expands old generic matter into the full hidden-element ledger without inventing identities for legacy `unknown` atoms.
- Log entries carry a significance tier independently of their visual tone. World, critical, and medium events remain permanent; only routine info events roll off after the newest 200. Old saves infer tiers during migration.
- Parallel Directive Scheduling is the sole initial research signal and takes four minutes on the embedded 100 n-eq seed reasoning substrate. Research appears with the second nanite and Stage 1; at 12 nanites it reveals Relative Directive Allocation, and every other research signal requires both roots. The research header deliberately withholds the catalog-wide completion fraction.
- Allocation step buttons support accelerating press-and-hold input. Percentage fields retain focus and uncommitted text when an unrelated cohort completion refreshes the dashboard.
- One-by-one allocation omits percentage locks. Once Relative Directive Allocation is complete, new nanites automatically enter target shares and locks protect selected directives.
- The operations panel keeps discovered replication, collection, sorting, and miscellaneous work in fixed slots without exposing unknown jobs. Structural refreshes preserve the page scroll position.
- The replication directive owns the nanite recipe readout and reports exact resource shortages whenever assigned production cannot launch.
- Every manageable control, intro telemetry line, running-log event, timer, resource card, and key status readout exposes a verbose contextual tooltip after a 1.5-second hover. Stable semantic tooltip identities and generic focus restoration preserve the player's inspection or keyboard position across job-completion renders.
- Newly revealed panels, directives, elements, projects, and research signals pulse until clicked. Acknowledgements persist in current saves, while migration treats features visible in older saves as already seen.
- The ◈ brand control enters feedback-selection mode. The next interface click opens an in-game report form with semantic element context and optional non-save diagnostics, then opens a prefilled public `SeirVed/Nanoswarm` GitHub issue for the player to review and submit.
- Research is split into incomplete and complete views. Long work estimates use live reasoning capacity, so replication and explicit research allocation can collapse days into minutes without changing the job's required work.
- Research inputs remain reserved while queued. Queue entries can be reordered or cancelled; cancellation discards work performed on that topic and releases its full reserved material and energy cost.
- Throughput development is a ladder of additive 5% refinements rather than a handful of giant multipliers. Each authored material search exposes at most one tier from a branch: the 0.9 g field permits Tier I, 9 g permits Tier II, 90 g permits Tier III, and the 900 g chassis permits Tier IV. Later tiers remain hidden until later environmental horizons exist.
- Research cards state the observation that caused the swarm to formulate them. Residuum Indexing precedes distinct chassis-scale Ferromagnetic Phase Analysis and Atmospheric Spectroscopy signals, while the former Distributed Computronium node is now Distributed Reasoning Mesh so computronium remains reserved for the endgame compound.
- Specialized Morphologies I is behavioural only: it establishes persistent directive roles, uses only carbon, silicon, copper and gold, grants no throughput bonus, and leaves the universal nanite recipe unchanged. Physical specialist bodies are deferred to later tiers.
- Whole counts use `10^x` notation above 100 million. Energy advances through SI units at six significant digits, and every numeric matter inventory includes its estimated physical mass from yoctograms upward.
- Active cohort summaries expose approximate per-second material, energy, or nanite flow without turning the underlying discrete jobs into continuous production.
- Sound is synthesized live with Web Audio. Job ratios select the harmonic field, while digits of π and e govern its pulse and drift; no recorded soundtrack or audio dependency is shipped.

See `docs/architecture.md` for the model boundary and extension rules.
