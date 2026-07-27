const atomBudget = (carbon, silicon, copper, gold) => Object.freeze({ carbon, silicon, copper, gold });

export const NANITE_ELEMENTS = Object.freeze([
  Object.freeze({ id: "carbon", symbol: "C", name: "Carbon", atomicMassDa: 12.011, color: "#69f08a" }),
  Object.freeze({ id: "silicon", symbol: "Si", name: "Silicon", atomicMassDa: 28.085, color: "#72d5d5" }),
  Object.freeze({ id: "copper", symbol: "Cu", name: "Copper", atomicMassDa: 63.546, color: "#e0ae4e" }),
  Object.freeze({ id: "gold", symbol: "Au", name: "Gold", atomicMassDa: 196.96657, color: "#f5d76e" }),
]);

export const N0_SEED_WORKER = Object.freeze({
  version: 1,
  id: "n0-seed-worker",
  name: "N0 Seed Worker",
  canonical: true,
  seed: 5575,
  recipe: atomBudget(5000, 400, 150, 25),
  energyPj: 40,
  assemblyNaniteMs: 55000,
  envelopeNm: Object.freeze({ body: Object.freeze([5.5, 4.0, 3.5]), span: 7 }),
  modules: Object.freeze([
    Object.freeze({ id: "shell-truss", name: "Protective shell and central truss", description: "Diamondoid and graphitic load path, environmental shielding, and the fixed body envelope.", function: "Structural body", atoms: atomBudget(3000, 0, 0, 0) }),
    Object.freeze({ id: "anchor-actuators", name: "Four anchor-actuators", description: "Surface grip, strain switching, and alternating inchworm translation.", function: "Locomotion", atoms: atomBudget(800, 0, 48, 8) }),
    Object.freeze({ id: "assembly-manipulators", name: "Two assembly manipulators", description: "Local atom placement, inspection, and daughter alignment.", function: "Fabrication", atoms: atomBudget(500, 0, 0, 6) }),
    Object.freeze({ id: "intake-channel", name: "Intake and classification channel", description: "Ventral sensing path for routing released atoms into known and retained streams.", function: "Recognition", atoms: atomBudget(350, 64, 30, 0) }),
    Object.freeze({ id: "computational-substrate", name: "Computational substrate", description: "Finite-state sequencing, persistent flags, local error detection, and swarm contact.", function: "Control", atoms: atomBudget(350, 288, 24, 4) }),
    Object.freeze({ id: "timing-field-array", name: "Timing and field-control array", description: "Phase reference, positioning fields, and assembly-site control.", function: "Timing and fields", atoms: atomBudget(0, 48, 48, 7) }),
  ]),
  notes: "",
  suggestions: "",
});

export const cloneNanitePlan = () => structuredClone(N0_SEED_WORKER);

export function atomTotals(modules) {
  return modules.reduce((totals, module) => {
    for (const element of NANITE_ELEMENTS) totals[element.id] += Number(module.atoms?.[element.id] ?? 0);
    return totals;
  }, { carbon: 0, silicon: 0, copper: 0, gold: 0 });
}

export function massDa(atoms) {
  return NANITE_ELEMENTS.reduce((total, element) => total + Number(atoms[element.id] ?? 0) * element.atomicMassDa, 0);
}

export function validateNanitePlan(plan) {
  const invalid = [];
  const totals = atomTotals(plan.modules ?? []);
  const duplicateIds = new Set();
  const seenIds = new Set();
  for (const module of plan.modules ?? []) {
    if (!module.id || seenIds.has(module.id)) duplicateIds.add(module.id || "unnamed");
    seenIds.add(module.id);
    for (const element of NANITE_ELEMENTS) {
      const value = module.atoms?.[element.id];
      if (!Number.isSafeInteger(value) || value < 0) invalid.push(`${module.name || module.id || "Unnamed module"} · ${element.symbol}`);
    }
  }
  const deltas = { carbon: 0, silicon: 0, copper: 0, gold: 0 };
  for (const element of NANITE_ELEMENTS) deltas[element.id] = totals[element.id] - Number(plan.recipe?.[element.id] ?? 0);
  if (duplicateIds.size) invalid.push(`Duplicate module identifiers: ${[...duplicateIds].join(", ")}`);
  return { totals, deltas, invalid, exactRecipe: !invalid.length && NANITE_ELEMENTS.every((element) => deltas[element.id] === 0), massDa: massDa(totals) };
}
