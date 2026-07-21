import * as legacy from "./engine-legacy.js";
import {
  ALLOCATION_SHARE_SCALE,
  DIRECTIVES,
  RESEARCH,
} from "./content.js";
import {
  appendLog,
  cloneState,
  ensureMnemonicState,
  idleWorkers,
} from "./state.js";
import { formatCount } from "./quantities.js";

export * from "./engine-legacy.js";

const CORE_BOOTSTRAP_CAPACITY = 100n;

const failure = (state, reason) => {
  globalThis.__nanoswarmState = state;
  return { ok: false, state, reason };
};

const success = (state) => {
  globalThis.__nanoswarmState = state;
  return { ok: true, state };
};

function publish(state) {
  globalThis.__nanoswarmState = state;
  return state;
}

function activeResearchItem(state) {
  return state.researchQueue.find((item) => item.status === "active") ?? null;
}

function reusableMnemonicDivisor(state) {
  return state.completedResearch.includes("distributed-reasoning-mesh") ? 8n : 16n;
}

export function effectiveResearchCapacity(input) {
  const state = ensureMnemonicState(input);
  const active = activeResearchItem(state);
  const constructing = active?.memoryNanites ?? 0n;
  return CORE_BOOTSTRAP_CAPACITY + constructing + state.mnemonicNanites / reusableMnemonicDivisor(state);
}

function ensureQueueItem(item) {
  const definition = RESEARCH[item.id];
  if (!definition) return item;
  item.status ??= "queued";
  item.progressNaniteMs ??= 0n;
  item.memoryNanites ??= definition.memoryNanites;
  item.energyCost ??= definition.energyCost;
  item.startedAt ??= null;
  item.bankId ??= null;
  return item;
}

function initializeAllocationTargets(state) {
  if (state.nanites <= 0n) return;
  for (const directive of DIRECTIVES) {
    state.allocationTargets[directive] =
      ((state.allocations[directive] ?? 0n) * ALLOCATION_SHARE_SCALE) / state.nanites;
  }
}

function reconcileAllocations(state) {
  state.allocations.research = 0n;
  state.allocationTargets.research = 0n;
  state.allocationLocks.research = false;
  if (state.nanites <= 0n) {
    for (const directive of DIRECTIVES) state.allocations[directive] = 0n;
    return;
  }

  if (state.completedResearch.includes("relative-allocation")) {
    const rows = DIRECTIVES.map((directive, index) => {
      const scaled = state.nanites * (state.allocationTargets[directive] ?? 0n);
      return {
        directive,
        index,
        count: scaled / ALLOCATION_SHARE_SCALE,
        remainder: scaled % ALLOCATION_SHARE_SCALE,
      };
    });
    let assigned = rows.reduce((total, row) => total + row.count, 0n);
    const targetShare = DIRECTIVES.reduce(
      (total, directive) => total + (state.allocationTargets[directive] ?? 0n),
      0n,
    );
    const targetAssigned = state.nanites * (
      targetShare > ALLOCATION_SHARE_SCALE ? ALLOCATION_SHARE_SCALE : targetShare
    ) / ALLOCATION_SHARE_SCALE;
    rows.sort((left, right) => {
      if (left.remainder === right.remainder) return left.index - right.index;
      return left.remainder > right.remainder ? -1 : 1;
    });
    for (const row of rows) {
      if (assigned >= targetAssigned) break;
      row.count += 1n;
      assigned += 1n;
    }
    for (const row of rows) state.allocations[row.directive] = row.count;
    return;
  }

  const total = DIRECTIVES.reduce(
    (sum, directive) => sum + (state.allocations[directive] ?? 0n),
    0n,
  );
  if (total <= state.nanites || total <= 0n) return;
  let assigned = 0n;
  for (const directive of DIRECTIVES) {
    const next = (state.allocations[directive] ?? 0n) * state.nanites / total;
    state.allocations[directive] = next;
    assigned += next;
  }
  for (const directive of DIRECTIVES) {
    if (assigned >= state.nanites) break;
    state.allocations[directive] += 1n;
    assigned += 1n;
  }
}

function applyResearchEffects(state, definition) {
  if (!state.completedResearch.includes(definition.id)) state.completedResearch.push(definition.id);
  if (definition.id === "relative-allocation") {
    initializeAllocationTargets(state);
    reconcileAllocations(state);
  }
  if (definition.id === "residuum-indexing") state.discovery.residuumIndexed = true;
  if (definition.id === "ferromagnetic-phase-analysis") state.discovery.ironCatalogued = true;
  if (definition.id === "atmospheric-spectroscopy") state.discovery.atmosphereCatalogued = true;
  if (definition.id === "specialized-morphologies") state.discovery.behaviouralMorphologies = true;
}

function completeResearch(state, item, completionAt) {
  const definition = RESEARCH[item.id];
  state.researchQueue = state.researchQueue.filter((candidate) => candidate !== item);
  if (item.memoryNanites > 0n) {
    const bank = state.mnemonicBanks.find((candidate) => candidate.id === item.bankId);
    if (bank) {
      bank.status = "installed";
      bank.installedAt = completionAt;
    }
    state.mnemonicNanites += item.memoryNanites;
  } else {
    state.legacyCoreEncoding.push({
      researchId: item.id,
      kind: "bootstrap",
      completedAt: completionAt,
    });
  }
  applyResearchEffects(state, definition);

  const finalTime = state.simTime;
  state.simTime = completionAt;
  appendLog(state, `RESEARCH COMPLETE · ${definition.name.toUpperCase()}.`, "good", undefined, "medium");
  if (item.memoryNanites > 0n) {
    appendLog(
      state,
      `MNEMONIC BANK INSTALLED · ${formatCount(item.memoryNanites)} NANITES FIXED AS PERMANENT MEMORY.`,
      "good",
      undefined,
      "medium",
    );
  } else {
    appendLog(
      state,
      "BOOTSTRAP ARCHIVE UPDATED · NO ACTIVE ASSEMBLERS CONVERTED.",
      "good",
      undefined,
      "medium",
    );
  }
  appendLog(state, `COGNITIVE MODEL UPDATED · ${definition.effect.toUpperCase()}`, "good", undefined, "medium");
  state.simTime = finalTime;
}

function advanceMnemonicResearch(state, targetTime) {
  ensureMnemonicState(state);
  for (const item of state.researchQueue) ensureQueueItem(item);
  const from = Math.min(state.researchUpdatedAt ?? state.simTime, targetTime);
  const active = activeResearchItem(state);
  if (!active || targetTime <= from) {
    state.researchUpdatedAt = targetTime;
    return state;
  }

  const definition = RESEARCH[active.id];
  const capacity = effectiveResearchCapacity(state);
  const remaining = definition.requiredNaniteMs - active.progressNaniteMs;
  const availableMs = BigInt(targetTime - from);
  const possible = capacity * availableMs;
  if (possible < remaining) {
    active.progressNaniteMs += possible;
    state.researchUpdatedAt = targetTime;
    return state;
  }

  const duration = Number((remaining + capacity - 1n) / capacity);
  const completionAt = from + duration;
  active.progressNaniteMs = definition.requiredNaniteMs;
  completeResearch(state, active, completionAt);
  state.researchUpdatedAt = targetTime;
  return state;
}

function detachedLegacyAdvance(input, targetTime) {
  const state = ensureMnemonicState(cloneState(input));
  const queue = state.researchQueue;
  const updatedAt = state.researchUpdatedAt;
  state.researchQueue = [];
  const advanced = legacy.advanceSimulation(state, targetTime);
  advanced.researchQueue = queue;
  advanced.researchUpdatedAt = updatedAt;
  ensureMnemonicState(advanced);
  return advanced;
}

export function advanceSimulation(input, targetTime) {
  const state = detachedLegacyAdvance(input, targetTime);
  advanceMnemonicResearch(state, targetTime);
  return publish(state);
}

function restoreResearch(result, queue, updatedAt) {
  const state = result?.state ?? result;
  state.researchQueue = queue;
  state.researchUpdatedAt = updatedAt;
  ensureMnemonicState(state);
  publish(state);
  return result;
}

function invokeLegacyResult(input, now, invoke) {
  const state = advanceSimulation(input, now);
  const queue = state.researchQueue;
  const updatedAt = state.researchUpdatedAt;
  state.researchQueue = [];
  return restoreResearch(invoke(state), queue, updatedAt);
}

export function startManualJob(input, directive, now = Date.now()) {
  return invokeLegacyResult(input, now, (state) => legacy.startManualJob(state, directive, state.simTime));
}

export function startProspecting(input, now = Date.now()) {
  return invokeLegacyResult(input, now, (state) => legacy.startProspecting(state, state.simTime));
}

export function adjustAllocation(input, directive, delta, now = Date.now()) {
  if (directive === "research") return failure(advanceSimulation(input, now), "Research no longer uses temporary workforce allocation.");
  return invokeLegacyResult(input, now, (state) => legacy.adjustAllocation(state, directive, delta, state.simTime));
}

export function setDirectiveAllocationShare(input, directive, targetShare, now = Date.now()) {
  if (directive === "research") return failure(advanceSimulation(input, now), "Research no longer uses temporary workforce allocation.");
  return invokeLegacyResult(
    input,
    now,
    (state) => legacy.setDirectiveAllocationShare(state, directive, targetShare, state.simTime),
  );
}

export function setDirectiveAllocation(input, directive, target, now = Date.now()) {
  if (directive === "research") return failure(advanceSimulation(input, now), "Research no longer uses temporary workforce allocation.");
  return invokeLegacyResult(
    input,
    now,
    (state) => legacy.setDirectiveAllocation(state, directive, target, state.simTime),
  );
}

export function toggleAllocationLock(input, directive, now = Date.now()) {
  if (directive === "research") return advanceSimulation(input, now);
  return invokeLegacyResult(input, now, (state) => legacy.toggleAllocationLock(state, directive, state.simTime));
}

export function startTemporaryBurst(input, now = Date.now()) {
  return invokeLegacyResult(input, now, (state) => legacy.startTemporaryBurst(state, state.simTime));
}

export function cancelTemporaryBurst(input, now = Date.now()) {
  return invokeLegacyResult(input, now, (state) => legacy.cancelTemporaryBurst(state, state.simTime));
}

function validateResearch(state, definition) {
  if (definition.requiresStage !== undefined && state.stage < definition.requiresStage) {
    return `Research signal requires Stage ${definition.requiresStage}.`;
  }
  if (definition.requiresSearch !== undefined && state.prospecting.searchesCompleted < definition.requiresSearch) {
    return `Research signal requires material search ${definition.requiresSearch}.`;
  }
  if (definition.requiresDiscovery && !state.discovery[definition.requiresDiscovery]) {
    return "The required environmental signal has not been resolved.";
  }
  const missing = definition.requires.find((id) => !state.completedResearch.includes(id));
  if (missing) return `Prerequisite research incomplete: ${RESEARCH[missing].name}.`;
  if (definition.unlockNanites && state.nanites < definition.unlockNanites) {
    return `Research signal requires ${formatCount(definition.unlockNanites)} active nanites.`;
  }
  return null;
}

function beginResearchItem(state, item) {
  const definition = RESEARCH[item.id];
  if (activeResearchItem(state)) return failure(state, "Another mnemonic bank is already under construction.");
  if (state.energy < definition.energyCost) return failure(state, "Insufficient energy for mnemonic construction.");
  if (definition.memoryNanites > 0n) {
    if (state.nanites - definition.memoryNanites < 1n) {
      return failure(state, "Mnemonic construction must leave at least one active nanite.");
    }
    if (idleWorkers(state) < definition.memoryNanites) {
      return failure(
        state,
        `${formatCount(definition.memoryNanites)} idle nanites are required; running cohorts must return first.`,
      );
    }
  }

  state.energy -= definition.energyCost;
  state.lifetime.energySpent += definition.energyCost;
  item.status = "active";
  item.startedAt = state.simTime;
  item.progressNaniteMs = 0n;
  item.memoryNanites = definition.memoryNanites;
  item.energyCost = definition.energyCost;

  if (definition.memoryNanites > 0n) {
    state.nanites -= definition.memoryNanites;
    const bankId = `bank-${state.nextId}`;
    state.nextId += 1n;
    item.bankId = bankId;
    state.mnemonicBanks.push({
      id: bankId,
      researchId: item.id,
      nanites: definition.memoryNanites,
      status: "constructing",
      startedAt: state.simTime,
      installedAt: null,
      legacy: false,
    });
    reconcileAllocations(state);
    appendLog(
      state,
      `MNEMONIC CONSTRUCTION STARTED · ${definition.name.toUpperCase()} · ${formatCount(definition.memoryNanites)} ACTIVE NANITES COMMITTED.`,
      "warn",
      undefined,
      "medium",
    );
  } else {
    appendLog(
      state,
      `BOOTSTRAP RESEARCH STARTED · ${definition.name.toUpperCase()} · NO ACTIVE NANITES COMMITTED.`,
      "good",
      undefined,
      "medium",
    );
  }
  state.researchUpdatedAt = state.simTime;
  return success(state);
}

export function queueResearch(input, id, now = Date.now()) {
  const state = advanceSimulation(input, now);
  if (!state.discovery.researchVisible) return failure(state, "Research substrate has not been exposed.");
  if (state.completedResearch.includes(id) || state.researchQueue.some((item) => item.id === id)) {
    return failure(state, "Research is already queued or complete.");
  }
  const definition = RESEARCH[id];
  if (!definition) return failure(state, "Unknown research definition.");
  const validation = validateResearch(state, definition);
  if (validation) return failure(state, validation);

  const item = ensureQueueItem({
    id,
    status: "queued",
    progressNaniteMs: 0n,
    memoryNanites: definition.memoryNanites,
    energyCost: definition.energyCost,
    startedAt: null,
    bankId: null,
  });
  state.researchQueue.push(item);
  appendLog(state, `RESEARCH QUEUED · ${definition.name.toUpperCase()} · NO INPUTS RESERVED.`, "good");

  if (!activeResearchItem(state) && state.researchQueue[0] === item) {
    const started = beginResearchItem(state, item);
    if (!started.ok) {
      appendLog(state, `RESEARCH WAITING · ${definition.name.toUpperCase()} · ${started.reason.toUpperCase()}`, "warn");
      return success(state);
    }
  }
  return success(state);
}

export function startQueuedResearch(input, id, now = Date.now()) {
  const state = advanceSimulation(input, now);
  const item = state.researchQueue.find((candidate) => candidate.id === id);
  if (!item) return failure(state, "Research is not queued.");
  if (item.status === "active") return failure(state, "Research is already active.");
  const firstQueued = state.researchQueue.find((candidate) => candidate.status === "queued");
  if (firstQueued !== item) return failure(state, "Only the first waiting research topic may begin.");
  return beginResearchItem(state, item);
}

export function cancelResearch(input, id, now = Date.now()) {
  const state = advanceSimulation(input, now);
  const index = state.researchQueue.findIndex((item) => item.id === id);
  if (index < 0) return failure(state, "Research is not queued.");
  const item = state.researchQueue[index];
  if (item.status === "active") {
    return failure(state, "Active mnemonic construction is irreversible and cannot be cancelled.");
  }
  state.researchQueue.splice(index, 1);
  appendLog(state, `RESEARCH INTENT REMOVED · ${RESEARCH[id].name.toUpperCase()} · NO INPUTS WERE RESERVED.`, "muted");
  return success(state);
}

export function moveResearch(input, id, direction, now = Date.now()) {
  const state = advanceSimulation(input, now);
  const index = state.researchQueue.findIndex((item) => item.id === id);
  if (index < 0) return failure(state, "Research is not queued.");
  if (direction !== -1 && direction !== 1) return failure(state, "Invalid research queue direction.");
  if (state.researchQueue[index].status === "active") return failure(state, "Active mnemonic construction cannot be reordered.");
  const target = index + direction;
  if (target < 0 || target >= state.researchQueue.length) return failure(state, "Research is already at that end of the queue.");
  if (state.researchQueue[target].status === "active") return failure(state, "Waiting research cannot move ahead of the active bank.");
  [state.researchQueue[index], state.researchQueue[target]] = [
    state.researchQueue[target],
    state.researchQueue[index],
  ];
  appendLog(state, `RESEARCH QUEUE REORDERED · ${RESEARCH[id].name.toUpperCase()}.`, "muted");
  return success(state);
}

export function researchIsRevealed(state, definition) {
  return legacy.researchIsRevealed(state, definition);
}
