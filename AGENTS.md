# NanoSwarm contributor guidance

- Treat `src/game/` as the authoritative deterministic simulation.
- UI code may issue commands and render state; it must never award resources directly.
- Nanites, atoms, energy, research work, and job counts remain whole `bigint` values.
- Inputs are reserved when a cohort begins. Outputs are applied atomically at completion.
- Online and offline progress must call the same event-jumping simulation.
- Preserve matter exactly across deposits, Feedstock, in-flight payloads, identified storage, and Residuum.
- Add or update tests whenever simulation rules change.
- Do not add a runtime dependency without a concrete need and an explicit architectural decision.
