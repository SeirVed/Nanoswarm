import {
  ALLOCATION_SHARE_SCALE,
  ATOM_KEYS,
  COHORT_SYNC_WINDOW_MS,
  COHORT_RESONANCE_WINDOW_MS,
  COLLECTION_ATOMS_PER_NANITE,
  DIRECTIVES,
  ENERGY_PER_JOB,
  JOB_DURATION_MS,
  NANITE_RECIPE,
  RESEARCH,
  SORT_ATOMS_PER_NANITE,
  WORK_DIRECTIVES,
} from "./content.js";
import { addAtoms, addMatter, splitSortedMatter, takeMatterProportionally, totalMatter } from "./matter.js";
import { activeWorkers, appendLog, cloneState, idleWorkers } from "./state.js";

const minBigInt = (...values) => values.reduce((smallest, value) => (value < smallest ? value : smallest));
const ceilDiv = (value, divisor) => (divisor <= 0n ? 0n : (value + divisor - 1n) / divisor);

function nextEntityId(state, prefix) {
  const id = `${prefix}-${state.nextId}`;
  state.nextId += 1n;
  return id;
}

function researchCoreCapacity(state) {
  const onePercent = ceilDiv(state.nanites, 100n);
  return onePercent > 100n ? onePercent : 100n;
}

export function effectiveResearchCapacity(state) {
  return researchCoreCapacity(state) + state.allocations.research;
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

function nextSyncBoundary(now) {
  return Math.floor(now / COHORT_SYNC_WINDOW_MS) * COHORT_SYNC_WINDOW_MS + COHORT_SYNC_WINDOW_MS;
}

function pendingSyncCohort(state, directive) {
  return state.cohorts
    .filter(
      (cohort) =>
        cohort.origin === "allocation" &&
        cohort.directive === directive &&
        cohort.startedAt >= state.simTime &&
        cohort.startedAt - state.simTime <= COHORT_SYNC_WINDOW_MS,
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

function reserveJob(state, directive, requestedWorkers, origin) {
  const available = idleWorkers(state);
  let workers = requestedWorkers < available ? requestedWorkers : available;
  if (workers <= 0n) return 0n;

  let payload;
  if (directive === "survey") {
    workers = 1n;
    payload = { kind: "survey" };
  } else if (directive === "energy") {
    payload = { kind: "energy", energy: ENERGY_PER_JOB * workers };
  } else if (directive === "collect") {
    const remaining = totalMatter(state.activeDeposit.matter);
    if (remaining <= 0n) return 0n;
    const usefulWorkers = ceilDiv(remaining, COLLECTION_ATOMS_PER_NANITE);
    workers = workers < usefulWorkers ? workers : usefulWorkers;
    const { taken, remaining: depositMatter } = takeMatterProportionally(
      state.activeDeposit.matter,
      COLLECTION_ATOMS_PER_NANITE * workers,
    );
    state.activeDeposit.matter = depositMatter;
    payload = { kind: "collect", matter: taken };
  } else if (directive === "sort") {
    const availableFeedstock = totalMatter(state.feedstock);
    if (availableFeedstock <= 0n) return 0n;
    const usefulWorkers = ceilDiv(availableFeedstock, SORT_ATOMS_PER_NANITE);
    workers = workers < usefulWorkers ? workers : usefulWorkers;
    const { taken, remaining } = takeMatterProportionally(
      state.feedstock,
      SORT_ATOMS_PER_NANITE * workers,
    );
    state.feedstock = remaining;
    payload = { kind: "sort", ...splitSortedMatter(taken) };
  } else {
    const capacity = atomRecipeCapacity(state);
    workers = workers < capacity ? workers : capacity;
    if (workers <= 0n) return 0n;
    state.energy -= NANITE_RECIPE.energy * workers;
    for (const key of ATOM_KEYS) state.atoms[key] -= NANITE_RECIPE.atoms[key] * workers;
    payload = { kind: "replicate", nanites: workers };
  }

  const mergeTarget = origin === "allocation" ? pendingSyncCohort(state, directive) : undefined;
  const startedAt =
    origin === "allocation" ? (mergeTarget?.startedAt ?? nextSyncBoundary(state.simTime)) : state.simTime;

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
    completesAt: startedAt + JOB_DURATION_MS[directive],
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

function scheduleAllocations(state) {
  if (!state.discovery.directivesVisible) return;
  for (const directive of WORK_DIRECTIVES) {
    const shortfall = state.allocations[directive] - allocationWorkersInFlight(state, directive);
    const converging = state.cohorts.some(
      (cohort) =>
        cohort.origin === "allocation" &&
        cohort.directive === directive &&
        cohort.completesAt > state.simTime &&
        cohort.completesAt - state.simTime <= COHORT_RESONANCE_WINDOW_MS,
    );
    if (shortfall > 0n && !converging) reserveJob(state, directive, shortfall, "allocation");
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
    state.activeDeposit.name = "DDR3 SDRAM package · damaged";
    appendLog(state, "SUBSTRATE SURVEY COMPLETE.", "good", undefined, "medium");
    appendLog(state, "ARTIFICIAL POLYMER DETECTED.");
    appendLog(state, "COPPER CONDUCTOR DETECTED.");
    appendLog(state, "SILICON STRUCTURE DETECTED.");
    appendLog(state, "GOLD TRACE DETECTED.");
    appendLog(state, "OBJECT CLASSIFICATION: DDR3 SDRAM PACKAGE · DAMAGED", "good", undefined, "medium");
  } else if (payload.kind === "energy") {
    state.energy += payload.energy;
    appendLog(state, `ENERGY ACQUISITION COMPLETE · +${payload.energy} pJ.`, "good");
  } else if (payload.kind === "collect") {
    const firstCollection = !state.discovery.feedstockVisible;
    state.feedstock = addMatter(state.feedstock, payload.matter);
    state.discovery.feedstockVisible = true;
    appendLog(
      state,
      `COLLECTION RUN COMPLETE · ${totalMatter(payload.matter)} constituent atoms returned to Feedstock.`,
      "good",
    );
    if (firstCollection) appendLog(state, "MIXED MATERIAL REQUIRES ELEMENTAL SORTING.", "muted", undefined, "medium");
  } else if (payload.kind === "sort") {
    const firstSort = !state.discovery.elementsVisible;
    state.atoms = addAtoms(state.atoms, payload.atoms);
    state.residuum = addMatter(state.residuum, payload.residuum);
    state.discovery.elementsVisible = true;
    state.discovery.residuumVisible = totalMatter(state.residuum) > 0n;
    state.discovery.researchVisible = true;
    appendLog(state, "SORTING RUN COMPLETE · IDENTIFIED ELEMENTS TRANSFERRED TO STORAGE.", "good");
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
    reconcileRelativeAllocations(state);
    state.discovery.directivesVisible = state.nanites >= 2n;
    state.discovery.projectsVisible = true;
    appendLog(
      state,
      `REPLICATION COMPLETE · +${payload.nanites} ACTIVE NANITE${payload.nanites === 1n ? "" : "S"}.`,
      "good",
    );
    if (state.nanites === 2n) {
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
  if (!state.completedResearch.includes(item.id)) state.completedResearch.push(item.id);
  if (item.id === "relative-allocation") {
    initializeAllocationTargets(state);
    reconcileRelativeAllocations(state);
  }
  appendLog(state, `RESEARCH COMPLETE · ${definition.name.toUpperCase()}.`, "good", undefined, "medium");
  return true;
}

export function advanceSimulation(input, targetTime) {
  const state = cloneState(input);
  if (targetTime <= state.simTime) return state;
  scheduleAllocations(state);

  let eventsProcessed = 0;
  while (state.simTime < targetTime) {
    const cohortTime = state.cohorts.reduce(
      (soonest, cohort) => (soonest === null || cohort.completesAt < soonest ? cohort.completesAt : soonest),
      null,
    );
    const researchTime = nextResearchCompletion(state);
    let eventTime = targetTime;
    if (cohortTime !== null && cohortTime < eventTime) eventTime = cohortTime;
    if (researchTime !== null && researchTime < eventTime) eventTime = researchTime;

    advanceResearch(state, Math.max(0, eventTime - state.simTime));
    state.simTime = eventTime;

    const completed = state.cohorts.filter((cohort) => cohort.completesAt <= state.simTime);
    if (completed.length > 0) {
      state.cohorts = state.cohorts.filter((cohort) => cohort.completesAt > state.simTime);
      for (const cohort of completed) completeCohort(state, cohort);
    }
    const researchCompleted = completeResearchIfReady(state);
    scheduleAllocations(state);

    eventsProcessed += completed.length + (researchCompleted ? 1 : 0);
    if (eventsProcessed > 100_000) throw new Error("Simulation event safety limit exceeded");
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
  appendLog(state, `${directive.toUpperCase()} JOB STARTED · ${JOB_DURATION_MS[directive] / 1000}s.`);
  return { ok: true, state };
}

export function adjustAllocation(input, directive, delta, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (!state.discovery.directivesVisible) return failure(state, "Cohort control is not yet available.");
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
  if (definition.unlockNanites && state.nanites < definition.unlockNanites) {
    return failure(state, `Research signal requires ${definition.unlockNanites} active nanites.`);
  }
  if (state.energy < definition.cost.energy) return failure(state, "Insufficient energy.");
  for (const key of ATOM_KEYS) {
    if (state.atoms[key] < definition.cost.atoms[key]) return failure(state, `Insufficient ${key}.`);
  }
  state.energy -= definition.cost.energy;
  for (const key of ATOM_KEYS) state.atoms[key] -= definition.cost.atoms[key];
  state.researchQueue.push({ id, progressNaniteMs: 0n });
  appendLog(state, `RESEARCH QUEUED · ${definition.name.toUpperCase()}.`);
  return { ok: true, state };
}

export function assignmentTotal(state) {
  return Object.values(state.allocations).reduce((total, count) => total + count, 0n);
}

export function inFlightWorkers(state) {
  return activeWorkers(state);
}
