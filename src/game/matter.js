import { ATOM_KEYS, MATTER_KEYS, emptyMatter } from "./content.js";

export function totalMatter(matter) {
  return MATTER_KEYS.reduce((total, key) => total + (matter[key] ?? 0n), 0n);
}

export function addMatter(left, right) {
  return Object.fromEntries(MATTER_KEYS.map((key) => [key, (left[key] ?? 0n) + (right[key] ?? 0n)]));
}

export function subtractMatter(left, right) {
  return Object.fromEntries(MATTER_KEYS.map((key) => [key, (left[key] ?? 0n) - (right[key] ?? 0n)]));
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
    const numerator = (source[key] ?? 0n) * amount;
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
    if (taken[entry.key] < (source[entry.key] ?? 0n)) {
      taken[entry.key] += 1n;
      remainderAtoms -= 1n;
    }
  }
  return { taken, remaining: subtractMatter(source, taken) };
}

export function splitSortedMatter(input) {
  const residuum = emptyMatter();
  for (const key of MATTER_KEYS) {
    if (!ATOM_KEYS.includes(key)) residuum[key] = input[key] ?? 0n;
  }
  return {
    atoms: Object.fromEntries(ATOM_KEYS.map((key) => [key, input[key] ?? 0n])),
    residuum,
  };
}

/** Allocate an exact atom count across a fixed integer atom-ratio recipe. */
export function matterFromAtomWeights(amount, weights) {
  const source = emptyMatter();
  const totalWeight = Object.values(weights).reduce((total, weight) => total + BigInt(weight), 0n);
  if (amount <= 0n || totalWeight <= 0n) return source;
  const remainders = [];
  let allocated = 0n;
  for (const [key, rawWeight] of Object.entries(weights)) {
    const numerator = amount * BigInt(rawWeight);
    source[key] = numerator / totalWeight;
    allocated += source[key];
    remainders.push({ key, remainder: numerator % totalWeight });
  }
  remainders.sort((left, right) =>
    left.remainder === right.remainder
      ? left.key.localeCompare(right.key)
      : left.remainder > right.remainder ? -1 : 1,
  );
  let remainder = amount - allocated;
  for (const entry of remainders) {
    if (remainder <= 0n) break;
    source[entry.key] += 1n;
    remainder -= 1n;
  }
  return source;
}
