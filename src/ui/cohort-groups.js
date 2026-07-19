export const COHORT_SLOT_ORDER = Object.freeze([
  "replicate",
  "collect",
  "atmosphere",
  "energy",
  "sort",
  "prospect",
]);

export const COHORT_SLOT_LABEL = Object.freeze({
  replicate: "Replication",
  collect: "Mass collection",
  atmosphere: "Atmospheric collection",
  energy: "Energy collection",
  sort: "Sorting",
  prospect: "Local search",
});

export function groupCohortsForDisplay(cohorts) {
  const groups = new Map();
  for (const cohort of cohorts) {
    if (!groups.has(cohort.directive)) groups.set(cohort.directive, []);
    groups.get(cohort.directive).push(cohort);
  }

  return COHORT_SLOT_ORDER.flatMap((directive) => {
    const matching = groups.get(directive);
    if (!matching) return [];
    const phases = [...matching].sort((left, right) => left.completesAt - right.completesAt);
    return [{
      directive,
      phases,
      lead: phases[0],
      workers: phases.reduce((total, cohort) => total + cohort.workers, 0n),
      spread: phases.at(-1).completesAt - phases[0].completesAt,
    }];
  });
}
