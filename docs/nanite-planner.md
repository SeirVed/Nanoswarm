# NanoSwarm nanite planner

## Status

This document is an implementation handoff. It defines a proposed canonical seed
nanite and an interactive `/nanite-planner/` workbench for examining and revising
that design.

It does **not** authorize changes to the simulation recipe, replication balance,
research tree, or live game. The first implementation should remain a design tool
whose drafts are isolated from authoritative game state.

## Purpose

NanoSwarm currently gives the universal seed nanite an exact material recipe but
no canonical structure:

- 5,000 carbon atoms
- 400 silicon atoms
- 150 copper atoms
- 25 gold atoms
- 40 pJ of external replication-process energy
- 55 nanite-seconds of base assembly work

The planner should turn that recipe into something the designer can inspect,
question, rearrange, validate, export, and hand back for later integration.

The result has two simultaneous standards:

1. **Game-canonical exactness:** element counts, mass, dimensions, module budgets,
   deterministic coordinates, and declared functions can be exact.
2. **Scientific honesty:** the model remains a speculative atomistic architecture
   until its bonding, electronic behaviour, thermal stability, and fabrication
   pathway have been evaluated with suitable physical models.

The planner must never imply that a visually coherent structure is proof of a
chemically viable autonomous nanomachine.

## Design thesis

At 5,575 atoms and approximately 86 kDa, the seed nanite is not a tiny
conventional robot. It is closer in scale to a substantial protein machine,
inorganic molecular appliance, or programmable ribosome.

The individual nanite should therefore be:

- a rigid, surface-bound fabrication cell;
- controlled by a small finite-state sequencer rather than a general computer;
- dependent on external process energy rather than carrying a 40 pJ battery;
- capable of sensing and manipulating only a narrow local environment;
- most effective when coupled to a conductive, ordered substrate;
- individually reflexive, with intelligence emerging from the connected swarm;
- able to construct a daughter beside itself using an external assembly surface.

This interpretation supports the existing game progression. The protected seed
reasoning substrate supplies early cognition. Increasing swarm connectivity then
creates distributed awareness. Later Specialized Morphologies add tools,
coatings, reservoirs, and assembled structures without replacing the universal
base recipe.

## Physical baseline

### Recipe-derived properties

Using ordinary isotope-averaged atomic masses, the recipe has:

- total atom count: `5,575`;
- molecular mass: approximately `85,745.06425 Da`;
- physical mass: approximately `1.42383029e-22 kg`;
- physical mass: approximately `1.42383029e-19 g`;
- equivalent fully dense diameter: approximately `4.2 nm`;
- plausible open-architecture body scale: approximately `5–7 nm`.

The open-architecture estimate includes lattice voids, channels, surface
reconstruction, manipulators, and the fact that a nanite need not be a solid
sphere.

### Atom size convention

Atoms do not have hard outer shells. Their effective radius changes with bonding,
coordination, oxidation state, and the chosen definition. For the planner's
default visualization, use Cordero-style covalent radii because the nanite is
being represented primarily as a bonded structure.

| Element | Count | Count share | Default covalent radius | Radius relative to C | Approximate sphere-volume share |
|---|---:|---:|---:|---:|---:|
| Carbon | 5,000 | 89.686% | 76 pm | 1.000 | 69.68% |
| Silicon | 400 | 7.175% | 111 pm | 1.461 | 17.37% |
| Copper | 150 | 2.691% | 132 pm | 1.737 | 10.95% |
| Gold | 25 | 0.448% | 136 pm | 1.789 | 2.00% |

The volume-share column is a visualization aid calculated from count multiplied
by radius cubed. It is not a prediction of the structure's real partial volume.

References:

- B. Cordero et al., [Covalent radii revisited](https://doi.org/10.1039/B801115J),
  *Dalton Transactions* (2008).
- G. Chen et al., [Comparative study of single Cu, Ag, Au, and K atoms adsorbed on
  the Si(111)-(7×7) surface](https://doi.org/10.1103/PhysRevB.79.115301),
  *Physical Review B* (2009), which uses the same 1.32 Å Cu, 1.36 Å Au, and
  1.11 Å Si covalent radii.

### Energy interpretation

The 40 pJ recipe value must be treated as an external process budget distributed
across the 55-second base build:

- average process power at one-worker base speed: approximately `0.727 pW`;
- the nanite does not contain or instantaneously absorb the full 40 pJ;
- energy is spent on bond ablation, atom transport, field generation, alignment,
  rejected matter, control losses, and substrate heating;
- only a minute fraction should exist inside the growing daughter at any moment.

This is necessary for scale coherence and aligns replication with Directed Bond
Ablation and later substrate-specific extraction systems.

## Proposed canonical design: N0 Seed Worker

### Envelope

- core body: approximately `5.5 × 4.0 × 3.5 nm`;
- full appendage span: approximately `7 nm`;
- four load-bearing anchor-actuators;
- two finer assembly manipulators;
- one ventral intake and classification channel;
- one ventral external daughter-assembly rail;
- no face, eyes, wheels, gears, rotary bearings, screws, or macroscopic robot
  analogues.

The familiar insect-like silhouette is an emergent consequence of four anchors
and two manipulators, not biological mimicry.

### Exact initial module budget

This allocation is the proposed first canonical draft. Every atom has a declared
system, and all columns sum exactly to the universal recipe.

| System | C | Si | Cu | Au | Total | Intended function |
|---|---:|---:|---:|---:|---:|---|
| Protective shell and central truss | 3,000 | 0 | 0 | 0 | 3,000 | Diamondoid/graphitic load path and environmental shielding |
| Four anchor-actuators | 800 | 0 | 48 | 8 | Surface grip, strain switching, and inchworm translation |
| Two assembly manipulators | 500 | 0 | 0 | 6 | Atom placement and daughter alignment |
| Intake and classification channel | 350 | 64 | 30 | 0 | Local lattice sensing and routing of released atoms |
| Computational substrate | 350 | 288 | 24 | 4 | Finite-state sequencing, memory, error flags, and swarm contact |
| Timing and field-control array | 0 | 48 | 48 | 7 | Phase reference, positioning fields, and assembly-site control |
| **Total** | **5,000** | **400** | **150** | **25** | **5,575** | |

This is a design allocation rather than a bonding prescription. The planner must
permit redistribution while preserving the recipe totals unless the user
explicitly enters a noncanonical experimental mode.

## Functional interpretation

### Structure

Carbon provides most of the body as closed cages, short diamondoid struts,
graphitic surfaces, flexures, and reconstructed edges. The design should avoid
large unsupported graphene sheets and exposed high-energy dangling-bond surfaces
where practical.

The absence of hydrogen, oxygen, nitrogen, boron, and phosphorus is a serious
real-world constraint. The canonical premise is that the seed is an
atomically-precise, non-biological artefact using reconstructed carbon surfaces,
silicon-carbide-like interfaces, strain, charge state, and embedded metal atoms.
The planner should display this as an explicit unresolved physical risk rather
than silently assuming conventional organic chemistry or doped CMOS.

### Computation and memory

Four hundred silicon atoms cannot host a conventional processor. The N0 should
instead contain:

- a hardwired sequencing loop;
- a small number of persistent charge or structural states;
- local error detection;
- several tuned sensor gates;
- a substrate-contact communication interface;
- a plausible target of roughly 16–32 persistent logical state bits.

Instructions and world modelling remain external. Early commands arrive from the
protected seed reasoning substrate. At larger scales, coupled nanites form the
distributed computational medium.

### Power

The N0 has no meaningful bulk battery. It may briefly retain charge in local
capacitive states, but sustained work comes from:

- electrical potential across a conductive substrate;
- near-field energy delivered by adjacent nanites;
- externally coordinated bond-ablation events;
- later morphology-specific harvesting attachments.

This gives the future energy simulation a physical distinction between energy
source capacity, delivery topology, and nanite count. A flat independent energy
income per nanite should eventually saturate when many nanites share the same
limited source or surface area.

### Locomotion

The four apparent legs are carbon flexures with embedded copper control paths and
sparse gold contact atoms. Movement is an alternating anchor sequence:

1. forward contacts bind;
2. a charge or strain change flexes the body by a fraction of a nanometre;
3. rear contacts release;
4. the body advances;
5. rear contacts bind and forward contacts reset.

This makes the N0 effective on conductive crystalline surfaces and progressively
less effective on oxides, polymers, loose regolith, liquids, biological matter,
and open atmosphere. Those failures create concrete reasons for later adhesion,
transport, sealing, and morphology research.

### Recognition and sorting

The seed nanite is not a universal mass spectrometer. It has recognition
responses tuned to the four seed-catalogued elements. Candidate atoms can be
classified through some combination of:

- local conductance response;
- bond energy and displacement response;
- induced charge behaviour;
- resonance against tuned capture sites;
- agreement across several neighbouring nanites.

Known C, Si, Cu, and Au can be routed into swarm-controlled stores. Matter that
does not match a known response is retained by provenance as Residuum. Discovering
a new element enables a new recognition and capture procedure; it does not
retroactively make previously retained material sorted. Existing Residuum lots
must be processed again.

### Replication

The N0 does not contain a daughter internally. It anchors beside a prepared
surface and uses its ventral body as an alignment reference:

1. inspect and stabilise a local assembly patch;
2. obtain atoms from sorted stores or nearby delivery chains;
3. establish the daughter's carbon load path;
4. place silicon functional regions;
5. embed copper paths and field sites;
6. terminate selected interfaces with the 25 gold atoms;
7. verify count, continuity, and response patterns;
8. transfer a minimal configuration state by direct contact;
9. release the daughter.

Replication should be cooperative even when the simulation represents it as one
cohort. Neighbouring collectors, sorters, energy harvesters, and replicators form
the practical fabrication system. This is the physical interpretation of
directive efficiency and cohort synchronisation.

## Interactive `/nanite-planner/` workbench

### Core user experience

The first page should support:

- drag to rotate the model;
- secondary drag or modified drag to pan;
- wheel and explicit buttons to zoom;
- reset view and fit model controls;
- orthographic and perspective camera modes;
- atom, bond, module, and element visibility toggles;
- element legend with exact used/available counts;
- module selection by clicking an atom or table row;
- editable module names, descriptions, functions, and atom allocations;
- deterministic regeneration from a design seed;
- a `SUGGESTIONS` text area matching the other design workbenches;
- local draft persistence;
- full plan JSON import/export;
- a concise “copy changes for Pete” payload;
- a screenshot/export-image action if it can remain dependency-free;
- warnings separated into `invalid`, `unverified`, and `speculative`.

The planner should load the canonical N0 draft but must never modify
`NANITE_RECIPE` or game state directly.

### Recommended layout

1. **Header:** NanoSwarm brand, model name, canonical/experimental status, links to
   simulation, research planner, and horizon planner.
2. **Top information pattern:** purpose, scientific-honesty notice, and a
   `SUGGESTIONS` box.
3. **Left panel:** element totals, count deltas, physical mass, approximate
   envelope, and validation status.
4. **Centre viewport:** rotatable atomistic model with overlays.
5. **Right panel:** selected module or atom editor.
6. **Bottom panel:** camera controls, visibility filters, generation settings,
   warnings, import/export, and exact JSON.

On narrow screens the panels may stack, but the viewport must retain a useful
minimum height.

### Rendering strategy

Do not add a runtime dependency merely to draw the first version.

Recommended implementation order:

1. Use one `<canvas>` with software 3D projection.
2. Store coordinates as numeric arrays, rotate/project them in JavaScript, depth
   sort visible atoms, and draw circles with element-specific radii.
3. Redraw only when the camera, filters, selection, or model changes. The planner
   does not require a permanent animation loop.
4. Hide bonds by default at distant zoom levels. Drawing thousands of bonds is
   both visually noisy and more expensive than the atoms.
5. If software projection proves insufficient, make a later explicit
   architectural decision between a small local WebGL renderer and a justified
   dependency. Do not casually introduce Three.js to the game runtime.

The model must not use thousands of DOM or SVG nodes. Canvas keeps the workbench
isolated from normal dashboard rendering and avoids DOM churn.

### Two-layer data model

Keep the editable design specification separate from the generated atom
coordinates.

#### Design specification

Suggested path: `src/design/nanite.js` or `src/design/nanite.json`.

```json
{
  "version": 1,
  "id": "n0-seed-worker",
  "name": "N0 Seed Worker",
  "canonical": true,
  "seed": 5575,
  "recipe": {
    "carbon": 5000,
    "silicon": 400,
    "copper": 150,
    "gold": 25
  },
  "energyPj": 40,
  "assemblyNaniteMs": 55000,
  "envelopeNm": {
    "body": [5.5, 4.0, 3.5],
    "span": 7.0
  },
  "modules": [
    {
      "id": "shell-truss",
      "name": "Protective shell and central truss",
      "function": "Primary carbon load path",
      "atoms": {
        "carbon": 3000,
        "silicon": 0,
        "copper": 0,
        "gold": 0
      }
    }
  ],
  "notes": "",
  "suggestions": ""
}
```

The full file would contain all six proposed modules. Use ordinary numbers here
because all planner-scale counts are exactly representable integers. Do not feed
these values into the authoritative simulation.

#### Generated coordinate model

The coordinate model should be generated deterministically from the design
specification and seed. Internally prefer compact parallel arrays or typed arrays:

- `position`: flattened xyz coordinates in nanometres;
- `element`: small numeric element index;
- `module`: small numeric module index;
- `radiusPm`: derived from the selected radius convention;
- optional `bondPairs`: flattened atom-index pairs;
- optional `flags`: selected, surface, contact, warning, or hidden state.

Export may convert these arrays to readable JSON, but the browser should not keep
5,575 verbose atom objects in its hot rendering path.

### Coordinate-generation approach

The first generator is a geometric design tool, not a chemistry solver.

1. Create candidate carbon sites from diamond-like and graphitic lattice
   templates.
2. Carve the body envelope, ventral channel, assembly rail, and internal regions.
3. Construct the four anchors and two manipulators from bounded procedural
   centre-lines and carbon lattice candidates.
4. Select exactly the allocated carbon sites using deterministic ranking.
5. Populate silicon regions from separate lattice candidates or explicitly
   authored substitution sites.
6. Route copper along bounded conductive paths with collision checks.
7. Place gold only at declared contacts, field emitters, reference nodes, and tool
   termini.
8. Recenter the complete model and calculate its actual bounding box.
9. Build optional display bonds from element-pair distance windows.
10. Run every validation pass before marking the model canonical.

Coordinates should use nanometres. Physical data such as covalent radii and target
bond lengths should retain their source and units.

### Validation

#### Hard validity errors

- element totals do not exactly match the selected recipe;
- a module has negative or fractional atom counts;
- missing or duplicate atom identifiers in exported expanded form;
- non-finite coordinates;
- atoms outside a declared hard envelope without an appendage/module exemption;
- unacceptably close nuclei according to the selected element-pair threshold;
- a required module has no connected path to the main body;
- generation is nondeterministic for the same specification and seed.

#### Structural warnings

- disconnected atom clusters;
- carbon or silicon coordination above the configured limit;
- unsupported long copper chains;
- exposed high-energy edge or dangling-bond candidates;
- collision clearance that is visually valid but chemically doubtful;
- a module whose geometry cannot accommodate its assigned atoms;
- assembly or intake paths obstructed by another module;
- model dimensions inconsistent with recipe-derived dense volume.

#### Scientific-status warnings

Always retain visible warnings for:

- no validated mixed C–Si–Cu–Au force field;
- no quantum-mechanical stability calculation;
- no demonstrated room-temperature logical mechanism;
- no validated energy-transfer mechanism;
- no demonstrated atom-identification mechanism at this scale;
- no demonstrated universal daughter-fabrication pathway;
- missing surface-passivation elements in the canonical recipe.

“Exact atom count” and “physically proven” must remain separate statuses.

### Performance targets

- first useful viewport render within two seconds on an ordinary desktop;
- interactive rotation at a perceptually usable rate with all 5,575 atoms;
- no permanent animation or simulation loop when idle;
- visibility filtering without regenerating coordinates;
- bonds automatically culled or disabled when they dominate frame time;
- planner state must not affect simulation performance or save data.

### Persistence and change exchange

Use a versioned planner-only local-storage key such as:

`nanoswarm.nanite-planner.v1`

The copied change payload should contain:

- instruction not to implement until explicitly requested, when applicable;
- freeform suggestions;
- validation summary;
- canonical recipe and atom deltas;
- changed modules with before/after values;
- changed envelope or generation parameters;
- design seed;
- unresolved warnings.

Full export should contain the complete design specification. Coordinate export
should be optional because it is much larger and can be regenerated from the
specification and seed.

## Repository integration plan

Recommended first implementation files:

- `nanite-planner/index.html`
- `src/ui/nanite-planner.js`
- `src/ui/nanite-planner.css`
- `src/design/nanite.js`
- `src/design/nanite-model.js`
- `tests/nanite-design.test.js`
- `tests/nanite-model.test.js`
- updates to `scripts/build.js`
- navigation links from the other planner pages

Keep coordinate generation in `src/design/` as pure functions. UI code may edit a
draft specification and render a generated model but should not contain the
canonical calculation rules.

## Suggested implementation stages

### Stage A — exact budget workbench

- add the `/nanite-planner/` route and navigation;
- load the six-module N0 specification;
- implement module allocation editing;
- validate exact recipe totals and derived mass;
- add suggestions, persistence, import/export, and copied change payload;
- display a temporary module-level schematic without claiming atom coordinates.

### Stage B — deterministic atom cloud

- implement procedural coordinates and exact element counts;
- add canvas rotation, pan, zoom, fit, selection, and visibility filters;
- verify determinism and model bounds in tests;
- show actual generated dimensions and density estimate.

### Stage C — topology and warnings

- generate display bonds;
- calculate connected components and approximate coordination;
- add collision, path, envelope, and structural warnings;
- identify contacts, manipulators, intake, and assembly-rail overlays.

### Stage D — morphology comparison

- allow derived designs without changing the universal core recipe;
- represent Specialized Morphologies as attachments, replacements, coatings,
  payloads, or assembled multi-nanite structures;
- compare N0 with role-equipped variants;
- export morphology proposals for research-tree discussion.

### Stage E — optional physical modelling

- export XYZ or another standard coordinate format;
- evaluate suitable external atomistic tooling;
- investigate geometry minimisation only after selecting and documenting a model
  capable of representing the mixed material interfaces;
- report failures honestly rather than forcing unstable structures to appear
  validated.

## Acceptance criteria for the first actionable version

The first implementation is complete when:

- `/nanite-planner/` is included in the production build;
- it opens the N0 Seed Worker with the exact six-module allocation above;
- every edit immediately recalculates recipe deltas and mass;
- canonical status is impossible unless all four element totals match exactly;
- zoom, pan, rotate, fit, reset, and module/element filtering work;
- the same specification and seed always produce the same model;
- drafts persist without touching game saves;
- suggestions and change payloads can be copied;
- full design JSON can be imported and exported;
- relevant pure-function tests pass;
- the interface clearly distinguishes exact, unverified, and speculative claims;
- no new runtime dependency is introduced without an explicit decision.

## Open design questions

These are intentionally unresolved and should remain editable in the planner:

1. Should the N0 have four anchors and two manipulators, or a less animal-like
   three-anchor architecture?
2. How many persistent logical states can be justified without importing
   conventional CMOS assumptions?
3. Are copper paths continuous chains, embedded clusters, or distributed
   conductive sites?
4. Should gold be concentrated at a few durable contacts or divided among many
   single-atom field sites?
5. Does an N0 verify a daughter independently, or does validation require several
   neighbouring nanites?
6. Is movement a standard N0 capability, or is the initial seed effectively
   immobile until it has built a local assembly?
7. Which parts of atom recognition belong to one body and which are collective
   measurements across a cohort?
8. Should the canonical model expose a deliberately unresolved passivation
   problem as part of the story of its unknown manufacture?
9. Is the 40 pJ process cost retained after the physical model is examined, or
   later separated into assembly, atomisation, transport, and delivery losses?
10. At what research milestone does the player first see any part of this
    architecture rather than only the universal recipe?

## Recommended narrative position

The N0 should initially be described by behaviour, not by a complete human-readable
blueprint. The player is the growing swarm intelligence: its understanding of its
own body should deepen alongside its understanding of the world.

Early observations might identify:

- repeated structural motifs;
- a fixed four-element recipe;
- response channels corresponding to known elements;
- persistent role state;
- collective timing and error correction.

Later research can reveal that the seed body is not an optimal universal machine.
It is a compact bootstrap artefact designed to create the infrastructure from
which better tools, larger assemblies, and eventually post-human manufacturing
systems can emerge.
