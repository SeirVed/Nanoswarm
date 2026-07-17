import { ATOM_KEYS, MATTER_KEYS, emptyMatter } from "./content.js";

export function totalMatter(matter) {
  return MATTER_KEYS.reduce((total, key) => total + matter[key], 0n);
}

export function addMatter(left, right) {
  return Object.fromEntries(MATTER_KEYS.map((key) => [key, left[key] + right[key]]));
}

export function subtractMatter(left, right) {
  return Object.fromEntries(MATTER_KEYS.map((key) => [key, left[key] - right[key]]));
}

export function addAtoms(left, right) {
  return Object.fromEntries(ATOM_KEYS.map((key) => [key, left[key] + right[key]]));
}

/** Remove an exact atom count while preserving composition as closely as integers permit. */
export function takeMatterProportionally(source, requested) {
  const total = totalMatter(source);
  const amount = requested < total ? requested : total;
  if (amount <= 0n || total <= 0n) return { taken: emptyMatter(), remaining: { ...source } };

  const taken = emptyMatter();
  const remainders = [];
  let allocated = 0n;
  for (const key of MATTER_KEYS) {
    const numerator = source[key] * amount;
    taken[key] = numerator / total;
    allocated += taken[key];
    remainders.push({ key, remainder: numerator % total });
  }
  remainders.sort((a, b) =>
    a.remainder === b.remainder ? a.key.localeCompare(b.key) : a.remainder > b.remainder ? -1 : 1,
  );
  let remainderAtoms = amount - allocated;
  for (const entry of remainders) {
    if (remainderAtoms <= 0n) break;
    if (taken[entry.key] < source[entry.key]) {
      taken[entry.key] += 1n;
      remainderAtoms -= 1n;
    }
  }
  return { taken, remaining: subtractMatter(source, taken) };
}

export function splitSortedMatter(input) {
  return {
    atoms: Object.fromEntries(ATOM_KEYS.map((key) => [key, input[key]])),
    residuum: { carbon: 0n, silicon: 0n, copper: 0n, gold: 0n, unknown: input.unknown },
  };
}
