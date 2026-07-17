# NanoSwarm

NanoSwarm is a long-horizon incremental game about rebuilding a stranded nanite seed into an industrial and eventually interstellar swarm.

The current playable slice begins with the seed's deep-time arrival, then reveals the interface only as the player discovers it: one active assembler, a substrate survey, collection, Feedstock, exact elemental sorting, Residuum, energy acquisition, replication, cohort allocation, research, and the first distant project.

## Run locally

NanoSwarm currently has no external runtime or build dependencies. Node.js 18 or newer is sufficient.

```text
npm run dev
npm test
npm run build
```

Open `http://127.0.0.1:4173` after starting the development server. The production-ready static files are emitted to `dist/`.

## Simulation rules

- Nanites are whole `bigint` counts; production never uses fractional workers.
- Work is represented by cohorts with exact start and completion times.
- Inputs are reserved at job start and outputs appear atomically at completion.
- Matter is stored as exact constituent-atom inventories. Collection does not identify it.
- Sorting transfers known elements to storage and physically retains unknown matter as Residuum.
- Offline progress calls the same event-jumping simulation used while the page is open.
- UI controls issue commands; they never mutate resources directly.
- Saves use an explicit version and a BigInt-aware codec.

See `docs/architecture.md` for the model boundary and extension rules.
