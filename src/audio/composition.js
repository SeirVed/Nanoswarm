export const PI_DIGITS = "314159265358979323846264338327950288419716939937510";
export const E_DIGITS = "271828182845904523536028747135266249775724709369995";

export const SONIC_DIRECTIVES = Object.freeze(["energy", "collect", "atmosphere", "sort", "replicate", "research"]);

const DIRECTIVE_COLOUR = Object.freeze({
  energy: 2,
  collect: 0,
  atmosphere: 9,
  sort: 5,
  replicate: 7,
  research: 11,
});

const CHORD_INTERVALS = Object.freeze({
  idle: Object.freeze([0, 7, 12, 19]),
  energy: Object.freeze([0, 2, 7, 9]),
  collect: Object.freeze([0, 5, 7, 12]),
  atmosphere: Object.freeze([0, 2, 9, 14]),
  sort: Object.freeze([0, 3, 7, 10]),
  replicate: Object.freeze([0, 4, 7, 11]),
  research: Object.freeze([0, 7, 11, 14]),
});

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const digitAt = (digits, index) => Number(digits[Math.abs(index) % digits.length]);

function decimalLog10(value) {
  if (value <= 0n) return 0;
  const text = value.toString();
  const significantLength = Math.min(6, text.length);
  const leading = Number(text.slice(0, significantLength)) / 10 ** (significantLength - 1);
  return text.length - 1 + Math.log10(leading);
}

function seedReasoningCapacity(state) {
  const onePercent = (state.nanites + 99n) / 100n;
  return onePercent > 100n ? onePercent : 100n;
}

export function deriveActivity(state) {
  const weights = Object.fromEntries(SONIC_DIRECTIVES.map((directive) => [directive, 0n]));
  let cohortWorkers = 0n;
  for (const cohort of state.cohorts) {
    cohortWorkers += cohort.workers;
    if (cohort.directive in weights) weights[cohort.directive] += cohort.workers;
  }
  if (state.researchQueue.length > 0) {
    const available = state.nanites > cohortWorkers ? state.nanites - cohortWorkers : 0n;
    const activeResearchers = state.allocations.research < available ? state.allocations.research : available;
    weights.research = seedReasoningCapacity(state) + activeResearchers;
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0n);
  const ratios = Object.fromEntries(
    SONIC_DIRECTIVES.map((directive) => [
      directive,
      total === 0n ? 0 : Number((weights[directive] * 1_000_000n) / total) / 1_000_000,
    ]),
  );
  const dominant =
    total === 0n
      ? "idle"
      : SONIC_DIRECTIVES.reduce((leader, directive) =>
          weights[directive] > weights[leader] ? directive : leader,
        );

  const discoveries = Object.values(state.discovery).filter(Boolean).length;
  const swarmAwakening = clamp(decimalLog10(state.nanites + 1n) / 8, 0, 1);
  const discoveryAwakening = discoveries / Math.max(1, Object.keys(state.discovery).length);
  const awakening = clamp(0.04 + swarmAwakening * 0.62 + discoveryAwakening * 0.34, 0.04, 1);
  const ratioSignature = SONIC_DIRECTIVES.map((directive) => Math.round(ratios[directive] * 100)).join(":");

  return Object.freeze({
    weights: Object.freeze(weights),
    ratios: Object.freeze(ratios),
    total,
    dominant,
    awakening,
    signature: `${ratioSignature}|${Math.floor(awakening * 12)}`,
  });
}

export function deriveHarmony(activity, section = 0) {
  const weightedColour = Math.round(
    SONIC_DIRECTIVES.reduce(
      (sum, directive) => sum + activity.ratios[directive] * DIRECTIVE_COLOUR[directive],
      0,
    ),
  );
  const rootSemitone =
    (digitAt(PI_DIGITS, section) + digitAt(E_DIGITS, section * 3 + 1) * 2 + weightedColour) % 12;
  const baseFrequency = 38.89 * 2 ** (rootSemitone / 12);
  const intervals = CHORD_INTERVALS[activity.dominant] ?? CHORD_INTERVALS.idle;
  const frequencies = intervals.map((interval) => baseFrequency * 2 ** (interval / 12));

  return Object.freeze({
    rootSemitone,
    dominant: activity.dominant,
    intervals,
    frequencies: Object.freeze(frequencies),
  });
}

export function derivePatternStep(step, activity, section = 0) {
  const piDigit = digitAt(PI_DIGITS, step + section);
  const eDigit = digitAt(E_DIGITS, step * 2 + section);
  const gate = 1 + Math.floor(activity.awakening * 7);
  const intervalSeconds =
    (3.8 - activity.awakening * 2.35) * (0.86 + eDigit / 45);

  return Object.freeze({
    play: (piDigit + eDigit + section) % 10 < gate,
    intervalSeconds: clamp(intervalSeconds, 0.72, 4.8),
    chordIndex: (piDigit + eDigit + section) % 4,
    octave: eDigit >= 7 ? 2 : 1,
    accent: piDigit === 2 || piDigit === 3 || piDigit === 5 || piDigit === 7,
  });
}
