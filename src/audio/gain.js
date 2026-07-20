export const SONIC_OUTPUT_MULTIPLIER = 2;

export function sonicOutputGain(volume) {
  const normalized = Math.max(0, Math.min(1, Number(volume)));
  return Math.max(0.0001, normalized * SONIC_OUTPUT_MULTIPLIER);
}
