import { RESEARCH } from "./content.js";

export function researchIsUnlocked(state, definition) {
  if (state.completedResearch.includes(definition.id)) return true;
  if (definition.unlockNanites && state.nanites < definition.unlockNanites) return false;
  if (definition.requiresDiscovery && !state.discovery[definition.requiresDiscovery]) return false;
  return definition.requires.every((requirement) => state.completedResearch.includes(requirement));
}

export function acknowledgeUnlockIds(state, ids) {
  state.seenUnlocks ??= [];
  let changed = false;
  for (const id of ids) {
    if (!id || state.seenUnlocks.includes(id)) continue;
    state.seenUnlocks.push(id);
    changed = true;
  }
  return changed;
}

export function unlockedIdsForState(state) {
  const ids = [];
  if (state.discovery.surveyComplete) ids.push("substrate", "directive:collect", "directive:energy");
  if (state.discovery.feedstockVisible) ids.push("materials", "directive:sort");
  if (state.discovery.elementsVisible) ids.push("elements", "directive:replicate");
  if (state.discovery.residuumVisible) ids.push("residuum");
  if (state.discovery.directivesVisible) ids.push("allocations");
  if (state.discovery.atmosphereVisible) ids.push("directive:atmosphere");
  if (
    state.discovery.exhaustionNotified ||
    (state.prospecting?.searchesCompleted ?? 0) > 0 ||
    state.cohorts.some((cohort) => cohort.directive === "prospect")
  ) {
    ids.push("directive:prospect");
  }
  if (state.discovery.researchVisible) {
    ids.push("research");
    for (const definition of Object.values(RESEARCH)) {
      if (researchIsUnlocked(state, definition)) ids.push(`research:${definition.id}`);
    }
  }
  if (state.discovery.projectsVisible) ids.push("projects");
  return ids;
}
