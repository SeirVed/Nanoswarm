# NanoSwarm

NanoSwarm is a long-horizon incremental game about rebuilding a stranded nanite seed into an industrial and eventually interstellar swarm.

The current playable slice begins with the seed's deep-time arrival, then reveals the interface only as the player discovers it: one active assembler, a physically scaled DDR3 package, collection, Feedstock, exact elemental sorting, Residuum, energy acquisition, replication, cohort allocation, research, prospecting, atmospheric harvesting, and the first distant project. The running log separates permanent significant events from a rolling 200-item routine record, while the operations display consolidates nearby cohort phases into fixed directive slots.

## Run locally

NanoSwarm currently has no external runtime or build dependencies. Node.js 18 or newer is sufficient.

```text
npm run dev
npm test
npm run build
```

Open `http://127.0.0.1:4173` after starting the development server. The production-ready static files are emitted to `dist/`.

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
- Sorting transfers known elements to storage and physically retains unknown matter as Residuum.
- Exhausted deposits expose a discrete prospecting job. Success replaces the depleted field with a larger compositionally distinct solid deposit while retaining depletion history.
- Beginning the first search identifies atmosphere as inexhaustible external feedstock at exactly 1% of effective solid collection throughput; most atmospheric matter remains unresolved N/O.
- Offline progress calls the same event-jumping simulation used while the page is open.
- Long offline spans are bounded by actual event progress rather than an arbitrary completion count, so a busy returning swarm is not rejected merely for completing many valid jobs.
- UI controls issue commands; they never mutate resources directly.
- Saves use an explicit version and a BigInt-aware codec.
- Log entries carry a significance tier independently of their visual tone. World, critical, and medium events remain permanent; only routine info events roll off after the newest 200. Old saves infer tiers during migration.
- Parallel Directive Scheduling is the sole initial research signal and takes four minutes on the embedded 100 n-eq computronium. At 12 nanites it reveals Relative Directive Allocation; every other research signal requires both of these roots. The research header deliberately withholds the catalog-wide completion fraction.
- Allocation step buttons support accelerating press-and-hold input. Percentage fields retain focus and uncommitted text when an unrelated cohort completion refreshes the dashboard.
- One-by-one allocation omits percentage locks. Once Relative Directive Allocation is complete, new nanites automatically enter target shares and locks protect selected directives.
- The operations panel keeps discovered replication, collection, sorting, and miscellaneous work in fixed slots without exposing unknown jobs. Structural refreshes preserve the page scroll position.
- The replication directive owns the nanite recipe readout and reports exact resource shortages whenever assigned production cannot launch.
- Every manageable control, intro telemetry line, running-log event, timer, resource card, and key status readout exposes a verbose contextual tooltip after a 1.5-second hover. Stable semantic tooltip identities and generic focus restoration preserve the player's inspection or keyboard position across job-completion renders.
- Newly revealed panels, directives, elements, projects, and research signals pulse until clicked. Acknowledgements persist in version 7 saves, while migration treats features visible in older saves as already seen.
- Research is split into incomplete and complete views. Long work estimates use live computronium capacity, so replication and explicit research allocation can collapse days into minutes without changing the job's required work.
- Research inputs remain reserved while queued. Queue entries can be reordered or cancelled; cancellation discards work performed on that topic and releases its full reserved material and energy cost.
- Throughput development is a ladder of additive 5% refinements rather than a handful of giant multipliers; completed nodes alter authoritative payloads, durations, synchronization, resonance, exploration automation, or computronium capacity.
- Whole counts use `10^x` notation above 100 million. Energy advances through SI units at six significant digits, and every numeric matter inventory includes its estimated physical mass from yoctograms upward.
- Active cohort summaries expose approximate per-second material, energy, or nanite flow without turning the underlying discrete jobs into continuous production.
- Sound is synthesized live with Web Audio. Job ratios select the harmonic field, while digits of π and e govern its pulse and drift; no recorded soundtrack or audio dependency is shipped.

See `docs/architecture.md` for the model boundary and extension rules.
