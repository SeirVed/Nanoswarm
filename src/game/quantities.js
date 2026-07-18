const COUNT_SCIENTIFIC_THRESHOLD = 100_000_000n;
const ATOMIC_WEIGHT_MILLI_U = Object.freeze({
  carbon: 12_011n,
  silicon: 28_085n,
  copper: 63_546n,
  gold: 196_967n,
  // Unresolved matter is displayed using a silicon/nitrogen-scale average only.
  unknown: 28_000n,
});
const U_TO_YOCTOGRAMS_NUMERATOR = 1_660_539n;
const U_TO_YOCTOGRAMS_DENOMINATOR = 1_000_000n;

const ENERGY_UNITS = Object.freeze([
  "pJ", "nJ", "µJ", "mJ", "J", "kJ", "MJ", "GJ", "TJ", "PJ", "EJ", "ZJ", "YJ", "RJ", "QJ",
]);
const MASS_UNITS = Object.freeze([
  "yg", "zg", "ag", "fg", "pg", "ng", "µg", "mg", "g", "kg", "Mg", "Gg", "Tg", "Pg", "Eg", "Zg", "Yg", "Rg", "Qg",
]);

const commaInteger = (value) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function scaledLeadingNumber(value, decimalExponent) {
  const digits = value.toString();
  const taken = Math.min(15, digits.length);
  return Number(digits.slice(0, taken)) * 10 ** (digits.length - taken - decimalExponent);
}

export function formatCount(value) {
  const sign = value < 0n ? "−" : "";
  const absolute = value < 0n ? -value : value;
  if (absolute <= COUNT_SCIENTIFIC_THRESHOLD) return `${sign}${commaInteger(absolute)}`;
  const exponent = absolute.toString().length - 1;
  return `${sign}${scaledLeadingNumber(absolute, exponent).toPrecision(4)} × 10^${exponent}`;
}

function formatEngineeringInteger(value, units, significantDigits = 6) {
  const sign = value < 0n ? "−" : "";
  const absolute = value < 0n ? -value : value;
  if (absolute === 0n) return `${sign}${Number(0).toPrecision(significantDigits)} ${units[0]}`;
  const digits = absolute.toString().length;
  const unitIndex = Math.min(Math.floor((digits - 1) / 3), units.length - 1);
  const decimalExponent = unitIndex * 3;
  const scaled = scaledLeadingNumber(absolute, decimalExponent);
  return `${sign}${scaled.toPrecision(significantDigits)} ${units[unitIndex]}`;
}

export const formatEnergy = (picojoules) => formatEngineeringInteger(picojoules, ENERGY_UNITS);
export const formatMass = (yoctograms) => formatEngineeringInteger(yoctograms, MASS_UNITS);

export function massYoctograms(inventory) {
  const weightedMilliU = Object.entries(ATOMIC_WEIGHT_MILLI_U).reduce(
    (total, [key, atomicWeight]) => total + (inventory[key] ?? 0n) * atomicWeight,
    0n,
  );
  return (
    weightedMilliU * U_TO_YOCTOGRAMS_NUMERATOR /
    (1_000n * U_TO_YOCTOGRAMS_DENOMINATOR)
  );
}

export const formatInventoryMass = (inventory) => formatMass(massYoctograms(inventory));
