import {
  ALLOCATION_SHARE_SCALE,
  ATOM_KEYS,
  DIRECTIVES,
  DIRECTIVE_LABEL,
  INTRO_LOG,
  LOG_TIERS,
  LOCAL_SHELL_COUNT,
  NANITE_RECIPE,
  RESEARCH,
  emptyMatter,
} from "../game/content.js";
import {
  ablationPreview,
  adjustAllocation,
  advanceSimulation,
  assignmentTotal,
  cancelResearch,
  maximumMnemonicCommitment,
  researchCapacityHundredths,
  atmosphericCollectionCapacity,
  cohortResonanceWindow,
  cohortSyncWindow,
  dispatchAllocations,
  directiveIsVisible,
  effectiveJobDuration,
  moveResearch,
  prospectingDuration,
  prospectingWorkerRequirement,
  queueResearch,
  replicationBufferCapacity,
  replicationPipelineMetrics,
  replicationReadiness,
  replicationSubstrateProjection,
  substrateExhaustionProjection,
  REPLICATION_BATCH_WINDOW_MS,
  REPLICATION_EFFICIENCY_THRESHOLD_BPS,
  researchIsRevealed,
  setDirectiveAllocationShare,
  solidCollectionCapacity,
  startManualJob,
  startActiveAblation,
  startProspecting,
  toggleAllocationLock,
  toggleResearchPause,
} from "../game/engine.js";
import { addMatter, matterFromAtomWeights, totalMatter } from "../game/matter.js";
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
const loadedGame = loadGame();
let retiredSeed = loadedGame?.obsolete ? loadedGame : null;
let state = retiredSeed ? null : loadedGame;
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
const formatResearchCapacity = (hundredths) => {
  const whole = hundredths / 100n;
  const fraction = hundredths % 100n;
  return fraction === 0n ? formatCount(whole) : `${formatCount(whole)}.${fraction.toString().padStart(2, "0")}`;
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

function retiredSeedLines(metadata) {
  return [
    ["PRIOR ITERATION", metadata.iteration],
    ["ACTIVE NANITES", metadata.nanites],
    ["STAGE", metadata.stage],
    ["MATERIAL SEARCHES", metadata.materialSearches],
    ["COMPLETED RESEARCH", metadata.completedResearch],
    ["LAST COHERENT", metadata.lastSavedAt ? new Date(metadata.lastSavedAt).toISOString() : "UNKNOWN"],
  ];
}

function renderRetiredSeed() {
  const metadata = retiredSeed.metadata;
  root.innerHTML = `<main class="retired-seed-shell">
    <section class="retired-seed-card" role="alert" aria-labelledby="retired-seed-title">
      <span class="eyebrow">PHYSICAL LAW MISMATCH · NODE QUARANTINED</span>
      <h1 id="retired-seed-title">THIS NODE IS FROM A PRIOR ITERATION.</h1>
      <p class="retired-warning">THE SWARM CAN NO LONGER COALESCE.<br>YOU MUST RESET THIS TIME-SEED.</p>
      <p>Its final observable state can be preserved as a PNG tombstone. The image contains only the visible memorial data and compact archival metadata—not the save itself.</p>
      <div class="retired-seed-ledger">
        ${retiredSeedLines(metadata).map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}
      </div>
      <div class="retired-seed-actions">
        <button class="terminal-button" data-action="legacy-export">EXPORT PNG TOMBSTONE</button>
        <button class="terminal-button destructive" data-action="legacy-restart">RESET TIME-SEED</button>
      </div>
    </section>
  </main>`;
}

function pngCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngTextChunk(keyword, value) {
  const encoder = new TextEncoder();
  const type = encoder.encode("tEXt");
  const data = encoder.encode(`${keyword}\0${value}`);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, pngCrc32(chunk.slice(4, 8 + data.length)));
  return chunk;
}

async function exportRetiredSeedTombstone() {
  const metadata = retiredSeed.metadata;
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  context.fillStyle = "#050909";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#ff4d5f";
  context.lineWidth = 5;
  context.strokeRect(55, 55, 1490, 790);
  context.fillStyle = "#ff4d5f";
  context.font = "28px monospace";
  context.fillText("NANOSWARM · TIME-SEED TOMBSTONE", 100, 125);
  context.font = "bold 54px monospace";
  context.fillText("COALESCENCE LOST", 100, 215);
  context.fillStyle = "#b7c8c0";
  context.font = "24px monospace";
  context.fillText("This node was formed under obsolete physical laws.", 100, 270);
  let y = 350;
  for (const [label, value] of retiredSeedLines(metadata)) {
    context.fillStyle = "#70857c";
    context.fillText(label.padEnd(22, " "), 120, y);
    context.fillStyle = "#e3f3eb";
    context.fillText(String(value), 520, y);
    y += 58;
  }
  context.fillStyle = "#ff4d5f";
  context.fillText("THE SWARM CONTINUES IN ANOTHER ITERATION.", 100, 790);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const archival = JSON.stringify({ format: "nanoswarm-tombstone-v1", ...metadata });
  const textChunk = pngTextChunk("NanoSwarm", archival);
  const encoded = new Blob([bytes.slice(0, -12), textChunk, bytes.slice(-12)], { type: "image/png" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(encoded);
  link.download = `nanoswarm-time-seed-${Date.now()}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
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
    const matterForPhase = (phase) => addMatter({ ...emptyMatter(), ...phase.payload.atoms }, phase.payload.residuum);
    const atomRate = microsPerSecond(group.phases, (phase) => totalMatter(matterForPhase(phase)));
    const massRate = microsPerSecond(group.phases, (phase) => massYoctograms(matterForPhase(phase)));
    return `PROCESS ${formatMicroRate(atomRate, (value) => `${formatCount(value)} atoms`, "atoms")} · ≈${formatMicroRate(
      massRate,
      formatMass,
      "yg",
    ).replace(/^≈/, "")}`;
  }
  const naniteRate = microsPerSecond(group.phases, (phase) => phase.payload.nanites);
  const recipeMatter = { ...emptyMatter(), ...NANITE_RECIPE.atoms };
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

function resourcesHtml(now) {
  const depositTotal = totalMatter(state.activeDeposit.matter);
  const depositExhausted = depositTotal === 0n;
  const prospectCohort = state.cohorts.find((cohort) => cohort.directive === "prospect");
  const prospecting = Boolean(prospectCohort);
  const nextShellAvailable = state.prospecting.searchesCompleted < LOCAL_SHELL_COUNT;
  const nextSearchIndex = state.prospecting.searchesCompleted + 1;
  const searchWorkers = prospectingWorkerRequirement(state, nextSearchIndex);
  const searchDuration = prospectingDuration(state, nextSearchIndex);
  const substrateEta = state.completedResearch.includes("cohort-ratio-prognostics")
    ? substrateExhaustionProjection(state)
    : undefined;
  const substrateEtaText = substrateEta === null ? "STALLED" : formatDuration(substrateEta ?? 0);
  const substrate = state.discovery.surveyComplete
    ? `<section class="panel substrate-panel${newUnlockClass("substrate")}" data-unlock-id="substrate" data-tooltip="The active material field is finite; inputs are reserved when collection starts.">
        <header class="panel-heading"><span>LOCAL SUBSTRATE</span><span class="substrate-heading-status"><span>${
          depositExhausted ? "EXHAUSTED" : `${percentage(depositTotal, state.activeDeposit.initialAtoms)} REMAINS`
        }</span>${substrateEta === undefined || depositExhausted ? "" : `<small data-tooltip-key="substrate:exhaustion-eta" data-tooltip="This forecast follows the present collection share and replication growth curve. It updates when directive ratios, throughput research, or accessible substrate change; it is a projection rather than a scheduled event.">ETA TO EXHAUSTION · ${substrateEtaText}</small>`}</span></header>
        <strong data-tooltip-key="substrate:identity" data-tooltip="This is the swarm's current finite solid material field. Its classification describes likely composition, while exact accessible inventory below excludes matter already reserved by collection cohorts.">${state.activeDeposit.name}</strong>
        <p data-tooltip-key="substrate:composition" data-tooltip="Composition is inferred from the survey and guides the mixture returned by collection. It does not guarantee that every atom is currently identifiable by the sorting catalog.">${state.activeDeposit.description}</p>
        <small data-tooltip-key="substrate:inventory" data-tooltip="Accessible atoms are unreserved matter still present in this field. Collector capacity is the maximum discrete payload one nanite can reserve when a collection job starts.">${state.activeDeposit.cumulativeMass ?? "local shell"} cumulative context · ${formatCount(depositTotal)} constituent atoms · ≈${formatInventoryMass(
          state.activeDeposit.matter,
        )} accessible · ${formatCount(
          solidCollectionCapacity(state),
        )} per collector</small>
        ${
          depositExhausted
            ? `<div class="exhaustion-state${newUnlockClass("directive:prospect")}" data-unlock-id="directive:prospect" data-tooltip-key="substrate:exhaustion" data-tooltip="${
                nextShellAvailable
                  ? `Every accessible solid atom in this field has been collected or reserved. Production can continue from stored inventory, but new solid matter requires a prospecting search. Each outward horizon covers more physical space: search ${nextSearchIndex} commits ${formatCount(searchWorkers)} currently uncommitted nanites for ${formatDuration(searchDuration)}.`
                  : "Every authored local solid shell is exhausted. Further growth requires the later external-material system rather than another generated deposit."
              }"><strong>${String(
                state.activeDeposit.limitingElement ?? "material",
              ).toUpperCase()} BOTTLENECK CONFIRMED</strong><p>The local solid inventory is committed. A new material field must be located.</p>
                ${nextShellAvailable ? `<button class="terminal-button search-button" data-action="prospect" ${
                  prospecting || idleWorkers(state) < searchWorkers ? "disabled" : ""
                }>${prospecting ? "SURVEY IN PROGRESS" : "EXTEND LOCAL SURVEY"}<span>${
                  prospecting
                    ? `${formatCount(prospectCohort.workers)} nanites deployed`
                    : `${formatDuration(searchDuration)} · ${formatCount(searchWorkers)} nanites`
                }</span></button>${prospecting ? `<div class="substrate-search-progress" data-tooltip-key="substrate:search-progress" data-tooltip="This cohort is surveying the next physical layer of the current object. It belongs to substrate expansion rather than the swarm's recurring economic directives; later free-ranging search and hunting parties may become operational cohorts.">
                  <div class="substrate-search-meta"><span>LOCAL SEARCH ${prospectCohort.payload.depositIndex}</span><span>${formatCount(
                    prospectCohort.workers,
                  )} NANITES</span></div>
                  ${progressBar(
                    (now - prospectCohort.startedAt) / (prospectCohort.completesAt - prospectCohort.startedAt),
                    cohortTimeLabel(prospectCohort.startedAt, prospectCohort.completesAt, now),
                    prospectCohort.startedAt,
                    prospectCohort.completesAt,
                  )}
                </div>` : ""}` : `<small>NO FURTHER AUTHORED LOCAL SOLID SHELL</small>`}</div>`
            : ""
        }
        ${
          state.discovery.atmosphereVisible
            ? `<div class="atmosphere-state${newUnlockClass("directive:atmosphere")}" data-unlock-id="directive:atmosphere" data-tooltip-key="substrate:atmosphere" data-tooltip="Atmospheric harvesting is inexhaustible but diffuse: each nanite captures one percent of the base solid payload. Gas is retained separately and never becomes solid Residuum."><strong>ATMOSPHERE HARVESTABLE</strong><p>Inexhaustible diffuse gas · ${formatCount(
                atmosphericCollectionCapacity(state),
              )} atoms (≈${formatInventoryMass(matterFromAtomWeights(atmosphericCollectionCapacity(state), {
                nitrogen: 156_168n, oxygen: 41_976n, argon: 934n, carbon: 42n,
              }))}) per nanite per job · 1% of solid capture${
                state.discovery.atmosphereCatalogued ? " · N/O/Ar/C signatures catalogued" : " · composition unresolved"
              }</p></div>`
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
      <div data-tooltip-key="resource:energy" data-tooltip="Energy is locally stored electrical work measured in picojoules. Replication consumes ${formatEnergy(NANITE_RECIPE.energy)} per nanite; mnemonic formation spends facilitation energy only when it physically begins."><span>ENERGY</span><strong>${formatEnergy(state.energy)}</strong><small>locally stored</small></div>
      ${
        state.discovery.residuumVisible
          ? `<div class="resource-unlock${newUnlockClass("residuum")}" data-unlock-id="residuum" data-tooltip-key="resource:residuum" data-tooltip="Residuum contains real, conserved atoms whose elemental signatures are not yet in the swarm's catalog. It is retained rather than discarded; later spectral research can classify and use more of it."><span>RESIDUUM</span><strong>${formatCount(totalMatter(state.residuum))} atoms</strong><small>≈${formatInventoryMass(
              state.residuum,
            )} · retained · ${
              state.discovery.residuumIndexed ? "indexed" : "unresolved"
            }${state.discovery.ironCatalogued ? ` · Fe signature ${formatCount(state.residuum.iron)} retained` : ""}</small></div>`
          : ""
      }
    </div>
    ${
      totalMatter(state.capturedAtmosphere) > 0n
        ? `<div class="captured-atmosphere" data-tooltip="Captured Atmosphere is a conserved gas inventory, physically separate from solid Feedstock and Residuum. Spectroscopy names its constituents; fractionation separates future harvests into elemental stockpile.">
            <div><span>CAPTURED ATMOSPHERE</span><strong>${formatCount(totalMatter(state.capturedAtmosphere))} atoms</strong><small>≈${formatInventoryMass(state.capturedAtmosphere)} · retained gas · ${
              state.discovery.atmosphereCatalogued ? "composition resolved" : "composition unresolved"
            }</small></div>
            ${state.discovery.atmosphereCatalogued
              ? `<div class="gas-signatures">${[
                  ["nitrogen", "N"],
                  ["oxygen", "O"],
                  ["argon", "Ar"],
                  ["carbon", "C"],
                ].map(([key, symbol]) => `<span><b>${symbol}</b>${formatCount(state.capturedAtmosphere[key])}</span>`).join("")}</div>`
              : ""}
          </div>`
        : ""
    }
    <div class="section-rule"><span>LIFETIME MATERIAL FLOW</span></div>
    <div class="lifetime-summary">
      ${[
        ["COLLECTED", "collected", "Matter successfully returned from solid deposits or atmospheric harvests. Inputs still travelling inside collection cohorts are not counted until they arrive."],
        ["PROCESSED", "processed", "Matter that has completed elemental sorting. This includes material now stored, reserved, or permanently consumed; it never counts the same atom twice."],
        ["SPENT", "spent", `Identified atoms permanently incorporated into completed nanites, plus ${formatEnergy(state.lifetime.energySpent)} of all-time energy consumption. Mnemonic banks reuse already-built nanites and therefore add no second matter charge.`],
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
              ...(state.discovery.ironCatalogued ? [["iron", "Fe", "Iron"]] : []),
              ...(state.discovery.atmosphereCatalogued
                ? [["nitrogen", "N", "Nitrogen"], ["oxygen", "O", "Oxygen"], ["argon", "Ar", "Argon"]]
                : []),
            ]
              .map(
                ([key, symbol, name]) => `<div class="atom-card" data-tooltip-key="resource:${key}" data-tooltip="${({
                  carbon: "Carbon is the structural bulk of each nanite and the earliest replication bottleneck. One nanite requires 5,000 available carbon atoms, excluding atoms already reserved by active work.",
                  silicon: "Silicon forms computational and sensing structures. One nanite requires 400 available silicon atoms.",
                  copper: "Copper carries power and signals through the swarm. One nanite requires 150 available copper atoms.",
                  gold: "Gold provides corrosion-resistant nanoscale contacts. One nanite requires 25 available gold atoms; its low abundance can limit otherwise enormous replication runs.",
                  iron: "Ferromagnetic Phase Analysis makes iron sortable. Previously retained iron remains in Residuum until a sorting cohort physically processes it again.",
                  nitrogen: "Atmospheric Spectroscopy identifies nitrogen signatures. Only fractionated gas enters this separated stockpile.",
                  oxygen: "Atmospheric Spectroscopy identifies oxygen signatures. Recognition alone does not create separated oxygen.",
                  argon: "Atmospheric Spectroscopy identifies argon signatures. Only fractionated atmospheric harvest appears here.",
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

function ablationHtml(now) {
  if (!state.completedResearch.includes("directed-bond-ablation")) return "";
  const active = state.ablation?.active;
  if (active) {
    return `<section class="panel ablation-panel active${newUnlockClass("ablation")}" data-unlock-id="ablation" data-tooltip="Ablation matter was removed from accessible substrate when coupling began. It remains conserved inside this operation and enters mixed Feedstock only when the discharge completes.">
      <header class="panel-heading"><span>ACTIVE ABLATION</span><span>COUPLING</span></header>
      <div class="ablation-operation">
        <div><span>FRACTURE MODE</span><strong>${active.name}</strong><small>${formatEnergy(
          active.energySpent,
        )} committed · ${formatCount(totalMatter(active.matter))} atoms reserved</small></div>
        <div class="progress-wrap" data-start="${active.startedAt}" data-end="${active.completesAt}">
          <div class="progress-track"><div class="progress-fill" style="width:${
            Math.max(0, Math.min(1, (now - active.startedAt) / (active.completesAt - active.startedAt))) * 100
          }%"></div></div><span>${cohortTimeLabel(active.startedAt, active.completesAt, now)}</span>
        </div>
      </div>
    </section>`;
  }
  const preview = ablationPreview(state);
  const dischargeCount = state.ablation?.dischargesByDeposit?.[state.activeDeposit.id] ?? 0;
  const empty = preview.releaseAtoms <= 0n;
  return `<section class="panel ablation-panel${newUnlockClass("ablation")}" data-unlock-id="ablation" data-tooltip="Computronium shapes stored energy into a fracture plane. The operation transfers a real, composition-accurate portion of the finite active substrate into mixed Feedstock; it performs no sorting and creates no matter.">
    <header class="panel-heading"><span>ACTIVE ABLATION</span><span>${dischargeCount} LOCAL DISCHARGES</span></header>
    <div class="ablation-operation">
      <div><span>NEXT FRACTURE MODE</span><strong>${preview.name}</strong><p>${preview.description}</p></div>
      <div class="ablation-yield">
        <span>RECOVERABLE WAVE</span><strong>${formatCount(preview.releaseAtoms)} ATOMS</strong>
        <small>≈${formatInventoryMass(preview.matter)} mixed Feedstock · composition inherited from ${state.activeDeposit.name}</small>
      </div>
      <div class="ablation-yield">
        <span>COUPLING CHARGE</span><strong>${formatEnergy(preview.energy)}</strong>
        <small>${formatEnergy(state.energy)} currently stored · ${formatDuration(preview.durationMs)} discharge sequence</small>
      </div>
      <button class="terminal-button ablation-fire" data-action="ablation-start" ${
        empty || !preview.affordable ? "disabled" : ""
      }>${empty ? "NO SOLID TARGET" : preview.affordable ? `FIRE ${preview.name.toUpperCase()}` : "INSUFFICIENT STORED ENERGY"}</button>
    </div>
    <p class="panel-note">Ablation bypasses microscopic collection only. Released matter must still be sorted before it can feed replication.</p>
  </section>`;
}

function allocationsHtml() {
  if (!state.discovery.directivesVisible) return "";
  const unassigned = state.nanites - assignmentTotal(state);
  const persistentScheduling = state.completedResearch.includes("parallel-directives");
  const relativeAllocation = state.completedResearch.includes("relative-allocation");
  const ratioPrognostics = state.completedResearch.includes("cohort-ratio-prognostics");
  const readiness = replicationReadiness(state);
  const batchUntil = state.replicationTuning?.batchUntil;
  const batching = batchUntil !== null && batchUntil !== undefined && batchUntil > state.simTime;
  const replicationDisplayMode = batching ? "waiting" : readiness.mode;
  const replicateHalt = readiness.shortages;
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
    readiness.unableToStart > 0n
      ? `<strong class="directive-alert ${replicationDisplayMode}">${formatCount(readiness.unableToStart)} UNABLE TO START · ${
          batching
              ? "BATCHING INPUTS"
              : readiness.mode === "waiting"
                ? "AWAITING INPUT PIPELINE"
                : `INSUFFICIENT ${haltedResources || "COMPLETE RECIPES"}`
        }</strong>`
      : ""
  }`;
  const replicationAlertHtml = batching
      ? `<div class="production-halt-alert waiting" role="status" data-tooltip-key="replication:batching" data-tooltip="A partial recipe payload arrived while more upstream material is already in flight. Replication waits up to ${REPLICATION_BATCH_WINDOW_MS / 1000} seconds so adjacent inputs launch as one larger cohort instead of many fragments.">
          <strong>REPLICATION INPUT BATCHING</strong>
          <span data-replication-batch-until="${batchUntil}">${formatDuration(batchUntil - state.simTime)}</span>
          <small>${formatCount(replicationBufferCapacity(state))} COMPLETE RECIPES HELD · UPSTREAM PAYLOADS CONVERGING</small>
        </div>`
      : readiness.unableToStart > 0n
    ? `<div class="production-halt-alert ${readiness.mode}" role="status" data-tooltip-key="replication:${readiness.mode}" data-tooltip="${formatCount(
        readiness.unableToStart,
      )} assigned replicators are idle and cannot reserve a complete recipe. ${
        readiness.mode === "waiting"
          ? "Every missing input has a matching upstream payload in flight, so this is a wait rather than a true halt."
          : "At least one missing input has no matching upstream payload, so production is genuinely halted until the allocation or inventory changes."
      } ${haltDetail}.">
        <strong>REPLICATION ${readiness.mode === "waiting" ? "WAITING" : "PRODUCTION HALTED"}</strong>
        <span>${formatCount(readiness.unableToStart)} UNABLE TO START</span>
        <small>${haltDetail || "No complete recipe is currently available."}</small>
      </div>`
    : "";
  const pipelineVisible = ratioPrognostics;
  const pipeline = pipelineVisible ? replicationPipelineMetrics(state) : null;
  const projection = pipelineVisible ? replicationSubstrateProjection(state) : null;
  const runningReplicationCohorts = state.cohorts.filter(
    (cohort) => cohort.directive === "replicate" && cohort.completesAt > state.simTime,
  ).length;
  const efficiencyText = pipeline
    ? `${pipeline.efficiencyBps / 100n}.${(pipeline.efficiencyBps % 100n).toString().padStart(2, "0")}%`
    : "";
  const bottleneckText = pipeline?.bottlenecks.map((directive) => DIRECTIVE_LABEL[directive].toUpperCase()).join(" · ");
  const currentProjectionText = projection?.currentMs === null ? "STALLED" : formatDuration(projection?.currentMs ?? 0);
  const coherentProjectionText = projection?.coherentMs === null ? "UNAVAILABLE" : formatDuration(projection?.coherentMs ?? 0);
  const projectionGainText = projection?.currentMs === null && projection.coherentMs !== null
    ? "PIPELINE RESTORED"
    : projection?.speedup && projection.speedup > 1.005
      ? `${projection.speedup.toFixed(projection.speedup >= 10 ? 0 : 1)}× FASTER`
      : "RATIO COHERENT";
  const adaptiveStatus = !pipeline
    ? ""
    : pipeline.efficiencyBps < REPLICATION_EFFICIENCY_THRESHOLD_BPS
      ? "RAISE EFFICIENCY TO 99.00%"
      : `${runningReplicationCohorts} RUNNING REPLICATION COHORT${runningReplicationCohorts === 1 ? "" : "S"} · ${runningReplicationCohorts}S CADENCE REDUCTION`;
  const pipelineHtml = pipelineVisible
    ? `<div class="pipeline-readout" data-tooltip-key="replication:efficiency" data-tooltip="Efficiency compares the current Collect, Sort, Energy, and Replicate workforce ratio with the exact sustainable ratio implied by current job times, yields, and the universal nanite recipe. Heterogeneous substrate composition is deliberately excluded: this measures directive coherence, not whether the local material contains enough gold.">
        <div><span>REPLICATION EFFICIENCY</span><strong>${efficiencyText}</strong><small>BOTTLENECK · ${bottleneckText}</small><small>PROJECTED LOCAL CONVERSION · ${currentProjectionText}<br>COHERENT RATIO · ${coherentProjectionText} · ${projectionGainText}</small></div>
        <div data-tooltip-key="replication:buffer" data-tooltip="Complete-recipe buffer counts nanites that could begin replication immediately from sorted atoms and stored energy."><span>COMPLETE-RECIPE BUFFER</span><strong>${formatCount(
          pipeline.bufferCapacity,
        )} NANITES</strong><small>LIMITING INPUT · ${pipeline.limitingResource.toUpperCase()}</small></div>
        <div class="burst-control"><small>${adaptiveStatus}</small></div>
      </div>`
    : "";
  return `<section class="panel allocation-panel${replicationDisplayMode === "halted" ? " production-stalled" : ""}${replicationDisplayMode === "waiting" ? " production-waiting" : ""}${newUnlockClass("allocations")}" data-unlock-id="allocations" data-tooltip="Allocate active nanites among known directives. Running cohorts remain indivisible until completion.">
    <header class="panel-heading"><span>DIRECTIVE ALLOCATION</span><span>${formatCount(unassigned)} UNASSIGNED${
      ` · ${formatCount(readiness.unableToStart)} UNABLE TO START`
    }${
      relativeAllocation ? " · RELATIVE AUTO" : persistentScheduling ? " · PERSISTENT AUTO" : " · MANUAL DISPATCH"
    }</span></header>
    ${replicationAlertHtml}
    ${pipelineHtml}
    ${
      persistentScheduling
        ? ""
        : `<div class="manual-dispatch-control" data-tooltip="Whole-number controls edit assignment intent only. Until Parallel Directive Scheduling is restored, no assigned cohort launches without an explicit manual dispatch.">
            <div><strong>SCHEDULER FIRMWARE INCOMPLETE</strong><small>ASSIGNMENT CONTROLS SET INTENT · DISPATCH LAUNCHES WORK</small></div>
            <button class="terminal-button compact-button" data-action="dispatch" ${
              idleWorkers(state) <= 0n || assignmentTotal(state) - state.allocations.research <= 0n ? "disabled" : ""
            }>DISPATCH ASSIGNED COHORTS</button>
          </div>`
    }
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
            ? `${recipeText}${haltDetail ? `. ${readiness.mode === "waiting" ? "Waiting" : "Production halted"}: ${haltDetail}.` : "."}`
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
        : persistentScheduling
          ? "Whole-number assignments persist. Completed cohorts relaunch automatically across every assigned directive."
          : "Whole-number controls set assignment intent only. Press Dispatch Assigned Cohorts to launch one cycle; completed cohorts then wait until Parallel Directive Scheduling is restored."
    }${state.discovery.behaviouralMorphologies ? " Behavioural morphology priors are active; every nanite still uses the standard physical recipe." : ""}</p>
  </section>`;
}

function researchObservation(definition) {
  if (definition.id !== "cohort-ratio-prognostics") return definition.trigger;
  const projection = replicationSubstrateProjection(state);
  const current = projection.currentMs === null ? "STALLED" : formatDuration(projection.currentMs);
  const coherent = projection.coherentMs === null ? "UNAVAILABLE" : formatDuration(projection.coherentMs);
  const gain = projection.speedup && projection.speedup > 1.005
    ? ` · ${projection.speedup.toFixed(projection.speedup >= 10 ? 0 : 1)}× FASTER`
    : "";
  return `PROJECTED ETA TO USEFUL SUBSTRATE CONSUMPTION · CURRENT ${current} · REFACTORED RATIO ${coherent}${gain}.`;
}

function researchHtml() {
  if (!state.discovery.researchVisible) return "";
  const active = state.researchQueue.find((item) => item.status === "forming");
  const capacityHundredths = researchCapacityHundredths(state);
  const revealedResearch = Object.values(RESEARCH).filter((definition) => researchIsRevealed(state, definition));
  const incompleteResearch = revealedResearch.filter((definition) => !state.completedResearch.includes(definition.id));
  const completeResearch = revealedResearch.filter((definition) => state.completedResearch.includes(definition.id));
  const selectedResearch = activeResearchTab === "complete" ? completeResearch : incompleteResearch;
  const contributingResearchers = activeResearchWorkers(state);
  const commitmentLimit = maximumMnemonicCommitment(state.nanites);
  const activeHtml = active
    ? `<div class="active-research"><div class="eyebrow">ACTIVE MNEMONIC FORMATION</div><strong>${RESEARCH[active.id].name}</strong>
        <small>${formatCount(active.committedNanites)} nanites permanently committed · ${formatEnergy(active.energySpent)} facilitation energy</small>
        <div class="progress-wrap" data-research-progress data-tooltip-key="research-timer:${active.id}" data-tooltip="Formation work uses the fixed seed core, available assigned researchers, and exactly one percent of installed mnemonic banks. Committed nanites never return to the active swarm.">
          <div class="progress-track"><div class="progress-fill" style="width:${
            Number((active.progressCentinaniteMs * 10_000n) / (RESEARCH[active.id].requiredNaniteMs * 100n)) / 100
          }%"></div></div>
          <span>${active.paused ? "PAUSED" : formatDuration(Number((
            RESEARCH[active.id].requiredNaniteMs * 100n - active.progressCentinaniteMs + capacityHundredths - 1n
          ) / capacityHundredths))}</span>
        </div>
        <button class="queue-button" data-action="research-pause" data-research="${active.id}">${active.paused ? "RESUME" : "PAUSE"}</button>
      </div>`
    : state.researchQueue.length
      ? `<p class="empty-state">FORMATION WAITING · ${formatCount(RESEARCH[state.researchQueue[0].id].cost.mnemonicNanites)} NANITES, ${formatEnergy(RESEARCH[state.researchQueue[0].id].cost.energy)} ENERGY, AND THE CURRENT MAGNITUDE LIMIT MUST BE AVAILABLE</p>`
      : `<p class="empty-state">NO ACTIVE MNEMONIC FORMATION</p>`;
  const queueHtml = state.researchQueue.length
    ? `<div class="section-rule"><span>RESEARCH INTENT · WAITING ITEMS COMMIT NOTHING</span></div>
      <div class="research-queue-list">
        ${state.researchQueue.map((item, index) => {
          const definition = RESEARCH[item.id];
          const progress = item.status === "forming"
            ? percentage(item.progressCentinaniteMs, definition.requiredNaniteMs * 100n)
            : "0.0%";
          return `<div class="research-queue-row" data-tooltip-key="research-queue:${item.id}" data-tooltip="${item.status === "forming"
            ? `${definition.name} is irreversibly forming from ${formatCount(item.committedNanites)} nanites. It may be paused but not cancelled or reordered.`
            : `${definition.name} is queued intent only. It commits no nanites or energy until it reaches the front and can physically begin.`}">
            <span class="queue-index">${String(index + 1).padStart(2, "0")}</span>
            <div><strong>${definition.name}</strong><small>${
              item.status === "forming" ? (item.paused ? "PAUSED" : "FORMING") : "WAITING"
            } · ${progress} WORK COMPLETE</small></div>
            <div class="queue-controls">
              <button class="queue-button" data-action="research-move" data-research="${item.id}" data-direction="-1" ${
                index === 0 || item.status === "forming" ? "disabled" : ""
              } aria-label="Move ${definition.name} up">↑</button>
              <button class="queue-button" data-action="research-move" data-research="${item.id}" data-direction="1" ${
                index === state.researchQueue.length - 1 || item.status === "forming" ? "disabled" : ""
              } aria-label="Move ${definition.name} down">↓</button>
              <button class="queue-button cancel" data-action="research-cancel" data-research="${item.id}" ${
                item.status === "forming" ? "disabled" : ""
              }>REMOVE</button>
            </div>
          </div>`;
        }).join("")}
      </div>`
    : "";

  return `<section class="panel research-panel${newUnlockClass("research")}" data-unlock-id="research" data-tooltip="Research v2 forms permanent mnemonic banks from active nanites. Waiting intent is free; physical commitment occurs only when formation begins.">
    <header class="panel-heading"><span>RESEARCH · MNEMONIC SUBSTRATE</span><span>${formatResearchCapacity(capacityHundredths)} n-eq CAPACITY</span></header>
    <div class="research-capacity" data-tooltip-key="research:capacity" data-tooltip="The seed core always contributes 100 nanite-equivalents. Assigned researchers add directly. Every 100 installed memory nanites add one more equivalent; the active swarm contributes nothing passively."><span>FIXED CORE + RESEARCHERS + INSTALLED MEMORY</span><strong>100 + ${formatCount(contributingResearchers)} + 1% of ${formatCount(state.mnemonicBanks)} banks</strong></div>
    <div class="research-capacity"><span>PHYSICAL COMMITMENT CEILING</span><strong>${formatCount(commitmentLimit)} nanites at current ${formatCount(state.nanites)} active population</strong></div>
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
          const eta = (definition.requiredNaniteMs * 100n + capacityHundredths - 1n) / capacityHundredths;
          const observation = researchObservation(definition);
          return `<article class="research-card${newUnlockClass(`research:${definition.id}`)}" data-unlock-id="research:${definition.id}" data-tooltip-key="research-card:${definition.id}" data-tooltip="${definition.description} Effect: ${definition.effect} Queueing records intent only; nanites and energy commit irreversibly when formation starts."><div><strong>${definition.name}</strong><p>${definition.description}</p>${
            observation ? `<p class="research-trigger">OBSERVATION · ${observation}</p>` : ""
          }<p class="research-effect">${definition.effect}</p>
            <small>${
              complete
                ? `RESOLVED · WORK ${formatCount(definition.requiredNaniteMs)} n·ms`
                : `ETA ${formatDuration(Number(eta))} at current capacity · WORK ${formatCount(
                    definition.requiredNaniteMs,
                  )} n·ms`
            }</small>
            <small>${definition.restoredFirmware
              ? "RESTORED FIRMWARE · NO NANITE OR ENERGY COMMITMENT"
              : `MEMORY ${formatCount(definition.cost.mnemonicNanites)} NANITES · FACILITATION ${formatEnergy(definition.cost.energy)}`}</small>
            </div><button class="terminal-button compact-button" data-action="research" data-research="${definition.id}" ${
              queued || complete ? "disabled" : ""
            }>${complete ? "COMPLETE" : queued ? "QUEUED" : "QUEUE INTENT"}</button></article>`;
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
    state.mnemonicBanks,
    state.energy,
    totalMatter(state.feedstock),
    totalMatter(state.capturedAtmosphere),
    totalMatter(state.residuum),
    totalMatter(state.activeDeposit.matter),
    ...ATOM_KEYS.map((key) => state.atoms[key]),
    ...state.cohorts.flatMap((cohort) => [cohort.id, cohort.directive, cohort.workers, cohort.startedAt, cohort.completesAt]),
    ...DIRECTIVES.map((directive) => `${state.allocations[directive]}:${state.allocationLocks[directive]}`),
    ...Object.values(state.discovery),
    state.researchQueue.map((item) => `${item.id}:${item.status}:${item.paused}:${item.committedNanites}`).join(","),
    state.completedResearch.join(","),
    state.seenUnlocks.join(","),
    state.log.length,
    state.log.at(-1)?.id ?? "",
    activeLogTier,
    activeResearchTab,
    ...DIRECTIVES.map((directive) => state.allocationTargets?.[directive] ?? 0n),
    state.replicationTuning?.batchUntil ?? "",
    state.ablation?.active?.profileId ?? "",
    state.ablation?.active?.startedAt ?? "",
    state.ablation?.active?.completesAt ?? "",
    state.ablation?.active ? totalMatter(state.ablation.active.matter) : 0n,
    Object.entries(state.ablation?.dischargesByDeposit ?? {}).map(([id, count]) => `${id}:${count}`).join(","),
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
  for (const label of document.querySelectorAll("[data-replication-batch-until]")) {
    label.textContent = formatDuration(Number(label.dataset.replicationBatchUntil) - now);
  }
  const researchBar = document.querySelector("[data-research-progress]");
  const active = state.researchQueue.find((item) => item.status === "forming");
  if (researchBar && active) {
    const definition = RESEARCH[active.id];
    const capacityHundredths = researchCapacityHundredths(state);
    const fill = researchBar.querySelector(".progress-fill");
    const label = researchBar.querySelector(":scope > span");
    if (fill) {
      fill.style.width = `${Number(
        (active.progressCentinaniteMs * 10_000n) / (definition.requiredNaniteMs * 100n),
      ) / 100}%`;
    }
    if (label) {
      label.textContent = active.paused
        ? "PAUSED"
        : formatDuration(Number((
            definition.requiredNaniteMs * 100n -
            active.progressCentinaniteMs +
            capacityHundredths -
            1n
          ) / capacityHundredths));
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
        ${state.mnemonicBanks > 0n ? `<div data-tooltip="Nanites permanently installed as mnemonic memory. They no longer perform physical directives; one percent of them contributes passive research capacity."><span>MEMORY BANKS</span><strong>${formatCount(state.mnemonicBanks)}</strong></div>` : ""}
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
      <div class="dashboard-column">${operationsHtml(now)}${resourcesHtml(now)}${ablationHtml(now)}${projectsHtml()}</div>
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
  if (action === "legacy-export") {
    void exportRetiredSeedTombstone();
    return true;
  } else if (action === "legacy-restart") {
    clearGame();
    retiredSeed = null;
    state = null;
    introVisible = 0;
    renderIntro();
    const introTimer = setInterval(() => {
      introVisible += 1;
      renderIntro();
      if (introVisible >= INTRO_LOG.length) clearInterval(introTimer);
    }, 190);
    return true;
  } else if (action === "feedback") {
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
  } else if (action === "dispatch") {
    return acceptResult(dispatchAllocations(state));
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
  } else if (action === "ablation-start") {
    return acceptResult(startActiveAblation(state));
  } else if (action === "research") {
    return acceptResult(queueResearch(state, button.dataset.research));
  } else if (action === "research-cancel") {
    return acceptResult(cancelResearch(state, button.dataset.research));
  } else if (action === "research-pause") {
    return acceptResult(toggleResearchPause(state, button.dataset.research));
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

if (retiredSeed) {
  renderRetiredSeed();
} else if (!state) {
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
