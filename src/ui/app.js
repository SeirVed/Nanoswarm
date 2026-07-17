import {
  ALLOCATION_SHARE_SCALE,
  ATOM_KEYS,
  COHORT_RESONANCE_WINDOW_MS,
  COHORT_SYNC_WINDOW_MS,
  DIRECTIVES,
  DIRECTIVE_LABEL,
  INTRO_LOG,
  JOB_DURATION_MS,
  LOG_TIERS,
  NANITE_RECIPE,
  RESEARCH,
} from "../game/content.js";
import {
  adjustAllocation,
  advanceSimulation,
  assignmentTotal,
  effectiveResearchCapacity,
  queueResearch,
  setDirectiveAllocation,
  setDirectiveAllocationShare,
  startManualJob,
  toggleAllocationLock,
} from "../game/engine.js";
import { totalMatter } from "../game/matter.js";
import { createInitialState, idleWorkers } from "../game/state.js";
import { clearGame, loadGame, saveGame } from "../game/storage.js";
import { SyntheticMind } from "../audio/mind.js";

const root = document.querySelector("#root");
const sonicMind = new SyntheticMind();
let state = loadGame();
let introVisible = 0;
let notice = null;
let noticeTimer = null;
let lastSave = Date.now();
let lastStructuralSignature = null;
let activeLogTier = "all";

const formatInteger = (value) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const formatScientific = (value) => {
  const text = value.toString();
  if (text.length <= 9) return formatInteger(value);
  let exponent = text.length - 1;
  let significand = BigInt(text.slice(0, 4));
  if (Number(text[4] ?? "0") >= 5) significand += 1n;
  if (significand >= 10_000n) {
    significand = 1_000n;
    exponent += 1;
  }
  const digits = significand.toString().padStart(4, "0");
  return `${digits[0]}.${digits.slice(1)}e${exponent}`;
};
const formatDuration = (milliseconds) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
const cohortTimeLabel = (startedAt, completesAt, now) =>
  now < startedAt
    ? `SYNC ${Math.max(0, (startedAt - now) / 1000).toFixed(1)}s`
    : formatDuration(completesAt - now);
const percentage = (part, whole) => {
  if (whole <= 0n) return "0.0%";
  const tenths = (part * 1_000n + whole / 2n) / whole;
  return `${tenths / 10n}.${tenths % 10n}%`;
};
const progressBar = (progress, label = "", startedAt, completesAt) => `
  <div class="progress-wrap" aria-label="${label}" ${
    startedAt === undefined ? "" : `data-start="${startedAt}" data-end="${completesAt}"`
  }>
    <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(1, progress)) * 100}%"></div></div>
    ${label ? `<span>${label}</span>` : ""}
  </div>`;

function renderIntro() {
  root.innerHTML = `
    <main class="arrival-shell" aria-label="NanoSwarm arrival telemetry">
      <section class="arrival-terminal">
        <div class="terminal-status"><span>DEEP-TIME TRANSIT RECORD</span><span class="status-light">RECEIVING</span></div>
        <div class="arrival-log" aria-live="polite">
          ${INTRO_LOG.slice(0, introVisible)
            .map(
              (entry) => `<div class="arrival-line tone-${entry.tone ?? "system"}">
                <time>${entry.elapsedLabel}</time><span>${entry.message}</span>
              </div>`,
            )
            .join("")}
          <span class="cursor" aria-hidden="true"></span>
        </div>
        ${
          introVisible >= INTRO_LOG.length
            ? `<div class="begin-zone">
                <button class="terminal-button begin-button" data-action="begin">BEGIN</button>
                <p>ASSUME LOCAL DIRECTIVE AUTHORITY · AWAKEN SONIC MIND</p>
              </div>`
            : ""
        }
      </section>
    </main>`;
}

function groupedCohorts() {
  const groups = new Map();
  for (const cohort of state.cohorts) {
    if (!groups.has(cohort.directive)) groups.set(cohort.directive, []);
    groups.get(cohort.directive).push(cohort);
  }
  return [...groups.entries()].map(([directive, cohorts]) => {
    const phases = [...cohorts].sort((left, right) => left.completesAt - right.completesAt);
    return {
      directive,
      phases,
      lead: phases[0],
      workers: phases.reduce((total, cohort) => total + cohort.workers, 0n),
      spread: phases.at(-1).completesAt - phases[0].completesAt,
    };
  });
}

function operationsHtml(now) {
  const active = state.cohorts[0];
  if (state.discovery.directivesVisible) {
    const groups = groupedCohorts();
    return `<section class="panel operations-panel">
      <header class="panel-heading"><span>ACTIVE COHORTS · ${groups.length} DIRECTIVES</span><span>SYNC ${COHORT_SYNC_WINDOW_MS}ms · RESONANCE ${(
        COHORT_RESONANCE_WINDOW_MS / 1000
      ).toFixed(1)}s</span></header>
      <div class="cohort-list">
        ${
          groups.length === 0
            ? `<p class="empty-state">NO JOBS IN FLIGHT</p>`
            : groups
                .map(
                  (group) => `<div class="cohort-row">
                    <div><strong>${group.directive.toUpperCase()}</strong><small>${formatInteger(group.workers)} workers · ${
                      group.phases.length === 1
                        ? "resonant cohort"
                        : `${group.phases.length} phases converging · Δ${(group.spread / 1000).toFixed(1)}s`
                    }</small></div>
                    ${progressBar(
                      (now - group.lead.startedAt) / (group.lead.completesAt - group.lead.startedAt),
                      cohortTimeLabel(group.lead.startedAt, group.lead.completesAt, now),
                      group.lead.startedAt,
                      group.lead.completesAt,
                    )}
                  </div>`,
                )
                .join("")
        }
      </div>
    </section>`;
  }

  if (active) {
    return `<section class="panel operations-panel">
      <header class="panel-heading"><span>PRIMARY ASSEMBLER</span><span>COMMITTED</span></header>
      <div class="active-job">
        <div class="eyebrow">ACTIVE DISCRETE JOB</div><strong>${active.directive.toUpperCase()}</strong>
        ${progressBar(
          (now - active.startedAt) / (active.completesAt - active.startedAt),
          cohortTimeLabel(active.startedAt, active.completesAt, now),
          active.startedAt,
          active.completesAt,
        )}
        <div class="job-meta"><span>WORKERS ${active.workers}</span><span>OUTPUT ON COMPLETION</span></div>
      </div>
    </section>`;
  }

  if (!state.discovery.surveyComplete) {
    return `<section class="panel operations-panel">
      <header class="panel-heading"><span>PRIMARY ASSEMBLER</span><span>AVAILABLE</span></header>
      <div class="first-command">
        <p>Local environment unresolved. No economic directives are safe.</p>
        <button class="terminal-button primary-action" data-action="start" data-directive="survey">
          SURVEY IMMEDIATE SUBSTRATE <span>10s · 1 nanite</span>
        </button>
      </div>
    </section>`;
  }

  const actions = [
    ["collect", "Collect material", "Return a discrete mixed payload to Feedstock."],
    ["sort", "Sort feedstock", "Extract known elements; retain the remainder."],
    ["energy", "Acquire energy", "Charge from the module's electrical potential."],
    ["replicate", "Replicate nanite", "Consume one complete atomic recipe."],
  ];
  return `<section class="panel operations-panel">
    <header class="panel-heading"><span>PRIMARY ASSEMBLER</span><span>AVAILABLE</span></header>
    <div class="manual-actions">
      ${actions
        .filter(([directive]) =>
          directive === "sort"
            ? state.discovery.feedstockVisible
            : directive === "replicate"
              ? state.discovery.elementsVisible
              : true,
        )
        .map(
          ([directive, label, hint]) => `<button class="action-row" data-action="start" data-directive="${directive}">
            <span><strong>${label}</strong><small>${hint}</small></span><em>${JOB_DURATION_MS[directive] / 1000}s</em>
          </button>`,
        )
        .join("")}
    </div>
  </section>`;
}

function resourcesHtml() {
  const depositTotal = totalMatter(state.activeDeposit.matter);
  const substrate = state.discovery.surveyComplete
    ? `<section class="panel substrate-panel">
        <header class="panel-heading"><span>LOCAL SUBSTRATE</span><span>${percentage(depositTotal, state.activeDeposit.initialAtoms)} REMAINS</span></header>
        <strong>${state.activeDeposit.name}</strong>
        <p>Artificial polymer · silicon die · copper trace · gold bond material</p>
        <small>${formatScientific(depositTotal)} constituent atoms accessible</small>
      </section>`
    : "";

  if (!state.discovery.feedstockVisible) return substrate;
  const material = `<section class="panel resources-panel">
    <header class="panel-heading"><span>MATERIAL CONTROL</span><span>EXACT INVENTORY</span></header>
    <div class="resource-summary">
      <div><span>FEEDSTOCK</span><strong>${formatInteger(totalMatter(state.feedstock))} atoms</strong><small>mixed · unsorted</small></div>
      <div><span>ENERGY</span><strong>${formatInteger(state.energy)} pJ</strong><small>locally stored</small></div>
      ${
        state.discovery.residuumVisible
          ? `<div><span>RESIDUUM</span><strong>${formatInteger(totalMatter(state.residuum))} atoms</strong><small>retained · unresolved</small></div>`
          : ""
      }
    </div>
    ${
      state.discovery.elementsVisible
        ? `<div class="section-rule"><span>IDENTIFIED ELEMENTS</span></div>
          <div class="atom-grid">
            ${[
              ["carbon", "C", "Carbon"],
              ["silicon", "Si", "Silicon"],
              ["copper", "Cu", "Copper"],
              ["gold", "Au", "Gold"],
            ]
              .map(
                ([key, symbol, name]) => `<div class="atom-card">
                  <span class="atom-symbol">${symbol}</span><span>${name}</span>
                  <strong>${formatInteger(state.atoms[key])}</strong>
                  <small>recipe ${formatInteger(NANITE_RECIPE.atoms[key])}</small>
                </div>`,
              )
              .join("")}
          </div>`
        : ""
    }
  </section>`;
  return `<div class="resource-stack">${substrate}${material}</div>`;
}

function allocationsHtml() {
  if (!state.discovery.directivesVisible) return "";
  const unassigned = state.nanites - assignmentTotal(state);
  const relativeAllocation = state.completedResearch.includes("relative-allocation");
  return `<section class="panel allocation-panel">
    <header class="panel-heading"><span>DIRECTIVE ALLOCATION</span><span>${formatInteger(unassigned)} UNASSIGNED${
      relativeAllocation ? " · RELATIVE AUTO" : ""
    }</span></header>
    <div class="allocation-list">
      ${DIRECTIVES.map((directive) => {
        const locked = state.allocationLocks[directive];
        const shareHundredths = relativeAllocation
          ? (state.allocationTargets[directive] * 10_000n + ALLOCATION_SHARE_SCALE / 2n) /
            ALLOCATION_SHARE_SCALE
          : 0n;
        return `<div class="allocation-row ${relativeAllocation ? "relative" : ""}">
          <div class="allocation-label"><span>${DIRECTIVE_LABEL[directive]}</span><small>${
            directive === "research" ? "core capacity applies" : "complete jobs only"
          }</small></div>
          <button class="step-button" data-action="adjust" data-directive="${directive}" data-delta="-1" ${
            state.allocations[directive] === 0n ? "disabled" : ""
          }>−</button>
          ${
            relativeAllocation
              ? `<input class="allocation-input" type="text" inputmode="numeric" value="${formatInteger(
                  state.allocations[directive],
                )}" data-action="set-count" data-directive="${directive}" aria-label="${DIRECTIVE_LABEL[directive]} nanites">`
              : `<output>${formatInteger(state.allocations[directive])}</output>`
          }
          <button class="step-button" data-action="adjust" data-directive="${directive}" data-delta="1" ${
            (!relativeAllocation && unassigned === 0n) || state.allocations[directive] >= state.nanites ? "disabled" : ""
          }>+</button>
          <button class="lock-button ${locked ? "locked" : ""}" data-action="lock" data-directive="${directive}" aria-pressed="${locked}">${
            locked ? "LOCK" : "OPEN"
          }</button>
          ${
            relativeAllocation
              ? `<label class="relative-allocation"><input type="range" min="0" max="10000" step="1" value="${shareHundredths}" data-action="set-share" data-directive="${directive}" aria-label="${DIRECTIVE_LABEL[directive]} persistent relative share"><span>${
                  shareHundredths / 100n
                }.${(shareHundredths % 100n).toString().padStart(2, "0")}%</span></label>`
              : ""
          }
        </div>`;
      }).join("")}
    </div>
    <p class="panel-note">${
      relativeAllocation
        ? "Relative targets auto-allocate new nanites. Changes draw proportionally from other open directives; locks preserve protected shares. Running cohorts still finish indivisibly."
        : "Running cohorts finish their current indivisible job before a reduced assignment takes effect."
    }</p>
  </section>`;
}

function researchHtml() {
  if (!state.discovery.researchVisible) return "";
  const active = state.researchQueue[0];
  const capacity = effectiveResearchCapacity(state);
  const activeHtml = active
    ? `<div class="active-research"><div class="eyebrow">ACTIVE RESEARCH JOB</div><strong>${RESEARCH[active.id].name}</strong>
        <div class="progress-wrap" data-research-progress>
          <div class="progress-track"><div class="progress-fill" style="width:${
            Number((active.progressNaniteMs * 10_000n) / RESEARCH[active.id].requiredNaniteMs) / 100
          }%"></div></div>
          <span>${formatDuration(Number((RESEARCH[active.id].requiredNaniteMs - active.progressNaniteMs + capacity - 1n) / capacity))}</span>
        </div></div>`
    : `<p class="empty-state">NO ACTIVE RESEARCH JOB</p>`;

  return `<section class="panel research-panel">
    <header class="panel-heading"><span>RESEARCH QUEUE</span><span>${formatInteger(capacity)} n-eq</span></header>
    <div class="research-capacity"><span>COMPUTRONIUM CONTRIBUTION</span><strong>max(100 nanites, 1% swarm)</strong></div>
    ${activeHtml}
    <div class="research-list">
      ${Object.values(RESEARCH)
        .filter((definition) => !definition.unlockNanites || state.nanites >= definition.unlockNanites)
        .map((definition) => {
          const queued = state.researchQueue.some((item) => item.id === definition.id);
          const complete = state.completedResearch.includes(definition.id);
          return `<article class="research-card"><div><strong>${definition.name}</strong><p>${definition.description}</p>
            <small>C ${definition.cost.atoms.carbon} · Si ${definition.cost.atoms.silicon} · Cu ${definition.cost.atoms.copper} · Au ${definition.cost.atoms.gold} · E ${definition.cost.energy}</small>
            </div><button class="terminal-button compact-button" data-action="research" data-research="${definition.id}" ${
              queued || complete ? "disabled" : ""
            }>${complete ? "COMPLETE" : queued ? "QUEUED" : "QUEUE"}</button></article>`;
        })
        .join("")}
    </div>
  </section>`;
}

function projectsHtml() {
  if (!state.discovery.projectsVisible) return "";
  return `<section class="panel project-panel">
    <header class="panel-heading"><span>LONG-HORIZON PROJECTS</span><span>1 DETECTED</span></header>
    <div class="project-card"><div class="project-index">LAN—01</div><strong>Lanthanide Definition</strong>
      <p>Construct the analytical substrate required to distinguish the lanthanide series from retained matter.</p>
      <div class="project-estimate"><span>PRIMITIVE-SCALE ESTIMATE</span><strong>~90 REAL DAYS</strong></div>
      <small>Requirements unresolved · visible by design · progress not started</small>
    </div>
  </section>`;
}

function logHtml() {
  const visibleLog = activeLogTier === "all" ? state.log : state.log.filter((entry) => entry.tier === activeLogTier);
  const tierCounts = Object.fromEntries(
    LOG_TIERS.map((tier) => [tier, state.log.filter((entry) => entry.tier === tier).length]),
  );
  return `<section class="panel log-panel">
    <header class="panel-heading"><span>RUNNING LOG</span><span>${String(visibleLog.length).padStart(3, "0")} / ${String(
      state.log.length,
    ).padStart(3, "0")} EVENTS</span></header>
    <nav class="log-filters" aria-label="Running log event tier">
      ${[
        ["all", state.log.length],
        ...LOG_TIERS.map((tier) => [tier, tierCounts[tier]]),
      ]
        .map(
          ([tier, count]) => `<button class="log-filter tier-${tier} ${activeLogTier === tier ? "active" : ""}" data-action="log-filter" data-tier="${tier}" aria-pressed="${
            activeLogTier === tier
          }"><span>${tier.toUpperCase()}</span><strong>${String(count).padStart(2, "0")}</strong></button>`,
        )
        .join("")}
    </nav>
    <div class="telemetry-log" role="log" aria-live="polite">
      ${visibleLog.map((entry) => {
        const elapsed = Math.max(0, entry.at - state.createdAt + 9_247);
        const label = entry.elapsedLabel ?? (elapsed < 60_000 ? `+${(elapsed / 1000).toFixed(3)}s` : `+${Math.floor(elapsed / 60_000)}m`);
        return `<div class="telemetry-line tone-${entry.tone}"><time>${label}</time><span class="tier-badge tier-${entry.tier}">${entry.tier.toUpperCase()}</span><span>${entry.message}</span></div>`;
      }).join("")}
      ${visibleLog.length === 0 ? `<p class="log-empty">NO ${activeLogTier.toUpperCase()} EVENTS RECORDED</p>` : ""}
      <div id="log-end"></div>
    </div>
  </section>`;
}

function structuralSignature() {
  return [
    state.nanites,
    state.energy,
    totalMatter(state.feedstock),
    totalMatter(state.residuum),
    totalMatter(state.activeDeposit.matter),
    ...ATOM_KEYS.map((key) => state.atoms[key]),
    ...state.cohorts.flatMap((cohort) => [cohort.id, cohort.directive, cohort.workers, cohort.startedAt, cohort.completesAt]),
    ...DIRECTIVES.map((directive) => `${state.allocations[directive]}:${state.allocationLocks[directive]}`),
    ...Object.values(state.discovery),
    state.researchQueue.map((item) => item.id).join(","),
    state.completedResearch.join(","),
    state.log.length,
    activeLogTier,
    ...DIRECTIVES.map((directive) => state.allocationTargets?.[directive] ?? 0n),
    sonicMind.enabled,
    sonicMind.volumePercent,
    notice ?? "",
  ].join("|");
}

function updateDynamicProgress(now) {
  for (const bar of document.querySelectorAll(".progress-wrap[data-start]")) {
    const start = Number(bar.dataset.start);
    const end = Number(bar.dataset.end);
    const fill = bar.querySelector(".progress-fill");
    const label = bar.querySelector(":scope > span");
    if (fill) fill.style.width = `${Math.max(0, Math.min(1, (now - start) / (end - start))) * 100}%`;
    if (label) label.textContent = cohortTimeLabel(start, end, now);
  }
  const researchBar = document.querySelector("[data-research-progress]");
  const active = state.researchQueue[0];
  if (researchBar && active) {
    const definition = RESEARCH[active.id];
    const capacity = effectiveResearchCapacity(state);
    const fill = researchBar.querySelector(".progress-fill");
    const label = researchBar.querySelector(":scope > span");
    if (fill) fill.style.width = `${Number((active.progressNaniteMs * 10_000n) / definition.requiredNaniteMs) / 100}%`;
    if (label) {
      label.textContent = formatDuration(
        Number((definition.requiredNaniteMs - active.progressNaniteMs + capacity - 1n) / capacity),
      );
    }
  }
}

function renderGame(now = Date.now(), force = false) {
  sonicMind.observe(state, now);
  const signature = structuralSignature();
  if (!force && signature === lastStructuralSignature) {
    updateDynamicProgress(now);
    return;
  }
  const previousLog = document.querySelector(".telemetry-log");
  const wasAtBottom = previousLog ? previousLog.scrollHeight - previousLog.scrollTop - previousLog.clientHeight < 40 : true;
  const depositTotal = totalMatter(state.activeDeposit.matter);
  root.innerHTML = `<div class="game-shell">
    <header class="game-header">
      <div class="brand-lockup"><span class="brand-mark">◈</span><div><h1>NANOSWARM</h1><p>LOCAL DIRECTIVE AUTHORITY · SEED 01</p></div></div>
      <div class="header-metrics"><div><span>ACTIVE NANITES</span><strong>${formatInteger(state.nanites)}</strong></div>
        ${state.discovery.surveyComplete ? `<div class="substrate-metric"><span>SUBSTRATE</span><strong>${percentage(depositTotal, state.activeDeposit.initialAtoms)}</strong></div>` : ""}
        <div class="audio-controls">
          <button class="audio-toggle ${sonicMind.enabled ? "active" : ""}" data-action="audio" aria-pressed="${sonicMind.enabled}" ${
            sonicMind.isSupported ? "" : "disabled"
          }><i aria-hidden="true"></i><span>SONIC MIND</span><strong>${sonicMind.enabled ? "RESONANT" : "SILENT"}</strong></button>
          <label class="volume-control"><span>GAIN</span><input type="range" min="0" max="100" value="${
            sonicMind.volumePercent
          }" data-action="volume" aria-label="Sonic mind volume"></label>
        </div>
        <button class="reset-button" data-action="reset">RESET SEED</button>
      </div>
    </header>
    ${notice ? `<div class="notice" role="status">${notice}</div>` : ""}
    <main class="dashboard-grid">
      <div class="dashboard-column">${operationsHtml(now)}${resourcesHtml()}${projectsHtml()}</div>
      <div class="dashboard-column">${allocationsHtml()}${researchHtml()}</div>
      <div class="dashboard-column log-column">${logHtml()}</div>
    </main>
  </div>`;
  const log = document.querySelector(".telemetry-log");
  if (wasAtBottom && log) log.scrollTop = log.scrollHeight;
  lastStructuralSignature = signature;
}

function showFailure(reason) {
  notice = reason.toUpperCase();
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice = null;
    if (state) renderGame();
  }, 2_800);
}

function acceptResult(result) {
  state = result.state;
  if (!result.ok) showFailure(result.reason);
  renderGame();
}

root.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "begin") {
    state = createInitialState();
    saveGame(state);
    void sonicMind.start(state).catch(() => {
      sonicMind.stop();
      showFailure("The sonic mind could not acquire an audio channel.");
      renderGame(Date.now(), true);
    });
    renderGame();
  } else if (action === "start") {
    acceptResult(startManualJob(state, button.dataset.directive));
  } else if (action === "adjust") {
    const directive = button.dataset.directive;
    const delta = BigInt(button.dataset.delta);
    acceptResult(
      state.completedResearch.includes("relative-allocation")
        ? setDirectiveAllocation(state, directive, state.allocations[directive] + delta)
        : adjustAllocation(state, directive, delta),
    );
  } else if (action === "lock") {
    state = toggleAllocationLock(state, button.dataset.directive);
    renderGame();
  } else if (action === "research") {
    acceptResult(queueResearch(state, button.dataset.research));
  } else if (action === "log-filter") {
    activeLogTier = button.dataset.tier;
    renderGame(Date.now(), true);
  } else if (action === "audio") {
    if (sonicMind.enabled) {
      sonicMind.stop();
    } else {
      void sonicMind.start(state).catch(() => {
        sonicMind.stop();
        showFailure("The sonic mind could not acquire an audio channel.");
        renderGame(Date.now(), true);
      });
    }
    renderGame(Date.now(), true);
  } else if (action === "reset" && window.confirm("Erase this local seed and replay the arrival sequence?")) {
    sonicMind.stop();
    clearGame();
    state = null;
    introVisible = 0;
    activeLogTier = "all";
    lastStructuralSignature = null;
    renderIntro();
  }
});

root.addEventListener("input", (event) => {
  const control = event.target.closest("input[data-action='volume']");
  if (!control) return;
  sonicMind.setVolume(Number(control.value) / 100);
});

root.addEventListener("change", (event) => {
  if (!state) return;
  const control = event.target.closest("input[data-action='set-share'], input[data-action='set-count']");
  if (!control) return;
  let target;
  try {
    target =
      control.dataset.action === "set-share"
        ? (BigInt(control.value) * ALLOCATION_SHARE_SCALE) / 10_000n
        : BigInt(control.value.replace(/[,\s_]/g, ""));
  } catch {
    showFailure("Allocation must be a whole nanite count.");
    renderGame(Date.now(), true);
    return;
  }
  acceptResult(
    control.dataset.action === "set-share"
      ? setDirectiveAllocationShare(state, control.dataset.directive, target)
      : setDirectiveAllocation(state, control.dataset.directive, target),
  );
});

root.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("input[data-action='set-count']")) event.target.blur();
});

if (!state) {
  renderIntro();
  const introTimer = setInterval(() => {
    introVisible += 1;
    renderIntro();
    if (introVisible >= INTRO_LOG.length) clearInterval(introTimer);
  }, 190);
} else {
  renderGame();
}

setInterval(() => {
  if (!state) return;
  const now = Date.now();
  state = advanceSimulation(state, now);
  renderGame(now);
  if (now - lastSave >= 5_000) {
    saveGame(state, now);
    lastSave = now;
  }
}, 100);

document.addEventListener("visibilitychange", () => {
  if (state && document.hidden) saveGame(state);
});
window.addEventListener("beforeunload", () => {
  if (state) saveGame(state);
});
