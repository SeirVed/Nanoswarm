# Research v2 catalogue audit and calibration

## Status

Working inventory and balance method.

This document does not contain approved research costs. The former conversion matrix assigned regular memory tiers and repeated baseline durations without deriving them from the simulation. Those values have been withdrawn.

The purpose of this document is now to:

- ensure no live research topic is forgotten during redesign;
- describe the gameplay job of each branch;
- identify questionable catalogue structure;
- define the evidence needed before any cost is accepted.

## Source-of-truth rule

The live catalogue in `src/game/content.js` is authoritative for current IDs. Enumerate it from code when implementation begins. Do not trust a count copied into prose, and do not preserve generated tiers merely because they already exist.

Stable IDs matter for save migration. Stable balance and branch structure do not.

## Cost fields under consideration

A post-bootstrap topic may eventually define:

```js
{
  memoryNanites,
  energyCost,
  requiredCompute,
}
```

These names describe the current concept, not final schema. Values remain unset until calibrated.

Each accepted value should also have design metadata outside the runtime definition:

```text
evidence fixture
intended player decision
expected unlock window
expected immediate commitment
expected recovery or replacement time
energy burden at sustainable production
capacity assumptions
confidence
last validation date
```

## Catalogue families

### Coordination and interface

Candidate topics:

- Parallel Directive Scheduling
- Relative Directive Allocation
- Cohort Ratio Prognostics
- Phase-Locked Directive Bus
- Directive Compilation

Questions:

- Which capabilities are necessary quality-of-life unlocks versus strategic upgrades?
- Which can plausibly use the seed’s internal archive?
- Does the ordering match the point where the corresponding interface becomes painful or useful?
- Are later coordination topics new capabilities, capacity improvements or merely numeric throughput?

These should not share a cost curve merely because they concern coordination.

### Material interpretation

Candidate topics:

- Residuum Indexing
- Ferromagnetic Phase Analysis
- Atmospheric Spectroscopy
- Atmospheric Fractionation

Questions:

- What observation generates each topic?
- Does it identify a signal, make an element sortable, explain a compound, or unlock an industrial process?
- Which steps are being incorrectly compressed into one research?
- Can the research proceed when the material bottleneck that motivated it has stopped replication?

Material identification and usable industrial recovery must remain distinct.

### Operational refinements

Current generated branches include:

- Capacitive Buffer Lattice
- Payload Frame Reinforcement
- Packetized Sorting
- Route Memory

These are the most suspiciously regular part of the catalogue. Before retaining their tier ladders, determine:

- whether each tier creates a perceptible new decision;
- whether repeated additive throughput research is more interesting than infrastructure;
- whether the branch should plateau, branch or require a new physical system;
- whether a later material horizon really implies a larger mnemonic footprint;
- whether multiple generated tiers should be collapsed into fewer authored discoveries.

The former practice of assigning each branch one tier per material shell is a hypothesis, not a rule.

### Environmental and strategic systems

Candidate topics include:

- Radiofrequency Scavenging
- Local Material Caches
- Distributed Reasoning Mesh
- Autonomous Prospecting
- Specialized Morphologies

These topics change operating strategy or introduce infrastructure. They should be priced and paced individually.

Questions:

- Does the topic unlock an action, automate an existing action, expand parallelism or increase efficiency?
- What competing use exists for the nanites being committed?
- Is the capability useful immediately at reveal?
- Does it depend on a machine or environmental discovery not yet modelled?
- Is it too broad and better decomposed into observation, knowledge and construction?

## Per-topic audit template

Use this before assigning costs:

| Field | Question |
|---|---|
| Identity | Is the ID needed for save compatibility? |
| Player-facing purpose | What new choice or understanding does this create? |
| Trigger | What did the swarm observe that formulated the topic? |
| Prerequisites | Which dependencies are logical, and which are inherited clutter? |
| Capability type | Bootstrap, interpretation, refinement, automation, infrastructure or strategy? |
| Physical result | What changes in the world or swarm when it completes? |
| Immediate utility | Can the player use it at once? |
| Competing demand | What else needs nanites and energy at this moment? |
| Failure mode | Can postponing or starting it deadlock progression? |
| Candidate memory burden | Unset until measured. |
| Candidate energy burden | Unset until measured. |
| Candidate compute burden | Unset until the capacity model exists. |
| Evidence | Which reproducible save or simulation run supports the proposal? |
| Confidence | Speculative, modelled, playtested or stable. |

## Calibration procedure

### 1. Capture unlock-state fixtures

For each important research reveal, record representative states from:

- a new or inexperienced player path;
- a growth-optimised path;
- a research-heavy path;
- a long-offline return;
- a material-starved path;
- the zero-gold Stage 2 transition.

Record population, idle population, cohort commitments, stored elements, remaining substrate, sustainable energy, current research capacity and nearby competing unlocks.

### 2. Define the intended decision

Examples:

- sacrifice near-term replication throughput for a permanent reasoning asset;
- delay an automation convenience to preserve a small swarm;
- spend stored energy now or hold it for ablation or infrastructure;
- choose between two research branches with different strategic benefits.

If a cost does not create or support a decision, it is probably only a timer.

### 3. Select opportunity-cost bands

Memory burden should be discussed in terms of the actual state:

- negligible;
- noticeable but quickly replaceable;
- strategically significant;
- temporarily growth-halting;
- impossible until another breakthrough.

Translate a chosen band into nanites only after measuring the reachable population and replacement constraints. Do not derive it from shell mass or a fixed percentage alone.

### 4. Derive energy from the energy economy

Measure:

- sustained generation under realistic allocation;
- storage available at reveal;
- energy already committed to replication or other projects;
- whether energy acquisition itself consumes scarce workers;
- how offline accumulation changes the result.

Choose a burden that creates the intended trade-off. Avoid a universal “minutes of production” rule when different projects should compete differently.

### 5. Design compute and acceleration together

Required work cannot be balanced before research capacity is understood. Sweep candidate capacity models and inspect:

- time at immediate unlock;
- time after modest growth;
- time after several installed banks;
- whether older topics become reasonably cheap to catch up;
- whether later topics retain weight;
- whether parallel slots create runaway compounding.

The displayed initial estimate should be dramatic but honest. Growth may shorten it, but not through an unexplained or unlimited population percentage.

### 6. Test the whole sequence

Research costs interact. Validate branches as paths, not isolated cards:

- cumulative nanites removed from operations;
- cumulative energy demand;
- recovery time between commitments;
- opportunity to build industry;
- risk of one dominant ordering;
- catch-up experience after choosing poorly;
- behaviour when replication is materially capped.

## Why the curve should be irregular

Research difficulty should reflect its role:

- a bootstrap coordination trick may be cognitively modest and physically free;
- a new material model may require substantial memory but unlock an escape from a bottleneck;
- a small refinement may be cheap but subject to diminishing returns;
- a new industrial discipline may require knowledge, specialised infrastructure and experiments;
- a strategic automation system may be memory-heavy because it models many concurrent environments;
- a later discovery can occasionally be cheap when prior models make it obvious.

An irregular, explainable curve will feel more credible than a tidy exponential ladder.

## Migration inventory

During implementation:

- enumerate every current research ID;
- classify it using this document;
- decide whether it is retained, renamed, merged, hidden or retired;
- preserve completed effects where required;
- map queued entries without inventing new costs;
- record unresolved future tiers as unavailable rather than fabricating values.

Any automated completeness check should compare the implementation against the live catalogue or an explicit migration map, not against a number written here.

## Readiness gate

A topic is ready to receive production values only when:

- its gameplay role is clear;
- its reveal is grounded in an observation;
- its prerequisites have been audited;
- a representative unlock-state fixture exists;
- memory, energy and compute proposals state their intended opportunity cost;
- the capacity model used by the estimate is named;
- at least a small parameter sweep has been reviewed;
- the value has a confidence label.

Until then, the honest value is `TBD`.

