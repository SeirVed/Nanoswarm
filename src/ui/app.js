import {
  ALLOCATION_SHARE_SCALE,
  ATOM_KEYS,
  DIRECTIVES,
  DIRECTIVE_LABEL,
  INTRO_LOG,
  LOG_TIERS,
  NANITE_RECIPE,
  RESEARCH,
} from "../game/content.js";
import {
  adjustAllocation,
  advanceSimulation,
  assignmentTotal,
  cancelResearch,
  effectiveResearchCapacity,
  atmosphericCollectionCapacity,
  cohortResonanceWindow,
  cohortSyncWindow,
  directiveIsVisible,
  effectiveJobDuration,
  moveResearch,
  queueResearch,
  replicationShortages,
  researchIsRevealed,
  setDirectiveAllocationShare,
  solidCollectionCapacity,
  startManualJob,
  startProspecting,
  toggleAllocationLock,
} from "../game/engine.js";
import { totalMatter } from "../game/matter.js";
import {
  formatCount,
  formatEnergy,
  formatInventoryMass,
  formatMass,
  massYoctograms,
} from "../game/quantities.js";
import { activeResearchWorkers, createInitialState, idleWorkers } from "../game/state.js";
import { clearGame, loadGame, saveGame } from "../game/storage.js";
import { SyntheticMind } from "../audio/mind.js";
import { COHORT_SLOT_LABEL, groupCohortsForDisplay, revealedCohortSlots } from "./cohort-groups.js";
import { installDelayedTooltips } from "./tooltips.js";

const root = document.querySelector("#root");
const delayedTooltips = installDelayedTooltips(root);
const sonicMind = new SyntheticMind();
let state = loadGame();
let introVisible = 0;
let notice = null;
let noticeTimer = null;
let lastSave = Date.now();
let lastStructuralSignature = null;
let activeLogTier = "all";
let activeResearchTab = "incomplete";

const formatDuration = (milliseconds) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
};
function percentageShare(raw) {
  const match = raw.trim().match(/^(\d{1,3})(?:\.(\d{0,2}))?$/);
  if (!match) throw new Error("invalid percentage");
  const hundredths = BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  if (hundredths > 10_000n) throw new Error("percentage exceeds 100");
  return hundredths * ALLOCATION_SHARE_SCALE / 10_000n;
}
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
  delayedTooltips.hide();
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
  return groupCohortsForDisplay(state.cohorts);
}

const microsPerSecond = (phases, valueForPhase) =>
  phases.reduce((total, phase) => {
    const duration = BigInt(phase.completesAt - phase.startedAt);
    return duration > 0n ? total + valueForPhase(phase) * 1_000_000_000n / duration : total;
  }, 0n);

function formatMicroRate(rateMicros, formatter, fallbackUnit) {
  if (rateMicros >= 1_000_000n) return `${formatter(rateMicros / 1_000_000n)}/s`;
  return `≈${(Number(rateMicros) / 1_000_000).toPrecision(3)} ${fallbackUnit}/s`;
}

function cohortRateLabel(group) {
  if (group.directive === "prospect" || group.directive === "survey") return "SCANNING · NO MATERIAL FLOW";
  if (group.directive === "energy") {
    const energyRate = microsPerSecond(group.phases, (phase) => phase.payload.energy);
    return `+${formatMicroRate(energyRate, formatEnergy, "pJ")}`;
  }
  if (group.directive === "collect" || group.directive === "atmosphere") {
    const atomRate = microsPerSecond(group.phases, (phase) => totalMatter(phase.payload.matter));
    const massRate = microsPerSecond(group.phases, (phase) => massYoctograms(phase.payload.matter));
    return `+${formatMicroRate(atomRate, (value) => `${formatCount(value)} atoms`, "atoms")} · ≈${formatMicroRate(
      massRate,
      formatMass,
      "yg",
    ).replace(/^≈/, "")}`;
  }
  if (group.directive === "sort") {
    const matterForPhase = (phase) => ({ ...phase.payload.atoms, unknown: phase.payload.residuum.unknown });
    const atomRate = microsPerSecond(group.phases, (phase) => totalMatter(matterForPhase(phase)));
    const massRate = microsPerSecond(group.phases, (phase) => massYoctograms(matterForPhase(phase)));
    return `PROCESS ${formatMicroRate(atomRate, (value) => `${formatCount(value)} atoms`, "atoms")} · ≈${formatMicroRate(
      massRate,
      formatMass,
      "yg",
    ).replace(/^≈/, "")}`;
  }
  const naniteRate = microsPerSecond(group.phases, (phase) => phase.payload.nanites);
  const recipeMatter = { ...NANITE_RECIPE.atoms, unknown: 0n };
  const matterRate = microsPerSecond(
    group.phases,
    (phase) => massYoctograms(recipeMatter) * phase.payload.nanites,
  );
  const energyRate = microsPerSecond(
    group.phases,
    (phase) => NANITE_RECIPE.energy * phase.payload.nanites,
  );
  return `+${formatMicroRate(naniteRate, (value) => `${formatCount(value)} nanites`, "nanites")} · USE ≈${formatMicroRate(
    matterRate,
    formatMass,
    "yg",
  ).replace(/^≈/, "")} · ${formatMicroRate(energyRate, formatEnergy, "pJ")}`;
}

function operationsHtml(now) {
  const active = state.cohorts[0];
  if (state.discovery.directivesVisible) {
    const groups = groupedCohorts();
    const groupByDirective = new Map(groups.map((group) => [group.directive, group]));
    const visibleSlots = revealedCohortSlots(state);
    return `<section class="panel operations-panel" data-tooltip="Fixed directive slots retain their position as cohorts start and finish.">
      <header class="panel-heading"><span>ACTIVE COHORTS · ${groups.length}/${visibleSlots.length} FIXED SLOTS</span><span>SYNC ${cohortSyncWindow(state)}ms · RESONANCE ${(
        cohortResonanceWindow(state) / 1000
      ).toFixed(1)}s</span></header>
      <div class="cohort-list">
        ${visibleSlots.map((directive) => {
          const group = groupByDirective.get(directive);
          if (!group) {
            return `<div class="cohort-row cohort-row-idle" data-cohort-slot="${directive}" data-tooltip="${COHORT_SLOT_LABEL[directive]} is known but has no job in flight.">
              <div><strong>${COHORT_SLOT_LABEL[directive]}</strong><small>STANDBY</small></div>
              <div class="cohort-idle-state">NO JOB IN FLIGHT</div>
            </div>`;
          }
          return `<div class="cohort-row" data-cohort-slot="${directive}" data-tooltip="${COHORT_SLOT_LABEL[directive]} has ${formatCount(group.workers)} workers across ${group.phases.length} active phase${group.phases.length === 1 ? "" : "s"}.">
            <div><strong>${COHORT_SLOT_LABEL[directive]}</strong><small>${formatCount(group.workers)} workers · ${
              group.phases.length === 1
                ? "resonant cohort"
                : `${group.phases.length} phases converging · Δ${(group.spread / 1000).toFixed(1)}s`
            }</small></div>
            <div class="cohort-progress">${progressBar(
              (now - group.lead.startedAt) / (group.lead.completesAt - group.lead.startedAt),
              cohortTimeLabel(group.lead.startedAt, group.lead.completesAt, now),
              group.lead.startedAt,
              group.lead.completesAt,
            )}<small class="cohort-rate">${cohortRateLabel(group)}</small></div>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  if (active) {
    return `<section class="panel operations-panel" data-tooltip="The primary assembler is committed until this indivisible job completes.">
      <header class="panel-heading"><span>PRIMARY ASSEMBLER</span><span>COMMITTED</span></header>
      <div class="active-job">
        <div class="eyebrow">ACTIVE DISCRETE JOB</div><strong>${active.directive.toUpperCase()}</strong>
        ${progressBar(
          (now - active.startedAt) / (active.completesAt - active.startedAt),
          cohortTimeLabel(active.startedAt, active.completesAt, now),
          active.startedAt,
          active.completesAt,
        )}
        <div class="cohort-rate">${cohortRateLabel({ directive: active.directive, phases: [active] })}</div>
        <div class="job-meta"><span>WORKERS ${formatCount(active.workers)}</span><span>OUTPUT ON COMPLETION</span></div>
      </div>
    </section>`;
  }

  if (!state.discovery.surveyComplete) {
    return `<section class="panel operations-panel" data-tooltip="Surveying the immediate substrate reveals safe economic directives.">
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
  return `<section class="panel operations-panel" data-tooltip="Choose one discrete job for the primary assembler.">
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
            <span><strong>${label}</strong><small>${hint}</small></span><em>${effectiveJobDuration(state, directive) / 1000}s</em>
          </button>`,
        )
        .join("")}
    </div>
  </section>`;
}

function resourcesHtml() {
  const depositTotal = totalMatter(state.activeDeposit.matter);
  const depositExhausted = depositTotal === 0n;
  const prospecting = state.cohorts.some((cohort) => cohort.directive === "prospect");
  const substrate = state.discovery.surveyComplete
    ? `<section class="panel substrate-panel" data-tooltip="The active material field is finite; inputs are reserved when collection starts.">
        <header class="panel-heading"><span>LOCAL SUBSTRATE</span><span>${
          depositExhausted ? "EXHAUSTED" : `${percentage(depositTotal, state.activeDeposit.initialAtoms)} REMAINS`
        }</span></header>
        <strong>${state.activeDeposit.name}</strong>
        <p>${state.activeDeposit.description}</p>
        <small>${formatCount(depositTotal)} constituent atoms · ≈${formatInventoryMass(
          state.activeDeposit.matter,
        )} accessible · ${formatCount(
          solidCollectionCapacity(state),
        )} per collector</small>
        ${
          depositExhausted
            ? `<div class="exhaustion-state"><strong>${String(
                state.activeDeposit.limitingElement ?? "material",
              ).toUpperCase()} BOTTLENECK CONFIRMED</strong><p>The local solid inventory is committed. A new material field must be located.</p>
                <button class="terminal-button search-button" data-action="prospect" ${
                  prospecting || idleWorkers(state) < 1n ? "disabled" : ""
                }>${prospecting ? "SEARCH IN PROGRESS" : "SEARCH FOR MORE"}<span>${
                  prospecting ? "cohort deployed" : `${effectiveJobDuration(state, "prospect") / 1000}s · 1 nanite`
                }</span></button></div>`
            : ""
        }
        ${
          state.discovery.atmosphereVisible
            ? `<div class="atmosphere-state"><strong>ATMOSPHERE HARVESTABLE</strong><p>Inexhaustible diffuse feedstock · ${formatCount(
                atmosphericCollectionCapacity(state),
              )} atoms (≈${formatInventoryMass({ unknown: atmosphericCollectionCapacity(state) })}) per nanite per job · 1% base capture plus completed refinements</p></div>`
            : ""
        }
      </section>`
    : "";

  if (!state.discovery.feedstockVisible) return substrate;
  const material = `<section class="panel resources-panel" data-tooltip="Exact available inventories exclude inputs already reserved by active cohorts.">
    <header class="panel-heading"><span>MATERIAL CONTROL</span><span>EXACT INVENTORY</span></header>
    <div class="resource-summary">
      <div><span>FEEDSTOCK</span><strong>${formatCount(totalMatter(state.feedstock))} atoms</strong><small>≈${formatInventoryMass(
        state.feedstock,
      )} · mixed · unsorted</small></div>
      <div><span>ENERGY</span><strong>${formatEnergy(state.energy)}</strong><small>locally stored</small></div>
      ${
        state.discovery.residuumVisible
          ? `<div><span>RESIDUUM</span><strong>${formatCount(totalMatter(state.residuum))} atoms</strong><small>≈${formatInventoryMass(
              state.residuum,
            )} · retained · ${
              state.discovery.residuumIndexed ? "indexed" : "unresolved"
            }</small></div>`
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
                ([key, symbol, name]) => `<div class="atom-card" data-tooltip="Exact identified ${name.toLowerCase()} inventory available for jobs and research.">
                  <span class="atom-symbol">${symbol}</span><span>${name}</span>
                  <strong>${formatCount(state.atoms[key])}</strong>
                  <small>≈${formatInventoryMass({ [key]: state.atoms[key] })}</small>
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
  const replicateHalt = replicationShortages(state);
  const haltedResources = replicateHalt.map((shortage) => shortage.name.toUpperCase()).join(" · ");
  const haltDetail = replicateHalt.map((shortage) =>
    shortage.key === "energy"
      ? `${shortage.name}: ${formatEnergy(shortage.missing)} missing`
      : `${shortage.name}: ${formatCount(shortage.missing)} atoms missing`,
  ).join("; ");
  const recipeText = `RECIPE · C ${formatCount(NANITE_RECIPE.atoms.carbon)} · Si ${formatCount(
    NANITE_RECIPE.atoms.silicon,
  )} · Cu ${formatCount(NANITE_RECIPE.atoms.copper)} · Au ${formatCount(
    NANITE_RECIPE.atoms.gold,
  )} · E ${formatEnergy(NANITE_RECIPE.energy)}`;
  const replicateStatusHtml = `<small class="directive-recipe">${recipeText}</small>${
    replicateHalt.length > 0
      ? `<strong class="directive-alert">PRODUCTION HALTED · INSUFFICIENT ${haltedResources}</strong>`
      : ""
  }`;
  return `<section class="panel allocation-panel" data-tooltip="Allocate active nanites among known directives. Running cohorts remain indivisible until completion.">
    <header class="panel-heading"><span>DIRECTIVE ALLOCATION</span><span>${formatCount(unassigned)} UNASSIGNED${
      relativeAllocation ? " · RELATIVE AUTO" : ""
    }</span></header>
    <div class="allocation-list">
      ${DIRECTIVES.filter((directive) => directiveIsVisible(state, directive)).map((directive) => {
        const locked = state.allocationLocks[directive];
        const shareHundredths = relativeAllocation
          ? (state.allocationTargets[directive] * 10_000n + ALLOCATION_SHARE_SCALE / 2n) /
            ALLOCATION_SHARE_SCALE
          : 0n;
        const shareText = `${shareHundredths / 100n}.${(shareHundredths % 100n).toString().padStart(2, "0")}`;
        return `<div class="allocation-row ${relativeAllocation ? "relative" : ""}" data-tooltip="${
          directive === "replicate"
            ? `${recipeText}${haltDetail ? `. Production halted: ${haltDetail}.` : "."}`
            : `Assign active nanites to ${DIRECTIVE_LABEL[directive].toLowerCase()}.`
        }">
          <div class="allocation-label"><span>${DIRECTIVE_LABEL[directive]}</span><small>${formatCount(
            state.allocations[directive],
          )} assigned${directive === "research" ? " · core capacity applies" : ""}</small>
          ${directive === "replicate" ? replicateStatusHtml : ""}</div>
          ${
            relativeAllocation
              ? `<div class="allocation-share-stepper">
                  <button class="step-button" data-action="step-share" data-directive="${directive}" data-share-delta="-100" data-repeat="accelerated" ${
                    shareHundredths === 0n ? "disabled" : ""
                  } aria-label="Decrease ${DIRECTIVE_LABEL[directive]} by one percent">−</button>
                  <label class="allocation-share-box"><input class="allocation-input" type="text" inputmode="decimal" value="${shareText}" data-action="set-share-percent" data-directive="${directive}" aria-label="${DIRECTIVE_LABEL[directive]} percentage"><span>%</span></label>
                  <button class="step-button" data-action="step-share" data-directive="${directive}" data-share-delta="100" data-repeat="accelerated" ${
                    shareHundredths === 10_000n ? "disabled" : ""
                  } aria-label="Increase ${DIRECTIVE_LABEL[directive]} by one percent">+</button>
                </div>
                <button class="lock-button ${locked ? "locked" : ""}" data-action="lock" data-directive="${directive}" aria-pressed="${locked}" aria-label="${locked ? "Unlock" : "Lock"} ${DIRECTIVE_LABEL[directive]} allocation">${
                  locked ? "LOCK" : "OPEN"
                }</button>
                <label class="relative-allocation"><input type="range" min="0" max="10000" step="1" value="${shareHundredths}" data-action="set-share" data-directive="${directive}" aria-label="${DIRECTIVE_LABEL[directive]} persistent relative share"><span>${shareText}%</span></label>`
              : `<button class="step-button" data-action="adjust" data-directive="${directive}" data-delta="-1" ${
                  state.allocations[directive] === 0n ? "disabled" : ""
                } data-repeat="accelerated">−</button><output>${formatCount(state.allocations[directive])}</output>
                <button class="step-button" data-action="adjust" data-directive="${directive}" data-delta="1" ${
                  unassigned === 0n || state.allocations[directive] >= state.nanites ? "disabled" : ""
                } data-repeat="accelerated">+</button>`
          }
        </div>`;
      }).join("")}
    </div>
    <p class="panel-note">${
      relativeAllocation
        ? "Sliders express persistent workforce percentages. New nanites enter those shares automatically; locks protect ratios while other sliders change. Running cohorts still finish indivisibly."
        : "Running cohorts finish their current indivisible job before a reduced assignment takes effect."
    }</p>
  </section>`;
}

function researchHtml() {
  if (!state.discovery.researchVisible) return "";
  const active = state.researchQueue[0];
  const capacity = effectiveResearchCapacity(state);
  const revealedResearch = Object.values(RESEARCH).filter((definition) => researchIsRevealed(state, definition));
  const incompleteResearch = revealedResearch.filter((definition) => !state.completedResearch.includes(definition.id));
  const completeResearch = revealedResearch.filter((definition) => state.completedResearch.includes(definition.id));
  const selectedResearch = activeResearchTab === "complete" ? completeResearch : incompleteResearch;
  const contributingResearchers = activeResearchWorkers(state);
  const activeHtml = active
    ? `<div class="active-research"><div class="eyebrow">ACTIVE RESEARCH JOB</div><strong>${RESEARCH[active.id].name}</strong>
        <div class="progress-wrap" data-research-progress>
          <div class="progress-track"><div class="progress-fill" style="width:${
            Number((active.progressNaniteMs * 10_000n) / RESEARCH[active.id].requiredNaniteMs) / 100
          }%"></div></div>
          <span>${formatDuration(Number((RESEARCH[active.id].requiredNaniteMs - active.progressNaniteMs + capacity - 1n) / capacity))}</span>
        </div></div>`
    : `<p class="empty-state">NO ACTIVE RESEARCH JOB</p>`;
  const queueHtml = state.researchQueue.length
    ? `<div class="section-rule"><span>EDITABLE QUEUE · RESERVED INPUTS REFUND ON CANCELLATION</span></div>
      <div class="research-queue-list">
        ${state.researchQueue.map((item, index) => {
          const definition = RESEARCH[item.id];
          return `<div class="research-queue-row">
            <span class="queue-index">${String(index + 1).padStart(2, "0")}</span>
            <div><strong>${definition.name}</strong><small>${
              index === 0 ? "ACTIVE" : "QUEUED"
            } · ${percentage(item.progressNaniteMs, definition.requiredNaniteMs)} WORK COMPLETE</small></div>
            <div class="queue-controls">
              <button class="queue-button" data-action="research-move" data-research="${item.id}" data-direction="-1" ${
                index === 0 ? "disabled" : ""
              } aria-label="Move ${definition.name} up">↑</button>
              <button class="queue-button" data-action="research-move" data-research="${item.id}" data-direction="1" ${
                index === state.researchQueue.length - 1 ? "disabled" : ""
              } aria-label="Move ${definition.name} down">↓</button>
              <button class="queue-button cancel" data-action="research-cancel" data-research="${item.id}">CANCEL</button>
            </div>
          </div>`;
        }).join("")}
      </div>`
    : "";

  return `<section class="panel research-panel" data-tooltip="Research uses embedded computronium plus any free nanites assigned to research.">
    <header class="panel-heading"><span>RESEARCH QUEUE</span><span>${state.completedResearch.length}/${Object.keys(
      RESEARCH,
    ).length} COMPLETE · ${formatCount(
      capacity,
    )} n-eq</span></header>
    <div class="research-capacity"><span>COMPUTRONIUM + ACTIVE RESEARCHERS</span><strong>max(100 nanites, ${
      state.completedResearch.includes("distributed-computronium") ? "2%" : "1%"
    } swarm) + ${formatCount(contributingResearchers)} / ${formatCount(state.allocations.research)} assigned</strong></div>
    ${activeHtml}
    ${queueHtml}
    <nav class="research-tabs" aria-label="Research state">
      <button class="research-tab ${activeResearchTab === "incomplete" ? "active" : ""}" data-action="research-tab" data-tab="incomplete" aria-pressed="${
        activeResearchTab === "incomplete"
      }"><span>INCOMPLETE</span><strong>${incompleteResearch.length}</strong></button>
      <button class="research-tab ${activeResearchTab === "complete" ? "active" : ""}" data-action="research-tab" data-tab="complete" aria-pressed="${
        activeResearchTab === "complete"
      }"><span>COMPLETE</span><strong>${completeResearch.length}</strong></button>
    </nav>
    <div class="research-list">
      ${selectedResearch
        .map((definition) => {
          const queued = state.researchQueue.some((item) => item.id === definition.id);
          const complete = state.completedResearch.includes(definition.id);
          const eta = (definition.requiredNaniteMs + capacity - 1n) / capacity;
          return `<article class="research-card" data-tooltip="${definition.effect}"><div><strong>${definition.name}</strong><p>${definition.description}</p><p class="research-effect">${definition.effect}</p>
            <small>${
              complete
                ? `RESOLVED · WORK ${formatCount(definition.requiredNaniteMs)} n·ms`
                : `ETA ${formatDuration(Number(eta))} at current capacity · WORK ${formatCount(
                    definition.requiredNaniteMs,
                  )} n·ms`
            }</small>
            <small>C ${formatCount(definition.cost.atoms.carbon)} · Si ${formatCount(
              definition.cost.atoms.silicon,
            )} · Cu ${formatCount(definition.cost.atoms.copper)} · Au ${formatCount(
              definition.cost.atoms.gold,
            )} · E ${formatEnergy(definition.cost.energy)} · ≈${formatInventoryMass(definition.cost.atoms)}</small>
            </div><button class="terminal-button compact-button" data-action="research" data-research="${definition.id}" ${
              queued || complete ? "disabled" : ""
            }>${complete ? "COMPLETE" : queued ? "QUEUED" : "QUEUE"}</button></article>`;
        })
        .join("")}
      ${selectedResearch.length === 0 ? `<p class="empty-state">NO ${activeResearchTab.toUpperCase()} RESEARCH SIGNALS</p>` : ""}
    </div>
  </section>`;
}

function projectsHtml() {
  if (!state.discovery.projectsVisible) return "";
  return `<section class="panel project-panel" data-tooltip="Long-horizon projects expose distant objectives before their requirements are resolved.">
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
  return `<section class="panel log-panel" data-tooltip="World, critical, and medium history is permanent; the newest 200 info events are retained.">
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
    state.log.at(-1)?.id ?? "",
    activeLogTier,
    activeResearchTab,
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
  const previousColumnScroll = [...document.querySelectorAll(".dashboard-column")].map(
    (column) => column.scrollTop,
  );
  const previousScroll = { x: window.scrollX, y: window.scrollY };
  const focusedPercentage = document.activeElement?.matches("input[data-action='set-share-percent']")
    ? {
        directive: document.activeElement.dataset.directive,
        value: document.activeElement.value,
        selectionStart: document.activeElement.selectionStart,
        selectionEnd: document.activeElement.selectionEnd,
      }
    : null;
  const depositTotal = totalMatter(state.activeDeposit.matter);
  delayedTooltips.hide();
  root.innerHTML = `<div class="game-shell">
    <header class="game-header">
      <div class="brand-lockup"><span class="brand-mark">◈</span><div><h1>NANOSWARM</h1><p>LOCAL DIRECTIVE AUTHORITY · SEED 01</p></div></div>
      <div class="header-metrics"><div data-tooltip="Total functioning nanites in the local swarm."><span>ACTIVE NANITES</span><strong>${formatCount(state.nanites)}</strong></div>
        ${state.discovery.surveyComplete ? `<div class="substrate-metric" data-tooltip="Unreserved matter remaining in the active finite deposit."><span>SUBSTRATE</span><strong>${percentage(depositTotal, state.activeDeposit.initialAtoms)}</strong></div>` : ""}
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
  document.querySelectorAll(".dashboard-column").forEach((column, index) => {
    column.scrollTop = previousColumnScroll[index] ?? 0;
  });
  if (focusedPercentage) {
    const restoredInput = document.querySelector(
      `input[data-action='set-share-percent'][data-directive='${focusedPercentage.directive}']`,
    );
    if (restoredInput) {
      restoredInput.value = focusedPercentage.value;
      restoredInput.focus({ preventScroll: true });
      restoredInput.setSelectionRange(focusedPercentage.selectionStart, focusedPercentage.selectionEnd);
    }
  }
  window.scrollTo(previousScroll.x, previousScroll.y);
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
  return result.ok;
}

function performButtonAction(button) {
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
    return true;
  } else if (action === "start") {
    return acceptResult(startManualJob(state, button.dataset.directive));
  } else if (action === "prospect") {
    return acceptResult(startProspecting(state));
  } else if (action === "adjust") {
    const directive = button.dataset.directive;
    const delta = BigInt(button.dataset.delta);
    return acceptResult(adjustAllocation(state, directive, delta));
  } else if (action === "step-share") {
    const directive = button.dataset.directive;
    const shareDelta = BigInt(button.dataset.shareDelta) * ALLOCATION_SHARE_SCALE / 10_000n;
    const current = state.allocationTargets[directive];
    const target = current + shareDelta < 0n
      ? 0n
      : current + shareDelta > ALLOCATION_SHARE_SCALE
        ? ALLOCATION_SHARE_SCALE
        : current + shareDelta;
    return acceptResult(setDirectiveAllocationShare(state, directive, target));
  } else if (action === "lock") {
    state = toggleAllocationLock(state, button.dataset.directive);
    renderGame();
    return true;
  } else if (action === "research") {
    return acceptResult(queueResearch(state, button.dataset.research));
  } else if (action === "research-cancel") {
    return acceptResult(cancelResearch(state, button.dataset.research));
  } else if (action === "research-move") {
    return acceptResult(moveResearch(state, button.dataset.research, Number(button.dataset.direction)));
  } else if (action === "research-tab") {
    activeResearchTab = button.dataset.tab;
    renderGame(Date.now(), true);
    return true;
  } else if (action === "log-filter") {
    activeLogTier = button.dataset.tier;
    renderGame(Date.now(), true);
    return true;
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
    return true;
  } else if (action === "reset" && window.confirm("Erase this local seed and replay the arrival sequence?")) {
    sonicMind.stop();
    clearGame();
    state = null;
    introVisible = 0;
    activeLogTier = "all";
    activeResearchTab = "incomplete";
    lastStructuralSignature = null;
    renderIntro();
    return true;
  }
  return false;
}

const repeatIdentity = (button) => [
  button.dataset.action,
  button.dataset.directive,
  button.dataset.delta,
  button.dataset.shareDelta,
].join(":");
let repeatSession = null;
let repeatClickSuppression = null;

function stopRepeating() {
  if (repeatSession?.timer) clearTimeout(repeatSession.timer);
  repeatSession = null;
  if (repeatClickSuppression) repeatClickSuppression.until = Date.now() + 600;
}

function scheduleRepeat(session, delay = 420) {
  session.timer = window.setTimeout(() => {
    if (repeatSession !== session) return;
    const succeeded = performButtonAction(session.button);
    session.repetitions += 1;
    if (!succeeded) {
      stopRepeating();
      return;
    }
    const nextDelay = Math.max(45, Math.round(210 * 0.82 ** session.repetitions));
    scheduleRepeat(session, nextDelay);
  }, delay);
}

root.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-repeat='accelerated']");
  if (!button || button.disabled || event.button !== 0) return;
  event.preventDefault();
  stopRepeating();
  const identity = repeatIdentity(button);
  repeatClickSuppression = { identity, until: Number.POSITIVE_INFINITY };
  const session = { button, repetitions: 0, timer: null };
  repeatSession = session;
  const succeeded = performButtonAction(button);
  if (succeeded) scheduleRepeat(session);
  else stopRepeating();
});

document.addEventListener("pointerup", stopRepeating);
document.addEventListener("pointercancel", stopRepeating);
window.addEventListener("blur", stopRepeating);

root.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (
    repeatClickSuppression?.identity === repeatIdentity(button) &&
    Date.now() <= repeatClickSuppression.until
  ) {
    event.preventDefault();
    return;
  }
  repeatClickSuppression = null;
  performButtonAction(button);
});

root.addEventListener("input", (event) => {
  const control = event.target.closest("input[data-action='volume']");
  if (!control) return;
  sonicMind.setVolume(Number(control.value) / 100);
});

root.addEventListener("change", (event) => {
  if (!state) return;
  const control = event.target.closest("input[data-action='set-share'], input[data-action='set-share-percent']");
  if (!control) return;
  let target;
  try {
    target =
      control.dataset.action === "set-share"
        ? (BigInt(control.value) * ALLOCATION_SHARE_SCALE) / 10_000n
        : percentageShare(control.value);
  } catch {
    showFailure("Allocation percentage must be between 0 and 100 with up to two decimals.");
    renderGame(Date.now(), true);
    return;
  }
  acceptResult(setDirectiveAllocationShare(state, control.dataset.directive, target));
});

root.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("input[data-action='set-share-percent']")) event.target.blur();
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
