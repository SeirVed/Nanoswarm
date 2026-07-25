# Energy locality, storage and thermal model

## Status

Working design with validated physical constraints.

This document defines the intended replacement for unrestricted linear per-nanite energy acquisition. It does not approve final source capacities, efficiencies, storage densities or progression thresholds. Those values must be calibrated against captured game states and playtesting.

The central constraint is validated:

> A nanite may have a small individual energy-processing ceiling, but a local environment cannot provide unlimited independent energy merely because more nanites occupy it.

Total available power must be limited by the local source, accessible interface, conversion infrastructure, transmission and heat rejection.

## Immediate audit finding

The current energy rate is inconsistent between player observation and authored constants:

- the observed interface behaviour was reported as **20 pJ per nanite per 10-second energy job**;
- current `main` and the Research v2 integration branch define `ENERGY_PER_JOB = 40n` with a 10-second job.

Before balance work, implementation must establish whether:

1. the UI is applying an unrecorded modifier;
2. the runtime constant changed without the player-facing explanation changing;
3. the observed value came from an earlier build;
4. another capacity or bonus function halves the nominal yield.

Do not tune source caps until the authoritative base yield is resolved and covered by a test.

The scale problem exists under either value.

| Per-nanite job yield | Per-nanite power | Power at 10^20 energy nanites |
|---:|---:|---:|
| 20 pJ / 10 s | 2 pW | 200 MW |
| 40 pJ / 10 s | 4 pW | 400 MW |

A tiny individual rate becomes power-station scale when multiplied by an astronomical population.

## Design purpose

The energy system should:

1. preserve the intuitive early energy job;
2. prevent power from scaling without environmental limits;
3. make expansion into new material volumes expose new energetic interfaces;
4. create a genuine Stage 2 transition into persistent power infrastructure;
5. distinguish power generation, stored energy, transmission and discharge rate;
6. make large actions hot, loud and potentially detectable;
7. preserve exact integer accounting and deterministic offline progress;
8. avoid creating an energy softlock before the first alternative source can be built;
9. keep exotic vacuum extraction out of the early economy;
10. support Directed Bond Ablation and later industrial systems without pretending their energy is free.

## Why unrestricted linear scaling fails

The current conceptual rule is approximately:

```text
energy gained = assigned energy nanites × fixed yield per job
```

That is acceptable only while the swarm is so small that local source depletion, crowding and heat are negligible.

At 10^20 nanites, a 20 pJ job produces 2 GJ every ten seconds. A 40 pJ job produces 4 GJ every ten seconds. This is 200–400 MW from a population whose total mass remains on the order of grams to tens of grams.

The problem is not that 2–4 pW per isolated alien nanite is impossible by itself. The problem is that every nanite is implicitly granted an independent energy source with no shared geometry, fuel, gradient, converter, conductor or heat sink.

Adding nanites must eventually create competition for the same local free energy.

## Validated top-level power rule

For any energy source or local energy network:

```text
actual electrical power = minimum of:

- collector processing ceiling;
- source free-energy throughput;
- accessible interface throughput;
- conversion-infrastructure throughput;
- transmission throughput;
- storage acceptance rate, when charging;
- thermal rejection limit.
```

A compact implementation form is:

```text
P_actual = min(
  P_collectors,
  P_source,
  P_interface,
  P_conversion,
  P_network,
  P_storage,
  P_thermal
)
```

Not every layer needs a separate state field in the first implementation. Several may initially be combined into one authored `sourcePowerCap`. The conceptual boundaries should remain explicit so later infrastructure can separate them cleanly.

## Collector processing ceiling

The existing per-nanite job remains useful as a microscopic processing ceiling.

Using the reported player-facing value:

```text
P_collectors = assigned energy nanites × 2 pW
```

Using the current authored constant:

```text
P_collectors = assigned energy nanites × 4 pW
```

Below all environmental caps, yield remains linear and the existing allocation behaviour is preserved.

Above a cap, excess assigned collectors cannot create additional energy. They may remain allocated but are reported as waiting, saturated or non-productive.

## Source locality

Energy must come from a named physical opportunity attached to a location, substrate or installation.

Examples include:

- charge remaining across electronic structures;
- semiconductor junction and dielectric potential;
- galvanic differences between dissimilar materials;
- corrosion and other redox gradients;
- oxidation of carbon-rich or polymeric material;
- metal-air electrochemistry after oxygen becomes available;
- thermal gradients with a colder sink;
- RF fields and induced currents;
- mechanical vibration;
- direct connection to batteries, mains power or generators;
- sunlight intercepted by dedicated collection area;
- combustion, turbines, fuel cells and later nuclear systems.

A source may be finite, renewable, externally supplied or conditionally available.

### Finite source

A finite source has both a maximum discharge power and a remaining free-energy reservoir.

Examples:

- trapped charge;
- a battery;
- a finite chemical gradient;
- stored fuel and oxidiser;
- a charged capacitor.

It must never deliver more total energy than remains in its reservoir.

### Flux source

A flux source supplies power while conditions persist.

Examples:

- sunlight;
- ambient RF;
- a maintained thermal gradient;
- a live electrical circuit;
- a flowing fuel or oxidiser stream;
- a generator.

Its limiting quantity is power rather than a single stored total, although upstream matter or infrastructure may still be finite.

### Hybrid source

Many sources combine both:

- a battery has stored energy and a maximum discharge rate;
- a fuel cell has fuel inventory, oxygen throughput, reaction-surface capacity and electrical conversion limits;
- a grid tap has a connection rating, conductors, transformer capacity and human visibility.

## Interface saturation

Passive energy scavenging should scale with accessible energetic interface, not total nanite count.

Relevant interface may include:

- electrode area;
- junction area;
- reactive surface area;
- contact with both sides of a gradient;
- exposed light-collection area;
- available fluid or gas exchange area;
- conductor cross-section;
- thermal contact with both hot and cold reservoirs.

At small populations, every assigned nanite may find independent work.

At large populations:

- useful sites become occupied;
- adjacent nanites compete for the same electron or reactant flow;
- buried nanites are screened from radiation and gas;
- transport and diffusion limit fresh reactants;
- conductors and converters saturate;
- waste heat raises local temperature and destroys the gradient.

The first abstraction may expose an `interfaceNaniteCapacity` or directly calculate a `sourcePowerCap`. A full spatial simulation is not required.

## Surface, volume and transport

No single universal scaling exponent should be imposed on every source.

- Surface illumination is area-limited.
- A solid electrochemical interface is area- and conductor-limited.
- A distributed reactive volume may initially scale with volume, then become transport-limited.
- A gas-fed reactor is limited by intake, pressure, catalyst area and exhaust.
- A buried thermal source is limited by heat conduction and sink access.
- A mains connection is limited by the electrical network and the conspicuousness of the draw.

The content definition should describe the source mechanism; the simulation should use an authored capacity model appropriate to that class.

## Early-game source: passive gradient scavenging

The existing energy directive is reinterpreted as **Passive Gradient Scavenging**.

The nanites exploit local electronic, electrochemical and chemical disequilibria without requiring the player to understand every compound immediately.

Candidate fiction:

> Reversible catalytic interfaces harvest charge from local electronic and chemical gradients. Individual conversion remains efficient; accessible independent gradients do not scale with population indefinitely.

This source is plausible at tiny populations because total demand is negligible.

It should have:

- a low per-nanite processing ceiling;
- an authored local power cap;
- possibly a finite free-energy reserve for each substrate shell;
- an irreducible low trickle sufficient to avoid progression deadlock;
- increased capacity when a new material shell exposes more interface;
- diminishing benefit from assigning nanites beyond saturation.

### Bond-state accounting

Early substrate free energy may be represented as a source-specific energy reservoir without changing elemental atom totals.

This is not matter creation. Chemical and electronic free energy can change while the same atoms remain present.

Before compound chemistry is fully modelled, an authored `remainingFreeEnergy` attached to a provenance lot is an acceptable abstraction. Later compound systems may replace it with explicit reactants, products and reaction enthalpy.

## Stage 2 source transition

Stage 2 should replace passive scavenging as the dominant source with persistent, physically larger power infrastructure.

Candidate early systems:

### Scavenged electrical bus

- links surviving conductors, capacitors, batteries and power-conversion components;
- provides far greater power than isolated nanites;
- remains limited by discovered components and connection rating;
- may be finite unless connected to an active external source.

### Metal-air or oxidative cell

- consumes a fuel or reactive metal phase plus atmospheric oxygen;
- produces electrical energy, heat and oxidised products;
- requires gas capture, catalyst area, conductive structure and product handling;
- is a natural first use for atmospheric oxygen beyond identification.

### Polymer or carbon oxidation

- consumes carbon-rich material and oxygen;
- produces heat, gases and potentially electrical power through a fuel-cell or heat-engine route;
- should not be available until compound recognition and process research justify it;
- creates visible exhaust and heat.

### Thermal engine

- converts a maintained temperature difference into work;
- requires both a heat source and sink;
- is inappropriate as a source from uniform ambient heat;
- becomes useful once combustion, concentrated electrical heating or another high-temperature process exists.

### Direct electrical theft

- connects to mains, batteries, chargers, vehicles or industrial systems;
- provides high power with comparatively little local fuel processing;
- creates strong detection risk through current anomalies, failed equipment, metering and visible damage.

### Dedicated solar collection

- scales with exposed collection area rather than nanite count;
- is weak at microscopic area but powerful when the swarm constructs macroscopic collectors;
- creates an explicit land-area and visibility trade-off.

## Vacuum energy policy

Vacuum energy is not an early or mid-game explanation for the current energy directive.

Using it now would erase:

- source locality;
- fuel and gradient gameplay;
- the Stage 2 industrial transition;
- meaningful power infrastructure;
- scarcity and detection consequences.

If exotic vacuum or zero-point extraction appears in the distant endgame, it must still have:

- a finite coupling power density;
- specialised infrastructure;
- conversion and transmission limits;
- waste heat or another entropy destination;
- failure risk;
- strategic visibility;
- no automatic linear multiplication by active nanite count.

Exotic source does not mean infinite local power.

## Power is not stored energy

The simulation and interface must clearly distinguish:

- **power** — rate at which energy can be generated, transmitted or discharged;
- **stored energy** — amount currently available;
- **storage capacity** — maximum amount that can be held;
- **charge power** — maximum rate storage can accept;
- **discharge power** — maximum rate storage can supply;
- **conversion efficiency** — fraction reaching useful electrical storage or load;
- **self-discharge or leakage** — optional later loss.

A large joule total does not imply it can be released instantly. A high-power source does not imply a large reserve.

## Individual versus external storage

Individual nanites may retain a tiny operating buffer.

They should not internally contain gigajoules.

Large displayed stores must correspond to distributed external infrastructure such as:

- charge-separated substrate regions;
- capacitor lattices;
- electrochemical cells;
- flywheels or mechanical stores;
- superconducting loops at a later capability level;
- compressed or chemically stored fuel;
- dedicated industrial buffer installations.

Capacitive Buffer concepts should increase explicit external storage capacity or charge/discharge performance rather than imply unlimited abstract energy inventory.

## Storage model

A storage installation should eventually expose:

```js
{
  id,
  type,
  location,
  storedEnergy,
  capacity,
  maxChargePower,
  maxDischargePower,
  chargeEfficiencyBps,
  dischargeEfficiencyBps,
  leakagePower,
  thermalLoad,
  damage,
  controllerNanites
}
```

This is a design sketch, not a frozen schema.

The first implementation may use one aggregate store if it still enforces capacity and power limits. Later infrastructure can split stores by location and technology.

## Thermal accounting

Every conversion and discharge must send unusable energy somewhere.

At minimum:

```text
input energy = useful output + recoverable stored energy + heat + other emitted energy
```

Even very efficient systems become thermally significant at large power.

Examples:

- 99.9% efficiency at 200 MW still rejects 200 kW;
- 99% efficiency rejects 2 MW;
- 95% efficiency rejects 10 MW.

The swarm cannot remain invisibly concentrated inside a computer chassis while continuously processing hundreds of megawatts.

### Initial thermal abstraction

A complete fluid and temperature simulation is not required immediately.

The first system may track, per site or aggregate local environment:

- thermal capacity or safe heat buffer;
- current excess heat;
- passive dissipation power;
- active cooling power;
- maximum safe continuous heat rejection;
- warning and damage thresholds.

A candidate relationship is:

```text
heat change = generated heat - dissipated heat
```

Dissipation may depend on:

- exposed area;
- temperature difference;
- contact with chassis, air, water or soil;
- constructed heat spreaders;
- airflow or pumped coolant;
- phase-change stores;
- deliberate exhaust.

### Consequences of excess heat

Possible staged consequences:

1. reduced conversion efficiency;
2. forced throttling;
3. local substrate damage;
4. nanite attrition or immobilisation;
5. fire, melting or gas release;
6. increased infrared signature;
7. human detection and intervention.

Heat should first appear as a throughput and visibility problem, not an arbitrary percentage tax.

## Emissions and detection

Large power use produces evidence even when the source itself is exotic.

Potential signatures:

- heat;
- electromagnetic emissions;
- current draw and voltage disturbance;
- RF noise;
- acoustic and mechanical vibration;
- light, sparks and plasma;
- exhaust gas;
- chemical odour;
- depleted fuel or altered equipment;
- magnetic fields;
- fire or structural damage.

Energy infrastructure should eventually feed the strategy-sensitive human-response model.

A low-power hidden swarm may remain unnoticed. A 200 MW process inside a chassis cannot.

## Directed Bond Ablation worked example

The observed Saturation Fracture panel reports approximately:

- **3.983 × 10^23 recovered atoms**;
- **18.8478 g recoverable Feedstock**;
- **66.982 MJ coupling charge**;
- **18-second discharge sequence**.

### Economic scale under the present linear rule

At 20 pJ per 10-second nanite job:

- one shot equals 3.3491 × 10^18 nanite-jobs;
- 10^20 energy nanites replace it in about 0.335 seconds;
- the 18-second discharge averages about 3.72 MW.

At 40 pJ per 10-second job:

- 10^20 energy nanites replace it in about 0.167 seconds.

The apparently large megajoule number is therefore not a meaningful cost while energy scales freely to hundreds of megawatts.

### Physical scale

The coupling energy is about:

- 3.55 GJ per kilogram of recovered material;
- roughly 1.05 keV per recovered atom;
- about 3.72 MW averaged across the discharge.

This is not gentle bond selection. It is consistent with the name **Saturation Fracture** only if most energy becomes destructive heating, ionisation, stress waves, ejecta and damage outside the ultimately recoverable Feedstock.

That is acceptable as a deliberately violent bulk-fracture mechanic.

The game should not describe it as efficient microscopic harvesting.

### Ablation rules

Directed Bond Ablation should:

- reserve the full coupling charge before firing;
- remove that energy exactly when the discharge commits;
- expose a maximum discharge power or fixed sequence duration;
- convert exact target atoms into mixed Feedstock once;
- create a large local heat and emission event;
- potentially damage or contaminate surrounding material;
- never return sorted elements directly;
- never bypass compound knowledge;
- become increasingly conspicuous at later human-response stages.

Energy recovery from the coupling field is not currently required. If later introduced, it must be explicit, technology-gated and less than complete.

## Gameplay progression

### Stage 0: negligible-demand regime

- passive gradient scavenging appears approximately linear;
- source limits exist but are far above the one- to low-population demand;
- the player learns energy jobs without encountering immediate saturation;
- bootstrap research and first replication remain safely fundable.

### Stage 1: local saturation emerges

- larger populations begin to exhaust or saturate independent electronic gradients;
- each new material shell exposes additional interface and perhaps finite free energy;
- additional energy allocation eventually produces diminishing returns;
- the UI identifies local source saturation rather than pretending all workers are productive;
- storage remains small enough that charging choices matter.

### Stage 2: infrastructure replaces individual collection

- passive gradient scavenging becomes a background trickle;
- atmosphere, iron, copper, carbon-rich material and surviving electronics enable persistent power installations;
- energy throughput depends increasingly on installed capacity and feed chains;
- large stores and discharges require external buffers;
- heat rejection and emissions become meaningful;
- nanites increasingly act as controllers and precision constructors rather than the power source themselves.

### Later stages

Possible progression:

- fuel processing and electrochemical stacks;
- combustion and turbines;
- grid-scale tapping and conversion;
- large solar fields;
- geothermal and industrial heat recovery;
- nuclear fission;
- fusion;
- stellar energy collection;
- exotic flux or vacuum systems only after conventional limits have become established gameplay.

## Player-facing diagnostics

The energy panel should distinguish capacity from assignment.

Suggested readout:

```text
ENERGY ACQUISITION

Assigned collectors          1.000 × 10^20
Collector processing ceiling 200 MW
Local source ceiling         480 kW
Interface ceiling            620 kW
Network ceiling              500 kW
Thermal ceiling              350 kW

Actual generation            350 kW
Productive collectors        1.750 × 10^17
Saturation                   99.825%
Bottleneck                    Heat rejection
```

Values are illustrative only.

Source cards may show:

```text
PASSIVE GRADIENT SCAVENGING
AVAILABLE POWER       180 kW
FINITE POTENTIAL      2.8 GJ
INTERFACE SATURATION  94.2%
THERMAL LOSS          12.0%
```

Storage should show:

```text
STORED ENERGY         16.3303 GJ / 20.0000 GJ
CHARGE LIMIT          400 kW
DISCHARGE LIMIT       5 MW
PASSIVE LOSS          0 W
```

Ablation should show both energy and power:

```text
COUPLING CHARGE       66.9820 MJ
DISCHARGE SEQUENCE    18 s
AVERAGE DISCHARGE     3.721 MW
LOCAL THERMAL EVENT   SEVERE
```

## Allocation behaviour under saturation

The energy directive remains a player target, but productive workers are derived from available capacity.

Excess assigned nanites:

- do not create energy;
- remain available for reassignment according to existing cohort rules;
- should be reported as unable to find an independent interface;
- may be automatically released only if a future explicit allocation policy permits it.

Do not silently move workers between directives merely because a source saturates.

Relative allocation should continue expressing player intent. Diagnostics explain why realised throughput differs.

## No-softlock requirements

Energy locality introduces a new failure mode and therefore needs explicit safeguards.

A valid progression path must guarantee that:

- the initial source can fund all mandatory bootstrap actions;
- reaching passive saturation does not prevent construction or research of the first alternative source;
- a minimum emergency trickle remains unless a deliberate loss state disables it;
- finite energy reservoirs cannot be unknowingly spent on optional actions that permanently block progression;
- required start-up energy for the first Stage 2 power installation is obtainable from already available sources;
- research, ablation and infrastructure cards show post-spend stored energy;
- offline simulation cannot drain a finite source twice or exceed storage capacity;
- a full store cannot cause energy-producing jobs to destroy energy without an explicit spill or throttle rule.

## Deterministic simulation requirements

Energy remains exact integer picojoules.

For each energy job or installation interval:

1. determine the authoritative start timestamp;
2. snapshot the relevant source, conversion and infrastructure revision;
3. reserve finite consumables where appropriate;
4. schedule the next source, storage, thermal or cohort event;
5. settle exact energy and heat at completion;
6. never exceed source reserve, power cap or storage capacity;
7. continue event-jumping under the resulting state.

Long offline intervals must produce the same result as many smaller advances.

If a source depletes, a store fills, a thermal threshold is reached or an installation changes state before the requested target time, that boundary becomes an event. The simulation must not calculate the entire interval using the initial power rate.

## Candidate source data

A source may eventually resemble:

```js
{
  id,
  type,
  locationOrLot,
  status,
  remainingFreeEnergy,
  renewablePower,
  maxSourcePower,
  maxInterfacePower,
  maxConverterPower,
  conversionEfficiencyBps,
  heatFractionBps,
  interfaceNaniteCapacity,
  requiredDiscoveries,
  requiredInstallation,
  emissionsProfile,
  revision
}
```

This is an implementation sketch, not an approved schema.

Prefer content-authored source classes and pure capacity functions over scattered special cases.

## Research and infrastructure interactions

Potential research families include:

- Gradient Topology Mapping — reveals source saturation and local energetic interfaces;
- Distributed Electrode Formation — increases accessible interface;
- Capacitive Buffer Lattice — increases external storage and charge power;
- Conductive Bus Architecture — increases transmission power;
- Thermal Spreader Networks — increases short-term thermal capacity and passive rejection;
- Atmospheric Oxidant Handling — enables controlled oxygen-fed power systems;
- Electrochemical Stack Control — unlocks persistent cells;
- Waste-Heat Routing — enables active cooling and later heat reuse;
- Emission Suppression — trades cost and efficiency for reduced visibility;
- RF Scavenging — adds a low-density flux source rather than a universal multiplier.

Names and sequence remain working design.

Research should unlock models and construction capability. Installed machinery supplies the actual power.

## Implementation sequence

### Phase 1: measurement without changed behaviour

- resolve the 20 pJ versus 40 pJ discrepancy;
- add pure functions for collector ceiling and current realised power;
- display projected power at large populations;
- capture representative states and ablation charge times;
- add tests around the current yield.

### Phase 2: passive source cap

- add a local passive-gradient power ceiling;
- preserve linear yield below it;
- expose saturation and productive-worker count;
- ensure exact offline handling;
- calibrate the first cap so early progression remains unchanged.

### Phase 3: finite potential and storage capacity

- give local sources finite or renewable classifications;
- prevent overdraw;
- add explicit storage capacity, charge power and discharge power;
- define full-store behaviour;
- migrate saves conservatively.

### Phase 4: Stage 2 installations

- add at least one persistent electrical or electrochemical power system;
- make it buildable before passive energy becomes a hard progression lock;
- require ordinary matter, energy and nanite control;
- give it explicit power, efficiency and heat outputs.

### Phase 5: heat and visibility

- add thermal buffering and rejection;
- throttle or damage systems above safe limits;
- feed major power and ablation events into later detection systems;
- expose heat-management infrastructure.

## Required tests

### Base-rate audit

- assert the authoritative per-job yield;
- assert the player-facing tooltip and readout match it;
- assert bonuses or modifiers are explicit.

### Source saturation

- yield is linear below source capacity;
- additional workers above capacity do not increase output;
- productive-worker count is exact;
- a newly exposed source or interface increases the cap predictably.

### Finite sources

- no source produces more than its remaining free energy;
- depletion occurs at the exact event timestamp;
- stepped and jumped simulation agree;
- cancellation or interruption does not duplicate reserved fuel.

### Storage

- energy never exceeds capacity;
- charge and discharge power limits are enforced;
- full-store behaviour is deterministic;
- large loads cannot discharge faster than the installed network permits.

### Thermal limits

- conversion losses produce exact heat;
- thermal thresholds occur at deterministic timestamps;
- throttling does not create or delete energy;
- cooling removes heat only at its authorised rate.

### Directed Bond Ablation

- the full coupling charge is reserved exactly once;
- the shot cannot start without enough stored energy and discharge capability;
- recovered atoms transfer exactly once;
- the specified heat and emission event is recorded;
- offline completion matches online completion.

### Progression safety

- a new game can fund all mandatory early research and replication;
- passive saturation does not strand the swarm before the first alternative source;
- a zero-gold chassis state can still fund required research and industrial bootstrapping;
- optional ablation cannot consume protected progression energy without clear warning or an explicit player command.

## Decisions still required

Before implementation, explicitly decide:

1. whether the authoritative microscopic yield is 20 pJ or 40 pJ per ten seconds;
2. when passive-gradient saturation first becomes visible;
3. whether early gradient free energy is finite, renewable or a mixture;
4. the minimum non-depleting emergency trickle;
5. whether excess energy workers remain assigned but idle;
6. the first storage-capacity model;
7. whether current large stores are grandfathered, clamped, converted or restart-bound;
8. the first Stage 2 power installation and its inputs;
9. the first thermal abstraction;
10. whether Directed Bond Ablation immediately emits heat mechanically or waits for the broader thermal system;
11. which emissions become gameplay before human detection is fully implemented;
12. whether any energy source may ever bypass locality.

## Rejected shortcuts

Do not solve the scale problem by:

- claiming every nanite independently harvests ambient heat from a uniform environment;
- treating RF or vibration as hundreds of megawatts inside a chassis;
- invoking vacuum energy with no coupling-density or heat limit;
- capping energy with an unexplained arbitrary global number;
- deleting excess generated energy without a full-store or spill rule;
- storing gigajoules inside gram-scale nanite bodies with no external infrastructure;
- making Stage 2 generators permanent abstract percentage bonuses;
- ignoring the difference between energy and power;
- allowing large discharges to remain thermally and observationally silent.

## Core design statement

The final model should communicate:

```text
Nanites determine how precisely energy can be harvested.
The environment determines how much free energy is available.
Infrastructure determines how fast it can be converted, moved and stored.
Thermal systems determine how much power can be sustained.
Large power use changes the world and makes the swarm visible.
```
