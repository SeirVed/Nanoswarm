import {
  ALLOCATION_SHARE_SCALE,
  ATMOSPHERE_ATOMS_PER_NANITE,
  ATOM_KEYS,
  COHORT_SYNC_WINDOW_MS,
  COHORT_RESONANCE_WINDOW_MS,
  COLLECTION_ATOMS_PER_NANITE,
  DIRECTIVES,
  ENERGY_PER_JOB,
  JOB_DURATION_MS,
  LOCAL_SHELL_COUNT,
  NANITE_RECIPE,
  RESEARCH,
  SORT_ATOMS_PER_NANITE,
  WORK_DIRECTIVES,
  createProspectedDeposit,
  emptyMatter,
} from "./content.js";
import {
  addAtoms,
  addMatter,
  matterFromAtomWeights,
  splitSortedMatter,
  takeMatterProportionally,
  totalMatter,
} from "./matter.js";
import { formatCount, formatEnergy, formatInventoryMass } from "./quantities.js";
import { activeResearchWorkers, activeWorkers, appendLog, cloneState, idleWorkers } from "./state.js";
import { researchIsUnlocked } from "./unlocks.js";

const minBigInt = (...values) => values.reduce((smallest, value) => (value < smallest ? value : smallest));
const ceilDiv = (value, divisor) => (divisor <= 0n ? 0n : (value + divisor - 1n) / divisor);
const hasResearch = (state, id) => state.completedResearch.includes(id);

function researchBonusBps(state, key) {
  return state.completedResearch.reduce(
    (total, id) => total + BigInt(RESEARCH[id]?.bonuses?.[key] ?? 0),
    0n,
  );
}

const applyThroughputBonus = (base, bonusBps) => base * (10_000n + bonusBps) / 10_000n;

export const solidCollectionCapacity = (state) =>
  applyThroughputBonus(COLLECTION_ATOMS_PER_NANITE, researchBonusBps(state, "solidBps"));
export const atmosphericCollectionCapacity = (state) =>
  applyThroughputBonus(
    solidCollectionCapacity(state) / (COLLECTION_ATOMS_PER_NANITE / ATMOSPHERE_ATOMS_PER_NANITE),
    researchBonusBps(state, "atmosphereBps"),
  );
export const sortingCapacity = (state) =>
  applyThroughputBonus(SORT_ATOMS_PER_NANITE, researchBonusBps(state, "sortingBps"));
export const energyJobYield = (state) =>
  applyThroughputBonus(ENERGY_PER_JOB, researchBonusBps(state, "energyBps"));
export const cohortSyncWindow = (state) =>
  hasResearch(state, "directive-compilation") ? 100 : COHORT_SYNC_WINDOW_MS;
export const cohortResonanceWindow = (state) =>
  hasResearch(state, "phase-locked-directive-bus") ? 8_000 : COHORT_RESONANCE_WINDOW_MS;
export function effectiveJobDuration(state, directive) {
  let reductionBps = directive === "collect" ? researchBonusBps(state, "collectDurationReductionBps") : 0n;
  if (directive !== "survey" && directive !== "prospect") {
    reductionBps += researchBonusBps(state, "allDurationReductionBps");
  }
  const retainedBps = 10_000n - (reductionBps > 9_000n ? 9_000n : reductionBps);
  return Math.max(100, Number(BigInt(JOB_DURATION_MS[directive]) * retainedBps / 10_000n));
}

export function directiveIsVisible(state, directive) {
  return directive !== "atmosphere" || state.discovery.atmosphereVisible;
}

function nextEntityId(state, prefix) {
  const id = `${prefix}-${state.nextId}`;
  state.nextId += 1n;
  return id;
}

function researchCoreCapacity(state) {
  const divisor = hasResearch(state, "distributed-computronium") ? 50n : 100n;
  const proportional = ceilDiv(state.nanites, divisor);
  return proportional > 100n ? proportional : 100n;
}

export function effectiveResearchCapacity(state) {
  return researchCoreCapacity(state) + activeResearchWorkers(state);
}

function atomRecipeCapacity(state) {
  return minBigInt(
    state.atoms.carbon / NANITE_RECIPE.atoms.carbon,
    state.atoms.silicon / NANITE_RECIPE.atoms.silicon,
    state.atoms.copper / NANITE_RECIPE.atoms.copper,
    state.atoms.gold / NANITE_RECIPE.atoms.gold,
    state.energy / NANITE_RECIPE.energy,
  );
}

export function replicationShortages(state) {
  const inFlight = allocationWorkersInFlight(state, "replicate");
  const shortfall = state.allocations.replicate - inFlight;
  const availableWorkers = idleWorkers(state);
  const requestedWorkers = shortfall < availableWorkers ? shortfall : availableWorkers;
  if (requestedWorkers <= 0n) return [];

  const resources = [
    { key: "energy", name: "energy", available: state.energy, perNanite: NANITE_RECIPE.energy },
    ...ATOM_KEYS.map((key) => ({
      key,
      name: key,
      available: state.atoms[key],
      perNanite: NANITE_RECIPE.atoms[key],
    })),
  ];
  return resources.flatMap((resource) => {
    const required = resource.perNanite * requestedWorkers;
    if (resource.available >= required) return [];
    return [{
      key: resource.key,
      name: resource.name,
      available: resource.available,
      required,
      missing: required - resource.available,
    }];
  });
}

function nextSyncBoundary(state, now) {
  const window = cohortSyncWindow(state);
  return Math.floor(now / window) * window + window;
}

function pendingSyncCohort(state, directive) {
  return state.cohorts
    .filter(
      (cohort) =>
        cohort.origin === "allocation" &&
        cohort.directive === directive &&
        cohort.startedAt >= state.simTime &&
        cohort.startedAt - state.simTime <= cohortSyncWindow(state),
    )
    .sort((left, right) => left.startedAt - right.startedAt)[0];
}

function mergePayload(target, addition) {
  if (target.kind !== addition.kind) throw new Error("Cannot merge unlike cohort payloads");
  if (target.kind === "energy") return { kind: "energy", energy: target.energy + addition.energy };
  if (target.kind === "collect") return { kind: "collect", matter: addMatter(target.matter, addition.matter) };
  if (target.kind === "sort") {
    return {
      kind: "sort",
      atoms: addAtoms(target.atoms, addition.atoms),
      residuum: addMatter(target.residuum, addition.residuum),
    };
  }
  if (target.kind === "replicate") {
    return { kind: "replicate", nanites: target.nanites + addition.nanites };
  }
  return target;
}

function atmosphericMatter(amount) {
  // Canonical dry-air constituent-atom ratio derived from N2/O2/Ar/CO2 abundance.
  return matterFromAtomWeights(amount, { nitrogen: 156_168n, oxygen: 41_976n, argon: 934n, carbon: 42n });
}

const knownAtomsAsMatter = (atoms) => ({ ...emptyMatter(), ...atoms });

function reserveJob(state, directive, requestedWorkers, origin) {
  const available = idleWorkers(state);
  let workers = requestedWorkers < available ? requestedWorkers : available;
  if (workers <= 0n) return 0n;

  let payload;
  if (directive === "survey") {
    workers = 1n;
    payload = { kind: "survey" };
  } else if (directive === "prospect") {
    if (state.prospecting.searchesCompleted >= LOCAL_SHELL_COUNT) return 0n;
    workers = 1n;
    payload = { kind: "prospect", depositIndex: state.prospecting.searchesCompleted + 1 };
  } else if (directive === "energy") {
    payload = { kind: "energy", energy: energyJobYield(state) * workers };
  } else if (directive === "collect") {
    const remaining = totalMatter(state.activeDeposit.matter);
    if (remaining <= 0n) return 0n;
    const capacityPerWorker = solidCollectionCapacity(state);
    const usefulWorkers = ceilDiv(remaining, capacityPerWorker);
    workers = workers < usefulWorkers ? workers : usefulWorkers;
    const { taken, remaining: depositMatter } = takeMatterProportionally(
      state.activeDeposit.matter,
      capacityPerWorker * workers,
    );
    state.activeDeposit.matter = depositMatter;
    payload = { kind: "collect", matter: taken };
  } else if (directive === "atmosphere") {
    payload = { kind: "collect", matter: atmosphericMatter(atmosphericCollectionCapacity(state) * workers) };
  } else if (directive === "sort") {
    const availableFeedstock = totalMatter(state.feedstock);
    if (availableFeedstock <= 0n) return 0n;
    const capacityPerWorker = sortingCapacity(state);
    const usefulWorkers = ceilDiv(availableFeedstock, capacityPerWorker);
    workers = workers < usefulWorkers ? workers : usefulWorkers;
    const { taken, remaining } = takeMatterProportionally(
      state.feedstock,
      capacityPerWorker * workers,
    );
    state.feedstock = remaining;
    payload = { kind: "sort", ...splitSortedMatter(taken) };
  } else if (directive === "replicate") {
    const capacity = atomRecipeCapacity(state);
    workers = workers < capacity ? workers : capacity;
    if (workers <= 0n) return 0n;
    state.energy -= NANITE_RECIPE.energy * workers;
    for (const key of ATOM_KEYS) state.atoms[key] -= NANITE_RECIPE.atoms[key] * workers;
    payload = { kind: "replicate", nanites: workers };
  } else {
    throw new Error(`Unknown job directive: ${directive}`);
  }

  const mergeTarget = origin === "allocation" ? pendingSyncCohort(state, directive) : undefined;
  const startedAt =
    origin === "allocation" ? (mergeTarget?.startedAt ?? nextSyncBoundary(state, state.simTime)) : state.simTime;

  if (mergeTarget) {
    mergeTarget.workers += workers;
    mergeTarget.payload = mergePayload(mergeTarget.payload, payload);
    return workers;
  }

  state.cohorts.push({
    id: nextEntityId(state, "cohort"),
    directive,
    workers,
    startedAt,
    completesAt: startedAt + effectiveJobDuration(state, directive),
    origin,
    payload,
  });
  return workers;
}

function allocationWorkersInFlight(state, directive) {
  return state.cohorts.reduce(
    (total, cohort) =>
      cohort.origin === "allocation" && cohort.directive === directive ? total + cohort.workers : total,
    0n,
  );
}

function noteDepositExhaustion(state) {
  if (
    !state.discovery.surveyComplete ||
    state.discovery.exhaustionNotified ||
    totalMatter(state.activeDeposit.matter) > 0n
  ) return;
  state.discovery.exhaustionNotified = true;
  appendLog(
    state,
    `SOLID SUBSTRATE EXHAUSTED · ${state.activeDeposit.name.toUpperCase()}.`,
    "warn",
    undefined,
    "critical",
  );
  appendLog(
    state,
    state.prospecting.searchesCompleted < LOCAL_SHELL_COUNT
      ? `REPLICATION GROWTH ${String(state.activeDeposit.limitingElement ?? "material").toUpperCase()}-LIMITED · LOCAL SURVEY REQUIRED.`
      : "AUTHORED LOCAL SOLID ENVELOPE EXHAUSTED · EXTERNAL MATERIAL SYSTEM REQUIRED.",
    "muted",
    undefined,
    "medium",
  );
}

function beginProspecting(state, origin) {
  const started = reserveJob(state, "prospect", 1n, origin);
  if (started <= 0n) return false;
  appendLog(
    state,
    `${origin === "autonomous" ? "AUTONOMOUS" : "LOCAL"} PROSPECTING COHORT DEPARTED · ${effectiveJobDuration(state, "prospect") / 1000}s.`,
    "good",
    undefined,
    "medium",
  );
  return true;
}

function scheduleAllocations(state) {
  noteDepositExhaustion(state);
  if (!state.discovery.directivesVisible) return;
  for (const directive of WORK_DIRECTIVES) {
    if (!directiveIsVisible(state, directive)) continue;
    const shortfall = state.allocations[directive] - allocationWorkersInFlight(state, directive);
    const converging = state.cohorts.some(
      (cohort) =>
        cohort.origin === "allocation" &&
        cohort.directive === directive &&
        cohort.completesAt > state.simTime &&
        cohort.completesAt - state.simTime <= cohortResonanceWindow(state),
    );
    if (shortfall > 0n && !converging) reserveJob(state, directive, shortfall, "allocation");
  }
  noteDepositExhaustion(state);
  if (
    hasResearch(state, "autonomous-prospecting") &&
    state.prospecting.searchesCompleted < LOCAL_SHELL_COUNT &&
    totalMatter(state.activeDeposit.matter) === 0n &&
    !state.cohorts.some((cohort) => cohort.directive === "prospect") &&
    idleWorkers(state) > 0n
  ) {
    beginProspecting(state, "autonomous");
  }
}

function initializeAllocationTargets(state) {
  if (!state.allocationTargets || state.nanites <= 0n) return;
  for (const directive of DIRECTIVES) {
    state.allocationTargets[directive] =
      (state.allocations[directive] * ALLOCATION_SHARE_SCALE) / state.nanites;
  }
}

function reconcileRelativeAllocations(state) {
  if (!state.completedResearch.includes("relative-allocation") || !state.allocationTargets) return;
  const targetTotal = DIRECTIVES.reduce(
    (total, directive) => total + state.allocationTargets[directive],
    0n,
  );
  const desiredAssigned =
    (state.nanites * targetTotal + ALLOCATION_SHARE_SCALE / 2n) / ALLOCATION_SHARE_SCALE;
  const apportionment = DIRECTIVES.map((directive, index) => {
    const scaled = state.nanites * state.allocationTargets[directive];
    return {
      directive,
      index,
      workers: scaled / ALLOCATION_SHARE_SCALE,
      remainder: scaled % ALLOCATION_SHARE_SCALE,
    };
  });
  let assigned = apportionment.reduce((total, item) => total + item.workers, 0n);
  apportionment.sort((left, right) => {
    if (left.remainder === right.remainder) return left.index - right.index;
    return left.remainder > right.remainder ? -1 : 1;
  });
  for (const item of apportionment) {
    if (assigned >= desiredAssigned) break;
    item.workers += 1n;
    assigned += 1n;
  }
  for (const item of apportionment) state.allocations[item.directive] = item.workers;
}

function completeCohort(state, cohort) {
  const payload = cohort.payload;
  if (payload.kind === "survey") {
    state.discovery.surveyComplete = true;
    state.activeDeposit.name = "Impact-fused DDR3 contact site";
    appendLog(state, "SUBSTRATE SURVEY COMPLETE.", "good", undefined, "medium");
    appendLog(state, "ARTIFICIAL POLYMER DETECTED.");
    appendLog(state, "COPPER CONDUCTOR DETECTED.");
    appendLog(state, "SILICON STRUCTURE DETECTED.");
    appendLog(state, "GOLD TRACE DETECTED.");
    appendLog(state, "OBJECT CLASSIFICATION: IMPACT-FUSED DDR3 CONTACT SITE", "good", undefined, "medium");
    appendLog(state, "MATERIAL RATIO MATCHES ONE WHOLE-NANITE RECIPE PACKET EXACTLY.", "good", undefined, "medium");
  } else if (payload.kind === "prospect") {
    state.depletedDeposits.push({
      id: state.activeDeposit.id,
      name: state.activeDeposit.name,
      initialAtoms: state.activeDeposit.initialAtoms,
      depletedAt: state.simTime,
    });
    state.activeDeposit = createProspectedDeposit(payload.depositIndex);
    state.prospecting.searchesCompleted = payload.depositIndex;
    state.discovery.exhaustionNotified = false;
    appendLog(
      state,
      `MATERIAL FIELD ACQUIRED · ${state.activeDeposit.name.toUpperCase()}.`,
      "good",
      undefined,
      "medium",
    );
    if (payload.depositIndex === LOCAL_SHELL_COUNT) {
      state.stage = 2;
      state.discovery.atmosphereVisible = true;
      appendLog(state, "STAGE 2 · ENVIRONMENTAL BREACH.", "good", undefined, "world");
      appendLog(state, "FERROMAGNETIC BULK PHASE DETECTED · ELEMENTAL CATALOG INSUFFICIENT.", "warn", undefined, "critical");
      appendLog(
        state,
        "ATMOSPHERIC ENVELOPE HARVESTABLE · DIFFUSE COLLECTION RATE 1.00% OF BASE SOLID MATERIAL.",
        "good",
        undefined,
        "medium",
      );
      appendLog(state, "RESEARCH SIGNAL RESOLVED · ATMOSPHERIC FRACTIONATION.", "good", undefined, "medium");
    }
    appendLog(
      state,
      `ACCESSIBLE SOLID INVENTORY · ${formatCount(totalMatter(state.activeDeposit.matter))} CONSTITUENT ATOMS · ≈${formatInventoryMass(state.activeDeposit.matter)}.`,
      "good",
      undefined,
      "medium",
    );
  } else if (payload.kind === "energy") {
    state.energy += payload.energy;
    appendLog(state, `ENERGY ACQUISITION COMPLETE · +${formatEnergy(payload.energy)}.`, "good");
  } else if (payload.kind === "collect") {
    const firstCollection = !state.discovery.feedstockVisible;
    state.feedstock = addMatter(state.feedstock, payload.matter);
    state.lifetime.collected = addMatter(state.lifetime.collected, payload.matter);
    state.discovery.feedstockVisible = true;
    appendLog(state, `${
      cohort.directive === "atmosphere" ? "ATMOSPHERIC HARVEST" : "COLLECTION RUN"
    } COMPLETE · ${formatCount(totalMatter(payload.matter))} constituent atoms · ≈${formatInventoryMass(payload.matter)} returned to Feedstock.`, "good");
    if (firstCollection) appendLog(state, "MIXED MATERIAL REQUIRES ELEMENTAL SORTING.", "muted", undefined, "medium");
  } else if (payload.kind === "sort") {
    const firstSort = !state.discovery.elementsVisible;
    state.atoms = addAtoms(state.atoms, payload.atoms);
    state.residuum = addMatter(state.residuum, payload.residuum);
    state.discovery.elementsVisible = true;
    state.discovery.residuumVisible = totalMatter(state.residuum) > 0n;
    state.discovery.researchVisible = true;
    const sortedMatter = addMatter(knownAtomsAsMatter(payload.atoms), payload.residuum);
    state.lifetime.processed = addMatter(state.lifetime.processed, sortedMatter);
    appendLog(
      state,
      `SORTING RUN COMPLETE · ${formatCount(totalMatter(sortedMatter))} constituent atoms · ≈${formatInventoryMass(sortedMatter)} processed.`,
      "good",
    );
    if (firstSort && state.discovery.residuumVisible) {
      appendLog(
        state,
        "UNRESOLVED MATTER RETAINED AS RESIDUUM FOR FUTURE RE-SORTING.",
        "muted",
        undefined,
        "medium",
      );
    }
  } else if (payload.kind === "replicate") {
    const previousNanites = state.nanites;
    state.nanites += payload.nanites;
    state.lifetime.spent = addMatter(state.lifetime.spent, knownAtomsAsMatter(
      Object.fromEntries(ATOM_KEYS.map((key) => [key, NANITE_RECIPE.atoms[key] * payload.nanites])),
    ));
    state.lifetime.energySpent += NANITE_RECIPE.energy * payload.nanites;
    reconcileRelativeAllocations(state);
    state.discovery.directivesVisible = state.nanites >= 2n;
    state.discovery.projectsVisible = true;
    appendLog(
      state,
      `REPLICATION COMPLETE · +${formatCount(payload.nanites)} ACTIVE NANITE${payload.nanites === 1n ? "" : "S"}.`,
      "good",
    );
    if (state.nanites === 2n) {
      state.stage = 1;
      appendLog(state, "STAGE 1 · ELECTRONIC BLOOM.", "good", undefined, "world");
      appendLog(state, "COHORT CONTROL AVAILABLE · DIRECTIVE ALLOCATIONS ONLINE.", "good", undefined, "medium");
      appendLog(state, "LONG-HORIZON PROJECT ENVELOPE DETECTED.", "muted", undefined, "medium");
    }
    if (previousNanites < 12n && state.nanites >= 12n) {
      appendLog(
        state,
        "RESEARCH SIGNAL RESOLVED · RELATIVE DIRECTIVE ALLOCATION.",
        "good",
        undefined,
        "medium",
      );
    }
  }
}

function nextResearchCompletion(state) {
  const item = state.researchQueue[0];
  if (!item) return null;
  const remaining = RESEARCH[item.id].requiredNaniteMs - item.progressNaniteMs;
  if (remaining <= 0n) return state.simTime;
  const duration = ceilDiv(remaining, effectiveResearchCapacity(state));
  const capped = duration > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : duration;
  return state.simTime + Number(capped);
}

function advanceResearch(state, deltaMs) {
  const item = state.researchQueue[0];
  if (item && deltaMs > 0) item.progressNaniteMs += effectiveResearchCapacity(state) * BigInt(deltaMs);
}

function completeResearchIfReady(state) {
  const item = state.researchQueue[0];
  if (!item) return false;
  const definition = RESEARCH[item.id];
  if (item.progressNaniteMs < definition.requiredNaniteMs) return false;
  state.researchQueue.shift();
  const spentCost = item.reservedCost ?? definition.cost;
  state.lifetime.spent = addMatter(state.lifetime.spent, knownAtomsAsMatter(spentCost.atoms));
  state.lifetime.energySpent += spentCost.energy;
  if (!state.completedResearch.includes(item.id)) state.completedResearch.push(item.id);
  if (item.id === "relative-allocation") {
    initializeAllocationTargets(state);
    reconcileRelativeAllocations(state);
  }
  if (item.id === "residuum-indexing") state.discovery.residuumIndexed = true;
  appendLog(state, `RESEARCH COMPLETE · ${definition.name.toUpperCase()}.`, "good", undefined, "medium");
  return true;
}

export function advanceSimulation(input, targetTime) {
  const state = cloneState(input);
  if (targetTime <= state.simTime) return state;
  scheduleAllocations(state);

  while (state.simTime < targetTime) {
    const cohortTime = state.cohorts.reduce(
      (soonest, cohort) => (soonest === null || cohort.completesAt < soonest ? cohort.completesAt : soonest),
      null,
    );
    const researchTime = nextResearchCompletion(state);
    let eventTime = targetTime;
    if (cohortTime !== null && cohortTime < eventTime) eventTime = cohortTime;
    if (researchTime !== null && researchTime < eventTime) eventTime = researchTime;

    const previousTime = state.simTime;
    advanceResearch(state, Math.max(0, eventTime - state.simTime));
    state.simTime = eventTime;

    const completed = state.cohorts.filter((cohort) => cohort.completesAt <= state.simTime);
    if (completed.length > 0) {
      state.cohorts = state.cohorts.filter((cohort) => cohort.completesAt > state.simTime);
      for (const cohort of completed) completeCohort(state, cohort);
    }
    const researchCompleted = completeResearchIfReady(state);
    scheduleAllocations(state);

    if (eventTime <= previousTime && completed.length === 0 && !researchCompleted) {
      throw new Error("Simulation stalled without a processable event");
    }
    if (eventTime === targetTime) break;
  }
  return state;
}

const failure = (state, reason) => ({ ok: false, state, reason });

export function startManualJob(input, directive, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (state.discovery.directivesVisible) return failure(state, "Use cohort allocations once directive control is online.");
  if (idleWorkers(state) < 1n) return failure(state, "The primary assembler is already committed to a job.");
  if (directive === "survey") {
    if (state.discovery.surveyComplete || state.cohorts.some((cohort) => cohort.directive === "survey")) {
      return failure(state, "The immediate substrate has already been surveyed.");
    }
  } else if (!state.discovery.surveyComplete) {
    return failure(state, "Survey the immediate substrate first.");
  }

  const started = reserveJob(state, directive, 1n, "manual");
  if (started <= 0n) {
    if (directive === "collect") return failure(state, "No accessible substrate remains in this deposit.");
    if (directive === "sort") return failure(state, "Feedstock is empty.");
    if (directive === "replicate") return failure(state, "Replication recipe incomplete.");
    return failure(state, "Unable to start this job.");
  }
  appendLog(state, `${directive.toUpperCase()} JOB STARTED · ${effectiveJobDuration(state, directive) / 1000}s.`);
  return { ok: true, state };
}

export function startProspecting(input, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (!state.discovery.surveyComplete) return failure(state, "Survey the immediate substrate first.");
  if (totalMatter(state.activeDeposit.matter) > 0n) {
    return failure(state, "Accessible solid matter remains in the active deposit.");
  }
  if (state.prospecting.searchesCompleted >= LOCAL_SHELL_COUNT) {
    return failure(state, "No additional local material shell has been identified.");
  }
  if (state.cohorts.some((cohort) => cohort.directive === "prospect")) {
    return failure(state, "A prospecting cohort is already searching the local environment.");
  }
  if (idleWorkers(state) < 1n) return failure(state, "One uncommitted nanite is required to begin prospecting.");
  noteDepositExhaustion(state);
  if (!beginProspecting(state, "local")) return failure(state, "Unable to launch a prospecting cohort.");
  return { ok: true, state };
}

export function adjustAllocation(input, directive, delta, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (!state.discovery.directivesVisible) return failure(state, "Cohort control is not yet available.");
  if (!DIRECTIVES.includes(directive) || !directiveIsVisible(state, directive)) {
    return failure(state, "Directive is not available to the active swarm.");
  }
  const nextValue = state.allocations[directive] + delta;
  if (nextValue < 0n) return failure(state, "Allocation cannot be negative.");
  if (delta > 0n && assignmentTotal(state) + delta > state.nanites) {
    return failure(state, "No unassigned nanites are available.");
  }
  state.allocations[directive] = nextValue;
  scheduleAllocations(state);
  return { ok: true, state };
}

function applyDirectiveAllocationShare(state, directive, targetShare) {
  if (!state.completedResearch.includes("relative-allocation")) {
    return failure(state, "Relative Directive Allocation research is incomplete.");
  }
  if (!DIRECTIVES.includes(directive)) return failure(state, "Unknown directive.");
  if (!directiveIsVisible(state, directive)) return failure(state, "Directive is not available to the active swarm.");
  if (targetShare < 0n || targetShare > ALLOCATION_SHARE_SCALE) {
    return failure(state, "Relative allocation is outside the active swarm.");
  }

  const currentShare = state.allocationTargets[directive];
  if (targetShare > currentShare) {
    const assignedShare = DIRECTIVES.reduce(
      (total, candidate) => total + state.allocationTargets[candidate],
      0n,
    );
    const unassignedShare = ALLOCATION_SHARE_SCALE - assignedShare;
    const requiredRelease = targetShare - currentShare - unassignedShare;
    if (requiredRelease > 0n) {
      const sources = DIRECTIVES.filter(
        (candidate) =>
          candidate !== directive &&
          !state.allocationLocks[candidate] &&
          state.allocationTargets[candidate] > 0n,
      );
      const available = sources.reduce(
        (total, candidate) => total + state.allocationTargets[candidate],
        0n,
      );
      if (available < requiredRelease) {
        return failure(state, "Locked directives leave too few nanites available for that allocation.");
      }

      const reductions = new Map();
      let released = 0n;
      for (const source of sources) {
        const reduction = (state.allocationTargets[source] * requiredRelease) / available;
        reductions.set(source, reduction);
        released += reduction;
      }
      let remainder = requiredRelease - released;
      for (const source of sources) {
        if (remainder <= 0n) break;
        if (reductions.get(source) < state.allocationTargets[source]) {
          reductions.set(source, reductions.get(source) + 1n);
          remainder -= 1n;
        }
      }
      for (const source of sources) state.allocationTargets[source] -= reductions.get(source);
    }
  }

  state.allocationTargets[directive] = targetShare;
  reconcileRelativeAllocations(state);
  scheduleAllocations(state);
  return { ok: true, state };
}

export function setDirectiveAllocationShare(input, directive, targetShare, now = Date.now()) {
  const state = advanceSimulation(input, now);
  return applyDirectiveAllocationShare(state, directive, targetShare);
}

export function setDirectiveAllocation(input, directive, target, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (target < 0n || target > state.nanites) return failure(state, "Allocation is outside the active swarm.");
  const targetShare =
    state.nanites <= 0n
      ? 0n
      : (target * ALLOCATION_SHARE_SCALE + state.nanites / 2n) / state.nanites;
  return applyDirectiveAllocationShare(state, directive, targetShare);
}

export function toggleAllocationLock(input, directive, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (!DIRECTIVES.includes(directive) || !directiveIsVisible(state, directive)) return state;
  state.allocationLocks[directive] = !state.allocationLocks[directive];
  return state;
}

export function queueResearch(input, id, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (!state.discovery.researchVisible) return failure(state, "Research substrate has not been exposed.");
  if (state.completedResearch.includes(id) || state.researchQueue.some((item) => item.id === id)) {
    return failure(state, "Research is already queued or complete.");
  }
  const definition = RESEARCH[id];
  if (!definition) return failure(state, "Unknown research definition.");
  if (definition.requiresDiscovery && !state.discovery[definition.requiresDiscovery]) {
    return failure(state, "The required environmental signal has not been resolved.");
  }
  const missingPrerequisite = definition.requires.find(
    (requirement) => !state.completedResearch.includes(requirement),
  );
  if (missingPrerequisite) return failure(state, `Prerequisite research incomplete: ${RESEARCH[missingPrerequisite].name}.`);
  if (definition.unlockNanites && state.nanites < definition.unlockNanites) {
    return failure(state, `Research signal requires ${formatCount(definition.unlockNanites)} active nanites.`);
  }
  if (state.energy < definition.cost.energy) return failure(state, "Insufficient energy.");
  for (const key of ATOM_KEYS) {
    if (state.atoms[key] < definition.cost.atoms[key]) return failure(state, `Insufficient ${key}.`);
  }
  state.energy -= definition.cost.energy;
  for (const key of ATOM_KEYS) state.atoms[key] -= definition.cost.atoms[key];
  state.researchQueue.push({
    id,
    progressNaniteMs: 0n,
    reservedCost: { energy: definition.cost.energy, atoms: { ...definition.cost.atoms } },
  });
  appendLog(state, `RESEARCH QUEUED · ${definition.name.toUpperCase()}.`);
  return { ok: true, state };
}

export function cancelResearch(input, id, now = Date.now()) {
  const state = advanceSimulation(input, now);
  const queueIndex = state.researchQueue.findIndex((item) => item.id === id);
  if (queueIndex < 0) return failure(state, "Research is not queued.");

  const [cancelled] = state.researchQueue.splice(queueIndex, 1);
  const definition = RESEARCH[cancelled.id];
  const reservedCost = cancelled.reservedCost ?? definition.cost;
  state.energy += reservedCost.energy;
  for (const key of ATOM_KEYS) state.atoms[key] += reservedCost.atoms[key];
  appendLog(
    state,
    `RESEARCH CANCELLED · ${definition.name.toUpperCase()} · RESERVED INPUTS RELEASED.`,
    "muted",
  );
  return { ok: true, state };
}

export function moveResearch(input, id, direction, now = Date.now()) {
  const state = advanceSimulation(input, now);
  const queueIndex = state.researchQueue.findIndex((item) => item.id === id);
  if (queueIndex < 0) return failure(state, "Research is not queued.");
  if (direction !== -1 && direction !== 1) return failure(state, "Invalid research queue direction.");
  const targetIndex = queueIndex + direction;
  if (targetIndex < 0 || targetIndex >= state.researchQueue.length) {
    return failure(state, "Research is already at that end of the queue.");
  }

  [state.researchQueue[queueIndex], state.researchQueue[targetIndex]] = [
    state.researchQueue[targetIndex],
    state.researchQueue[queueIndex],
  ];
  appendLog(state, `RESEARCH QUEUE REORDERED · ${RESEARCH[id].name.toUpperCase()}.`, "muted");
  return { ok: true, state };
}

export function researchIsRevealed(state, definition) {
  return researchIsUnlocked(state, definition);
}

export function assignmentTotal(state) {
  return Object.values(state.allocations).reduce((total, count) => total + count, 0n);
}

export function inFlightWorkers(state) {
  return activeWorkers(state);
}
