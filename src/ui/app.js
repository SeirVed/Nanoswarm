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
import { acknowledgeUnlockIds } from "../game/unlocks.js";
import { SyntheticMind } from "../audio/mind.js";
import { COHORT_SLOT_LABEL, groupCohortsForDisplay, revealedCohortSlots } from "./cohort-groups.js";
import { buildFeedbackIssueUrl } from "./feedback.js";
import { installDelayedTooltips, tooltipTextFor } from "./tooltips.js";

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
let feedbackSelecting = false;
let feedbackSelection = null;
let feedbackOpened = false;
let feedbackDraft = {
  category: "Bug",
  summary: "",
  details: "",
  includeDiagnostics: true,
};

const escapeAttribute = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const newUnlockClass = (id) => state && !state.seenUnlocks.includes(id) ? " new-unlock" : "";

function resetFeedbackDraft() {
  feedbackDraft = { category: "Bug", summary: "", details: "", includeDiagnostics: true };
  feedbackOpened = false;
}

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
const LOG_TIER_MEANING = Object.freeze({
  world: "World events are permanent milestones that define the seed's long-term history.",
  critical: "Critical events are permanent warnings, failures, bottlenecks, or irreversible transitions.",
  medium: "Medium events are permanent discoveries and meaningful operational changes.",
  info: "Info events describe routine operation; only the newest 200 are retained.",
});

function logEntryTooltip(entry, label) {
  let meaning = "This is an authoritative record emitted by the deterministic simulation.";
  if (/RESEARCH/.test(entry.message)) meaning = "Research records track reserved work, queue decisions, and completed changes to swarm capability.";
  else if (/COHORT|JOB|REPLICAT|COLLECT|SORT|ENERGY/.test(entry.message)) meaning = "Operational records mark discrete jobs; resources and outputs change only at their exact simulation boundaries.";
  else if (/SUBSTRATE|DEPOSIT|PROSPECT|ATMOSPHERE/.test(entry.message)) meaning = "Exploration records describe the finite local environment and the discovery of additional material fields.";
  else if (/DIRECTIVE|ALLOCATION/.test(entry.message)) meaning = "Directive records describe changes to the authority and workforce-control systems available to the player.";
  return `Recorded ${label} after seed assembly. ${meaning} ${LOG_TIER_MEANING[entry.tier]}`;
}
const progressBar = (progress, label = "", startedAt, completesAt) => `
  <div class="progress-wrap" aria-label="${label}" ${
    startedAt === undefined ? "" : `data-start="${startedAt}" data-end="${completesAt}"`
  } ${startedAt === undefined ? "" : `data-tooltip-key="job-timer:${startedAt}:${completesAt}" data-tooltip="This cohort is indivisible while the timer runs. Its workers and reserved inputs return only when the discrete job completes."`}>
    <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(1, progress)) * 100}%"></div></div>
    ${label ? `<span>${label}</span>` : ""}
  </div>`;

function renderIntro() {
  delayedTooltips.preserve();
  root.innerHTML = `
    <main class="arrival-shell" aria-label="NanoSwarm arrival telemetry">
      <section class="arrival-terminal" data-tooltip="A recovered deep-time transit record from the stranded nanite seed.">
        <div class="terminal-status" data-tooltip="Recorded telemetry is arriving in chronological order."><span>DEEP-TIME TRANSIT RECORD</span><span class="status-light">RECEIVING</span></div>
        <div class="arrival-log" aria-live="polite">
          ${INTRO_LOG.slice(0, introVisible)
            .map(
              (entry, index) => `<div class="arrival-line tone-${entry.tone ?? "system"}" data-tooltip-key="intro:${index}" data-tooltip="${escapeAttribute(entry.tooltip)}">
                <time>${entry.elapsedLabel}</time><span>${entry.message}</span>
              </div>`,
            )
            .join("")}
          <span class="cursor" aria-hidden="true"></span>
        </div>
        ${
          introVisible >= INTRO_LOG.length
            ? `<div class="begin-zone" data-tooltip="Accept local control of the seed and enter the live simulation.">
                <button class="terminal-button begin-button" data-action="begin">BEGIN</button>
                <p>ASSUME LOCAL DIRECTIVE AUTHORITY · AWAKEN SONIC MIND</p>
              </div>`
            : ""
        }
      </section>
    </main>`;
  delayedTooltips.refresh();
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
            return `<div class="cohort-row cohort-row-idle${newUnlockClass(`directive:${directive}`)}" data-unlock-id="directive:${directive}" data-cohort-slot="${directive}" data-tooltip="${COHORT_SLOT_LABEL[directive]} is known but has no job in flight.">
              <div><strong>${COHORT_SLOT_LABEL[directive]}</strong><small>STANDBY</small></div>
              <div class="cohort-idle-state">NO JOB IN FLIGHT</div>
            </div>`;
          }
          return `<div class="cohort-row${newUnlockClass(`directive:${directive}`)}" data-unlock-id="directive:${directive}" data-cohort-slot="${directive}" data-tooltip="${COHORT_SLOT_LABEL[directive]} has ${formatCount(group.workers)} workers across ${group.phases.length} active phase${group.phases.length === 1 ? "" : "s"}.">
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
        <button class="terminal-button primary-action" data-action="start" data-directive="survey" data-tooltip="Commit the only assembler to a ten-second close survey. No materials are consumed; economic directives appear only after the substrate is classified.">
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
          ([directive, label, hint]) => `<button class="action-row${newUnlockClass(`directive:${directive}`)}" data-unlock-id="directive:${directive}" data-action="start" data-directive="${directive}" data-tooltip="${hint} This commits the primary assembler for ${effectiveJobDuration(state, directive) / 1000} seconds; reserved inputs and discrete outputs settle only at completion.">
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
    ? `<section class="panel substrate-panel${newUnlockClass("substrate")}" data-unlock-id="substrate" data-tooltip="The active material field is finite; inputs are reserved when collection starts.">
        <header class="panel-heading"><span>LOCAL SUBSTRATE</span><span>${
          depositExhausted ? "EXHAUSTED" : `${percentage(depositTotal, state.activeDeposit.initialAtoms)} REMAINS`
        }</span></header>
        <strong data-tooltip-key="substrate:identity" data-tooltip="This is the swarm's current finite solid material field. Its classification describes likely composition, while exact accessible inventory below excludes matter already reserved by collection cohorts.">${state.activeDeposit.name}</strong>
        <p data-tooltip-key="substrate:composition" data-tooltip="Composition is inferred from the survey and guides the mixture returned by collection. It does not guarantee that every atom is currently identifiable by the sorting catalog.">${state.activeDeposit.description}</p>
        <small data-tooltip-key="substrate:inventory" data-tooltip="Accessible atoms are unreserved matter still present in this field. Collector capacity is the maximum discrete payload one nanite can reserve when a collection job starts.">${formatCount(depositTotal)} constituent atoms · ≈${formatInventoryMass(
          state.activeDeposit.matter,
        )} accessible · ${formatCount(
          solidCollectionCapacity(state),
        )} per collector</small>
        ${
          depositExhausted
            ? `<div class="exhaustion-state${newUnlockClass("directive:prospect")}" data-unlock-id="directive:prospect" data-tooltip-key="substrate:exhaustion" data-tooltip="Every accessible solid atom in this field has been collected or reserved. Production can continue from stored inventory, but new solid matter requires a prospecting search."><strong>${String(
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
            ? `<div class="atmosphere-state${newUnlockClass("directive:atmosphere")}" data-unlock-id="directive:atmosphere" data-tooltip-key="substrate:atmosphere" data-tooltip="Atmospheric harvesting is inexhaustible but diffuse: each nanite captures only one percent of the base solid payload before research bonuses. Its output enters mixed Feedstock and still requires sorting."><strong>ATMOSPHERE HARVESTABLE</strong><p>Inexhaustible diffuse feedstock · ${formatCount(
                atmosphericCollectionCapacity(state),
              )} atoms (≈${formatInventoryMass({ unknown: atmosphericCollectionCapacity(state) })}) per nanite per job · 1% base capture plus completed refinements</p></div>`
            : ""
        }
      </section>`
    : "";

  if (!state.discovery.feedstockVisible) return substrate;
  const material = `<section class="panel resources-panel${newUnlockClass("materials")}" data-unlock-id="materials" data-tooltip="Exact available inventories exclude inputs already reserved by active cohorts.">
    <header class="panel-heading"><span>MATERIAL CONTROL</span><span>EXACT INVENTORY</span></header>
    <div class="resource-summary">
      <div data-tooltip-key="resource:feedstock" data-tooltip="Feedstock is mixed, unclassified matter returned by collection jobs. Sorting reserves a discrete portion, separates the four currently recognized elements, and moves everything unresolved into Residuum."><span>FEEDSTOCK</span><strong>${formatCount(totalMatter(state.feedstock))} atoms</strong><small>≈${formatInventoryMass(
        state.feedstock,
      )} · mixed · unsorted</small></div>
      <div data-tooltip-key="resource:energy" data-tooltip="Energy is locally stored electrical work measured in picojoules. Replication consumes ${formatEnergy(NANITE_RECIPE.energy)} per nanite; research reserves its listed energy cost when queued."><span>ENERGY</span><strong>${formatEnergy(state.energy)}</strong><small>locally stored</small></div>
      ${
        state.discovery.residuumVisible
          ? `<div class="resource-unlock${newUnlockClass("residuum")}" data-unlock-id="residuum" data-tooltip-key="resource:residuum" data-tooltip="Residuum contains real, conserved atoms whose elemental signatures are not yet in the swarm's catalog. It is retained rather than discarded; later spectral research can classify and use more of it."><span>RESIDUUM</span><strong>${formatCount(totalMatter(state.residuum))} atoms</strong><small>≈${formatInventoryMass(
              state.residuum,
            )} · retained · ${
              state.discovery.residuumIndexed ? "indexed" : "unresolved"
            }</small></div>`
          : ""
      }
    </div>
    <div class="section-rule"><span>LIFETIME MATERIAL FLOW</span></div>
    <div class="lifetime-summary">
      ${[
        ["COLLECTED", "collected", "Matter successfully returned from solid deposits or atmospheric harvests. Inputs still travelling inside collection cohorts are not counted until they arrive."],
        ["PROCESSED", "processed", "Matter that has completed elemental sorting. This includes material now stored, reserved, or permanently consumed; it never counts the same atom twice."],
        ["SPENT", "spent", `Identified atoms permanently incorporated into completed nanites and research, plus ${formatEnergy(state.lifetime.energySpent)} of all-time energy consumption. Cancelled research is refunded and excluded.`],
      ].map(([label, key, tooltip]) => `<div data-tooltip-key="lifetime:${key}" data-tooltip="${tooltip}">
        <span>${label}</span><strong>${formatCount(totalMatter(state.lifetime[key]))} atoms</strong>
        <small>≈${formatInventoryMass(state.lifetime[key])}${key === "spent" ? ` · ${formatEnergy(state.lifetime.energySpent)} energy` : ""}</small>
      </div>`).join("")}
    </div>
    ${
      state.discovery.elementsVisible
        ? `<div class="section-rule"><span>IDENTIFIED ELEMENTS</span></div>
          <div class="atom-grid${newUnlockClass("elements")}" data-unlock-id="elements">
            ${[
              ["carbon", "C", "Carbon"],
              ["silicon", "Si", "Silicon"],
              ["copper", "Cu", "Copper"],
              ["gold", "Au", "Gold"],
            ]
              .map(
                ([key, symbol, name]) => `<div class="atom-card" data-tooltip-key="resource:${key}" data-tooltip="${({
                  carbon: "Carbon is the structural bulk of each nanite and the earliest replication bottleneck. One nanite requires 5,000 available carbon atoms, excluding atoms already reserved by active work.",
                  silicon: "Silicon forms computational and sensing structures. One nanite requires 400 available silicon atoms, and research may reserve additional silicon while queued.",
                  copper: "Copper carries power and signals through the swarm. One nanite requires 150 available copper atoms, excluding material committed to active cohorts or research.",
                  gold: "Gold provides corrosion-resistant nanoscale contacts. One nanite requires 25 available gold atoms; its low abundance can limit otherwise enormous replication runs.",
                })[key]}">
                  <span class="atom-symbol">${symbol}</span><span>${name}</span>
                  <strong>${formatCount(state.atoms[key])}</strong>
                  <small>≈${formatInventoryMass({ [key]: state.atoms[key] })}</small>
                  <small class="atom-lifetime">ALL TIME · ${formatCount(state.lifetime.collected[key])} IN · ${formatCount(state.lifetime.processed[key])} SORTED · ${formatCount(state.lifetime.spent[key])} SPENT</small>
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
  const replicationAlertHtml = replicateHalt.length > 0
    ? `<div class="production-halt-alert" role="status" data-tooltip-key="replication:halt" data-tooltip="Replication cannot start the requested cohort because reserved-free inventory is short. ${haltDetail}. Existing jobs remain safe; assigned replicators will resume automatically when every recipe input is available.">
        <strong>REPLICATION PRODUCTION HALTED</strong>
        <span>INSUFFICIENT ${haltedResources}</span>
        <small>${haltDetail}</small>
      </div>`
    : "";
  return `<section class="panel allocation-panel${replicateHalt.length > 0 ? " production-stalled" : ""}${newUnlockClass("allocations")}" data-unlock-id="allocations" data-tooltip="Allocate active nanites among known directives. Running cohorts remain indivisible until completion.">
    <header class="panel-heading"><span>DIRECTIVE ALLOCATION</span><span>${formatCount(unassigned)} UNASSIGNED${
      relativeAllocation ? " · RELATIVE AUTO" : ""
    }</span></header>
    ${replicationAlertHtml}
    <div class="allocation-list">
      ${DIRECTIVES.filter((directive) => directiveIsVisible(state, directive)).map((directive) => {
        const locked = state.allocationLocks[directive];
        const shareHundredths = relativeAllocation
          ? (state.allocationTargets[directive] * 10_000n + ALLOCATION_SHARE_SCALE / 2n) /
            ALLOCATION_SHARE_SCALE
          : 0n;
        const shareText = `${shareHundredths / 100n}.${(shareHundredths % 100n).toString().padStart(2, "0")}`;
        return `<div class="allocation-row ${relativeAllocation ? "relative" : ""}${newUnlockClass(`directive:${directive}`)}" data-unlock-id="directive:${directive}" data-tooltip="${
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
        <div class="progress-wrap" data-research-progress data-tooltip-key="research-timer:${active.id}" data-tooltip="This estimate uses current computronium and genuinely available research workers. Reallocating nanites can change the remaining time, but accumulated work and reserved inputs remain exact.">
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
          return `<div class="research-queue-row" data-tooltip-key="research-queue:${item.id}" data-tooltip="${definition.name} currently has ${percentage(item.progressNaniteMs, definition.requiredNaniteMs)} of its required work complete. Its full material and energy cost remains reserved until completion or cancellation.">
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

  return `<section class="panel research-panel${newUnlockClass("research")}" data-unlock-id="research" data-tooltip="Research uses embedded computronium plus any free nanites assigned to research.">
    <header class="panel-heading"><span>RESEARCH QUEUE</span><span>${formatCount(capacity)} n-eq CAPACITY</span></header>
    <div class="research-capacity" data-tooltip-key="research:capacity" data-tooltip="Research work is measured in nanite-milliseconds. Embedded computronium supplies a protected minimum capacity, while nanites assigned to research contribute only when they are not trapped inside indivisible production cohorts."><span>COMPUTRONIUM + ACTIVE RESEARCHERS</span><strong>max(100 nanites, ${
      state.completedResearch.includes("distributed-computronium") ? "2%" : "1%"
    } swarm) + ${formatCount(contributingResearchers)} / ${formatCount(state.allocations.research)} assigned</strong></div>
    ${activeHtml}
    ${queueHtml}
    <nav class="research-tabs" aria-label="Research state">
      <button class="research-tab ${activeResearchTab === "incomplete" ? "active" : ""}" data-action="research-tab" data-tab="incomplete" data-tooltip="Show research signals whose prerequisites are known but whose work is not complete. Hidden branches do not contribute to this count." aria-pressed="${
        activeResearchTab === "incomplete"
      }"><span>INCOMPLETE</span><strong>${incompleteResearch.length}</strong></button>
      <button class="research-tab ${activeResearchTab === "complete" ? "active" : ""}" data-action="research-tab" data-tab="complete" data-tooltip="Show research the swarm has already resolved. Completed effects are authoritative and remain active permanently." aria-pressed="${
        activeResearchTab === "complete"
      }"><span>COMPLETE</span><strong>${completeResearch.length}</strong></button>
    </nav>
    <div class="research-list">
      ${selectedResearch
        .map((definition) => {
          const queued = state.researchQueue.some((item) => item.id === definition.id);
          const complete = state.completedResearch.includes(definition.id);
          const eta = (definition.requiredNaniteMs + capacity - 1n) / capacity;
          return `<article class="research-card${newUnlockClass(`research:${definition.id}`)}" data-unlock-id="research:${definition.id}" data-tooltip-key="research-card:${definition.id}" data-tooltip="${definition.description} Effect: ${definition.effect} Queueing reserves the complete listed cost before any work begins."><div><strong>${definition.name}</strong><p>${definition.description}</p><p class="research-effect">${definition.effect}</p>
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
  return `<section class="panel project-panel${newUnlockClass("projects")}" data-unlock-id="projects" data-tooltip="Long-horizon projects expose distant objectives before their requirements are resolved.">
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
          ([tier, count]) => `<button class="log-filter tier-${tier} ${activeLogTier === tier ? "active" : ""}" data-action="log-filter" data-tier="${tier}" data-tooltip="${tier === "all" ? "Show every retained event regardless of significance. Filtering changes only this view and never deletes history." : LOG_TIER_MEANING[tier]}" aria-pressed="${
            activeLogTier === tier
          }"><span>${tier.toUpperCase()}</span><strong>${String(count).padStart(2, "0")}</strong></button>`,
        )
        .join("")}
    </nav>
    <div class="telemetry-log" role="log" aria-live="polite">
      ${visibleLog.map((entry) => {
        const elapsed = Math.max(0, entry.at - state.createdAt + 9_247);
        const label = entry.elapsedLabel ?? (elapsed < 60_000 ? `+${(elapsed / 1000).toFixed(3)}s` : `+${Math.floor(elapsed / 60_000)}m`);
        return `<div class="telemetry-line tone-${entry.tone}" data-tooltip-key="log:${entry.id}" data-tooltip="${escapeAttribute(logEntryTooltip(entry, label))}"><time>${label}</time><span class="tier-badge tier-${entry.tier}">${entry.tier.toUpperCase()}</span><span>${entry.message}</span></div>`;
      }).join("")}
      ${visibleLog.length === 0 ? `<p class="log-empty">NO ${activeLogTier.toUpperCase()} EVENTS RECORDED</p>` : ""}
      <div id="log-end"></div>
    </div>
  </section>`;
}

function feedbackDiagnostics() {
  return {
    page: window.location.href,
    saveVersion: state.version,
    nanites: state.nanites.toString(),
    energy: state.energy.toString(),
    activeCohorts: state.cohorts.length,
    completedResearch: state.completedResearch.join(", ") || "none",
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
  };
}

function feedbackFormHtml() {
  if (!feedbackSelection) return "";
  const categories = ["Bug", "Suggestion", "Balance", "Accessibility", "Question"];
  return `<div class="feedback-overlay" role="presentation">
    <section class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title" data-tooltip="Report the selected interface element. The game composes a public issue, then GitHub asks the player to sign in and confirm submission.">
      <header><div><span class="eyebrow">SELECTED INTERFACE · ${escapeAttribute(feedbackSelection.key)}</span><h2 id="feedback-title">GIVE FEEDBACK</h2></div>
        <button type="button" class="feedback-close" data-action="feedback-cancel" aria-label="Close feedback form">×</button></header>
      <div class="feedback-selection-summary"><span>ABOUT</span><strong>${escapeAttribute(feedbackSelection.label)}</strong><small>${escapeAttribute(feedbackSelection.description)}</small></div>
      <form class="feedback-form" data-feedback-form>
        <label><span>CATEGORY</span><select data-action="feedback-category" data-feedback-field="category" data-tooltip="Choose the kind of report so its public GitHub issue title can be scanned quickly.">
          ${categories.map((category) => `<option value="${category}" ${feedbackDraft.category === category ? "selected" : ""}>${category}</option>`).join("")}
        </select></label>
        <label><span>SHORT SUMMARY</span><input type="text" maxlength="120" required value="${escapeAttribute(feedbackDraft.summary)}" data-action="feedback-summary" data-feedback-field="summary" placeholder="What should Pete look at?" data-tooltip="A concise summary becomes the public GitHub issue title. Avoid personal information."></label>
        <label><span>DETAILS</span><textarea rows="7" maxlength="4000" required data-action="feedback-details" data-feedback-field="details" placeholder="What happened, what did you expect, and can you reproduce it?" data-tooltip="Describe the behaviour, expected result, and reproduction steps. This text will be public on GitHub.">${escapeAttribute(feedbackDraft.details)}</textarea></label>
        <label class="feedback-diagnostics"><input type="checkbox" ${feedbackDraft.includeDiagnostics ? "checked" : ""} data-action="feedback-diagnostics" data-feedback-field="includeDiagnostics"><span>INCLUDE GAME AND BROWSER DIAGNOSTICS</span></label>
        <p class="feedback-privacy">Reports are public. Diagnostics include game counts, completed research, viewport, and browser identification—not the full save or personal account data. GitHub requires sign-in and final confirmation.</p>
        ${feedbackOpened ? `<p class="feedback-opened" role="status">PREFILLED ISSUE OPENED · REVIEW IT ON GITHUB, THEN SELECT “SUBMIT NEW ISSUE”</p>` : ""}
        <div class="feedback-actions">
          <button type="button" class="terminal-button" data-action="feedback-reselect" data-tooltip="Close this form and choose a different interface element.">RESELECT ELEMENT</button>
          <button type="submit" class="terminal-button feedback-submit" data-action="feedback-submit" data-tooltip="Open GitHub's public new-issue page with this report and the selected interface context already filled in.">OPEN PREFILLED GITHUB ISSUE</button>
        </div>
      </form>
    </section>
  </div>`;
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
    state.seenUnlocks.join(","),
    state.log.length,
    state.log.at(-1)?.id ?? "",
    activeLogTier,
    activeResearchTab,
    ...DIRECTIVES.map((directive) => state.allocationTargets?.[directive] ?? 0n),
    sonicMind.enabled,
    sonicMind.volumePercent,
    notice ?? "",
    feedbackSelecting,
    feedbackSelection?.key ?? "",
    feedbackOpened,
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

const FOCUS_DATA_KEYS = ["action", "directive", "research", "tab", "tier", "delta", "shareDelta"];

function captureFocusedControl() {
  const element = document.activeElement;
  if (!element || !root.contains(element) || !element.dataset?.action) return null;
  const snapshot = {
    data: Object.fromEntries(FOCUS_DATA_KEYS.map((key) => [key, element.dataset[key] ?? ""])),
  };
  if (element.matches("input, textarea")) {
    snapshot.value = element.value;
    snapshot.selectionStart = element.selectionStart;
    snapshot.selectionEnd = element.selectionEnd;
  }
  return snapshot;
}

function restoreFocusedControl(snapshot) {
  if (!snapshot) return;
  const element = [...root.querySelectorAll("[data-action]")].find((candidate) =>
    FOCUS_DATA_KEYS.every((key) => (candidate.dataset[key] ?? "") === snapshot.data[key]));
  if (!element || element.disabled) return;
  if (snapshot.data.action === "set-share-percent" && snapshot.value !== undefined) element.value = snapshot.value;
  element.focus({ preventScroll: true });
  if (snapshot.selectionStart !== null && snapshot.selectionStart !== undefined && element.setSelectionRange) {
    element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
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
  const focusedControl = captureFocusedControl();
  const depositTotal = totalMatter(state.activeDeposit.matter);
  delayedTooltips.preserve();
  root.innerHTML = `<div class="game-shell${feedbackSelecting ? " feedback-selecting" : ""}">
    <header class="game-header">
      <div class="brand-lockup"><button type="button" class="brand-mark${feedbackSelecting ? " active" : ""}" data-action="feedback" aria-pressed="${feedbackSelecting}" data-tooltip="Activate feedback selection, then click any interface element to describe it in a public GitHub issue. Click the symbol again to cancel selection.">◈</button><div><h1>NANOSWARM</h1><p>LOCAL DIRECTIVE AUTHORITY · SEED 01</p></div></div>
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
    ${feedbackSelecting ? `<div class="feedback-select-banner" role="status">FEEDBACK SELECTOR ACTIVE · CLICK ANY INTERFACE ELEMENT · CLICK ◈ TO CANCEL</div>` : ""}
    <main class="dashboard-grid">
      <div class="dashboard-column">${operationsHtml(now)}${resourcesHtml()}${projectsHtml()}</div>
      <div class="dashboard-column">${allocationsHtml()}${researchHtml()}</div>
      <div class="dashboard-column log-column">${logHtml()}</div>
    </main>
    ${feedbackFormHtml()}
  </div>`;
  const log = document.querySelector(".telemetry-log");
  if (wasAtBottom && log) log.scrollTop = log.scrollHeight;
  document.querySelectorAll(".dashboard-column").forEach((column, index) => {
    column.scrollTop = previousColumnScroll[index] ?? 0;
  });
  restoreFocusedControl(focusedControl);
  window.scrollTo(previousScroll.x, previousScroll.y);
  delayedTooltips.refresh();
  if (feedbackSelection && !focusedControl?.data.action.startsWith("feedback-")) {
    document.querySelector("[data-action='feedback-summary']")?.focus({ preventScroll: true });
  }
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
  if (action === "feedback") {
    if (feedbackSelecting) {
      feedbackSelecting = false;
    } else {
      feedbackSelection = null;
      feedbackSelecting = true;
      resetFeedbackDraft();
    }
    renderGame(Date.now(), true);
    return true;
  } else if (action === "feedback-cancel") {
    feedbackSelecting = false;
    feedbackSelection = null;
    resetFeedbackDraft();
    renderGame(Date.now(), true);
    return true;
  } else if (action === "feedback-reselect") {
    feedbackSelection = null;
    feedbackSelecting = true;
    feedbackOpened = false;
    renderGame(Date.now(), true);
    return true;
  } else if (action === "begin") {
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
    feedbackSelecting = false;
    feedbackSelection = null;
    resetFeedbackDraft();
    lastStructuralSignature = null;
    renderIntro();
    return true;
  }
  return false;
}

function describeFeedbackTarget(origin) {
  const element = origin.closest?.(
    "[data-feedback-label], [data-tooltip-key], [data-action], [data-unlock-id], [data-cohort-slot], .panel, .game-header, .dashboard-column, main",
  ) ?? origin;
  const heading = element.matches?.(".panel")
    ? element.querySelector(".panel-heading span:first-child")?.textContent
    : "";
  const compactText = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
  const label = element.dataset?.feedbackLabel || element.getAttribute?.("aria-label") || heading || compactText || element.tagName;
  const actionContext = element.dataset?.action
    ? [element.dataset.action, element.dataset.directive, element.dataset.research, element.dataset.tab, element.dataset.tier]
      .filter(Boolean)
      .join(":")
    : "";
  const key = element.dataset?.tooltipKey || element.dataset?.unlockId || element.dataset?.cohortSlot || actionContext ||
    [...(element.classList ?? [])].slice(0, 3).join(".") || element.tagName.toLowerCase();
  const description = tooltipTextFor(element) || `Selected ${element.tagName.toLowerCase()} interface region.`;
  return { label, key, description };
}

root.addEventListener("click", (event) => {
  if (!feedbackSelecting || event.target.closest?.("[data-action='feedback']")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  feedbackSelection = describeFeedbackTarget(event.target);
  feedbackSelecting = false;
  resetFeedbackDraft();
  renderGame(Date.now(), true);
}, true);

const repeatIdentity = (button) => [
  button.dataset.action,
  button.dataset.directive,
  button.dataset.delta,
  button.dataset.shareDelta,
].join(":");
let repeatSession = null;
let repeatClickSuppression = null;

function acknowledgeUnlocks(event) {
  if (!state) return false;
  return acknowledgeUnlockIds(state, event.composedPath().map((target) => target?.dataset?.unlockId));
}

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
  const acknowledged = acknowledgeUnlocks(event);
  event.preventDefault();
  stopRepeating();
  const identity = repeatIdentity(button);
  repeatClickSuppression = { identity, until: Number.POSITIVE_INFINITY };
  const session = { button, repetitions: 0, timer: null };
  repeatSession = session;
  const succeeded = performButtonAction(button);
  if (acknowledged && state) saveGame(state);
  if (succeeded) scheduleRepeat(session);
  else stopRepeating();
});

document.addEventListener("pointerup", stopRepeating);
document.addEventListener("pointercancel", stopRepeating);
window.addEventListener("blur", stopRepeating);

root.addEventListener("click", (event) => {
  const acknowledged = acknowledgeUnlocks(event);
  const button = event.target.closest("button[data-action]");
  if (!button) {
    if (acknowledged) {
      saveGame(state);
      renderGame(Date.now(), true);
    }
    return;
  }
  if (
    repeatClickSuppression?.identity === repeatIdentity(button) &&
    Date.now() <= repeatClickSuppression.until
  ) {
    event.preventDefault();
    return;
  }
  repeatClickSuppression = null;
  performButtonAction(button);
  if (acknowledged && state) saveGame(state);
});

function syncFeedbackDraft(control) {
  const field = control?.dataset?.feedbackField;
  if (!field) return false;
  feedbackDraft[field] = control.type === "checkbox" ? control.checked : control.value;
  feedbackOpened = false;
  return true;
}

root.addEventListener("submit", (event) => {
  const form = event.target.closest?.("form[data-feedback-form]");
  if (!form || !state || !feedbackSelection) return;
  event.preventDefault();
  form.querySelectorAll("[data-feedback-field]").forEach(syncFeedbackDraft);
  const issueUrl = buildFeedbackIssueUrl({
    ...feedbackDraft,
    selection: feedbackSelection,
    diagnostics: feedbackDraft.includeDiagnostics ? feedbackDiagnostics() : null,
  });
  saveGame(state);
  window.open(issueUrl, "_blank", "noopener,noreferrer");
  feedbackOpened = true;
  renderGame(Date.now(), true);
});

root.addEventListener("input", (event) => {
  if (syncFeedbackDraft(event.target.closest?.("[data-feedback-field]"))) return;
  const control = event.target.closest("input[data-action='volume']");
  if (!control) return;
  sonicMind.setVolume(Number(control.value) / 100);
});

root.addEventListener("change", (event) => {
  if (!state) return;
  if (syncFeedbackDraft(event.target.closest?.("[data-feedback-field]"))) return;
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
