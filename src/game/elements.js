export const ELEMENT_KEYS = Object.freeze([
  "carbon", "silicon", "copper", "gold",
  "hydrogen", "oxygen", "nitrogen", "tin", "silver", "nickel", "aluminum",
  "calcium", "magnesium", "iron", "manganese", "zinc", "chlorine", "argon",
  "bromine", "palladium", "chromium", "lead", "antimony", "molybdenum",
  "cobalt", "potassium", "sodium", "phosphorus", "sulfur", "neon", "helium",
  "krypton", "xenon", "titanium", "unknown",
]);

export const ATOMIC_WEIGHT_MILLI_U = Object.freeze({
  hydrogen: 1_008n,
  helium: 4_003n,
  carbon: 12_011n,
  nitrogen: 14_007n,
  oxygen: 15_999n,
  neon: 20_180n,
  sodium: 22_990n,
  magnesium: 24_305n,
  aluminum: 26_982n,
  silicon: 28_086n,
  phosphorus: 30_974n,
  sulfur: 32_060n,
  chlorine: 35_450n,
  argon: 39_948n,
  potassium: 39_098n,
  calcium: 40_078n,
  titanium: 47_867n,
  chromium: 51_996n,
  manganese: 54_938n,
  iron: 55_845n,
  cobalt: 58_933n,
  nickel: 58_693n,
  copper: 63_546n,
  zinc: 65_380n,
  bromine: 79_904n,
  krypton: 83_798n,
  molybdenum: 95_950n,
  palladium: 106_420n,
  silver: 107_868n,
  tin: 118_710n,
  antimony: 121_760n,
  xenon: 131_293n,
  gold: 196_967n,
  lead: 207_200n,
  // Legacy saves did not retain the identity of unresolved atoms.
  unknown: 28_000n,
});

export const U_TO_YOCTOGRAMS_NUMERATOR = 1_660_539n;
export const U_TO_YOCTOGRAMS_DENOMINATOR = 1_000_000n;

export const emptyElementMatter = () =>
  Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 0n]));

/** Build an exact atom inventory targeting a fixed mass and fixed integer mass-part recipe. */
export function matterForMassComposition(targetYoctograms, massParts) {
  const matter = emptyElementMatter();
  const totalParts = Object.values(massParts).reduce((total, part) => total + BigInt(part), 0n);
  if (targetYoctograms <= 0n || totalParts <= 0n) return matter;
  const targetWeightedMilliU =
    targetYoctograms * 1_000n * U_TO_YOCTOGRAMS_DENOMINATOR /
    U_TO_YOCTOGRAMS_NUMERATOR;
  for (const [key, rawPart] of Object.entries(massParts)) {
    const part = BigInt(rawPart);
    const weightedShare = targetWeightedMilliU * part / totalParts;
    matter[key] = weightedShare / ATOMIC_WEIGHT_MILLI_U[key];
  }
  return matter;
}
