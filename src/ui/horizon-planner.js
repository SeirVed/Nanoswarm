import { MASS_HORIZONS, SWARM_STAGES, DEFAULT_BRIDGE_REVIEW } from "../design/horizons.js";
import { RESEARCH } from "../game/content.js";
import { researchIsUnlocked } from "../game/unlocks.js";

const root = document.querySelector("#horizon-planner-root");
const STORAGE_KEY = "nanoswarm.horizon-planner.v1";
const clone = (value) => structuredClone(value);
const baseline = clone(MASS_HORIZONS);

const stageOptions = SWARM_STAGES.map((stage) =>
  `<option value="${stage.id}">STAGE ${stage.id} · ${stage.name.toUpperCase()}</option>`).join("");

root.innerHTML = `
  <div class="planner-shell">
    <header class="planner-header">
      <a class="planner-brand" href="../">
        <span class="planner-brand-mark">◈</span>
        <span><h1>NANOSWARM</h1><p>MASS-HORIZON ARCHITECTURE WORKBENCH</p></span>
      </a>
      <nav class="horizon-links" aria-label="Workbench navigation">
        <a class="planner-back" href="../research-planner/">RESEARCH TREE</a>
        <a class="planner-back" href="../">RETURN TO SIMULATION</a>
      </nav>
    </header>
    <main class="planner-main">
      <section class="planner-intro">
        <div>
          <h2>MASS-HORIZON PLANNER</h2>
          <p>Edit the seventeen ×10 material horizons from the 0.1 g contact to the 1 Gt Grey Goo threshold. Each horizon records the observation, discoveries, research, Residuum provenance, entropy pressure, and default human response without forcing the player onto a single strategy.</p>
        </div>
      </section>
      <div class="planner-toolbar" aria-label="Horizon controls">
        <button class="planner-button" type="button" data-action="move-earlier">MOVE EARLIER</button>
        <button class="planner-button" type="button" data-action="move-later">MOVE LATER</button>
        <button class="planner-button" type="button" data-action="add">ADD HORIZON</button>
        <button class="planner-button danger" type="button" data-action="delete">DELETE HORIZON</button>
        <button class="planner-button" type="button" data-action="reset">RESET DRAFT</button>
        <button class="planner-button primary" type="button" data-action="copy-changes">COPY CHANGES FOR PETE</button>
        <button class="planner-button" type="button" data-action="download">DOWNLOAD FULL PLAN</button>
      </div>
      <label class="planner-suggestions">
        <span>SUGGESTIONS</span>
        <textarea class="planner-textarea" data-suggestions rows="3" placeholder="Cross-horizon ideas, unresolved questions, or broad changes"></textarea>
      </label>
      <section class="bridge-review">
        <div>
          <h3>OPEN BRIDGE REVIEW</h3>
          <p>Relative Directive Allocation currently leads into a research-empty interval before the first 0.9 g material search. This is exposed here for discussion; no filler research has been added to the game.</p>
          <div class="bridge-metrics">
            <span class="planner-badge" data-gap-before></span>
            <span class="planner-badge" data-gap-after></span>
          </div>
        </div>
        <label class="planner-field">EDITABLE REVIEW NOTES<textarea class="planner-textarea" data-bridge-review></textarea></label>
      </section>
      <div class="stage-filters" aria-label="Filter horizons by stage">
        <button class="planner-button stage-filter active" data-action="filter-stage" data-stage="all">ALL STAGES</button>
        ${SWARM_STAGES.map((stage) => `<button class="planner-button stage-filter" data-action="filter-stage" data-stage="${stage.id}">${stage.id} · ${stage.name.toUpperCase()}</button>`).join("")}
      </div>
      <section class="stage-summary" data-stage-summary></section>
      <div class="planner-status" aria-live="polite">
        <span class="planner-badge" data-stat="horizons"></span>
        <span class="planner-badge" data-stat="stages"></span>
        <span class="planner-badge" data-stat="changes"></span>
        <span class="planner-message" data-stat="message"></span>
      </div>
      <div class="horizon-workspace">
        <section class="horizon-timeline-frame" aria-label="Mass-horizon timeline">
          <div class="horizon-timeline" data-timeline></div>
        </section>
        <aside>
          <form class="planner-editor horizon-editor" data-editor>
            <div class="planner-editor-heading">
              <strong data-selected-name></strong>
              <span class="planner-badge" data-selected-stage></span>
            </div>
            <div class="planner-form-grid">
              <label class="planner-field full">IDENTIFIER<input class="planner-input" name="id" readonly></label>
              <label class="planner-field">ADDED SHELL MASS<input class="planner-input" name="shellMass"></label>
              <label class="planner-field">CUMULATIVE REACH<input class="planner-input" name="totalMass"></label>
              <label class="planner-field full">STAGE<select class="planner-select" name="stage">${stageOptions}</select></label>
              <label class="planner-field full">DEFAULT ENVIRONMENT<input class="planner-input" name="environment"></label>
              <label class="planner-field full">REVEALING OBSERVATION<textarea class="planner-textarea" name="observation"></textarea></label>
              <label class="planner-field full">MATERIAL DISCOVERIES<textarea class="planner-textarea" name="discoveries"></textarea></label>
              <label class="planner-field full">RESEARCH AND CAPABILITIES<textarea class="planner-textarea" name="research"></textarea></label>
              <label class="planner-field full">RESIDUUM LOT<textarea class="planner-textarea short-textarea" name="residuumLot"></textarea></label>
              <label class="planner-field full">LOSSES AND ENTROPY<textarea class="planner-textarea" name="losses"></textarea></label>
              <label class="planner-field full">DEFAULT HUMAN RESPONSE<textarea class="planner-textarea" name="humanResponse"></textarea></label>
              <label class="planner-field full">NOTES<textarea class="planner-textarea" name="notes"></textarea></label>
            </div>
          </form>
        </aside>
      </div>
      <details class="planner-data horizon-data">
        <summary>FULL EDITABLE JSON</summary>
        <textarea class="planner-textarea" data-json aria-label="Mass-horizon plan JSON"></textarea>
        <div class="planner-actions">
          <button class="planner-button" type="button" data-action="refresh-json">REFRESH JSON</button>
          <button class="planner-button" type="button" data-action="copy-json">COPY FULL JSON</button>
          <button class="planner-button" type="button" data-action="import-json">IMPORT JSON ABOVE</button>
        </div>
      </details>
    </main>
  </div>`;

const timeline = root.querySelector("[data-timeline]");
const editor = root.querySelector("[data-editor]");
const jsonBox = root.querySelector("[data-json]");
let horizons = clone(MASS_HORIZONS);
let selectedId = horizons[0].id;
let stageFilter = "all";
let suggestions = "";
let bridgeReview = DEFAULT_BRIDGE_REVIEW;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const ordered = () => [...horizons].sort((left, right) => left.order - right.order);
const byId = (id) => horizons.find((item) => item.id === id);
const stageById = (id) => SWARM_STAGES.find((stage) => stage.id === Number(id));

function normalizeOrder() {
  ordered().forEach((item, index) => { item.order = index; });
}

function portablePlan() {
  return {
    version: 1,
    stages: SWARM_STAGES,
    bridgeReview,
    suggestions,
    horizons: ordered(),
  };
}

function validation() {
  const ids = horizons.map((item) => item.id);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const incomplete = horizons
    .filter((item) => !item.id || !item.shellMass || !item.totalMass || !item.environment || !item.observation)
    .map((item) => item.id || "unnamed");
  const invalidStages = horizons.filter((item) => !stageById(item.stage)).map((item) => item.id);
  return { duplicateIds, incomplete, invalidStages };
}

function changes() {
  const current = new Map(horizons.map((item) => [item.id, item]));
  const original = new Map(baseline.map((item) => [item.id, item]));
  const result = [];
  for (const item of horizons) {
    if (!original.has(item.id)) result.push({ id: item.id, change: "added", after: item });
    else if (JSON.stringify(item) !== JSON.stringify(original.get(item.id))) {
      result.push({ id: item.id, change: "edited", before: original.get(item.id), after: item });
    }
  }
  for (const item of baseline) {
    if (!current.has(item.id)) result.push({ id: item.id, change: "deleted", before: item });
  }
  return result;
}

function bridgeCounts() {
  const state = {
    nanites: 12n,
    stage: 1,
    completedResearch: ["parallel-directives", "relative-allocation"],
    prospecting: { searchesCompleted: 0 },
    discovery: {
      atmosphereVisible: false,
      residuumVisible: true,
      radioSignalDetected: false,
      externalMaterialRoutes: false,
    },
  };
  const available = () => Object.values(RESEARCH)
    .filter((definition) => !state.completedResearch.includes(definition.id))
    .filter((definition) => researchIsUnlocked(state, definition));
  const before = available();
  state.prospecting.searchesCompleted = 1;
  const after = available();
  return { before, after };
}

function saveDraft() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ horizons, selectedId, stageFilter, suggestions, bridgeReview })); }
  catch { /* The in-memory planner remains available. */ }
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!Array.isArray(saved?.horizons) || !saved.horizons.length) return;
    horizons = saved.horizons;
    selectedId = horizons.some((item) => item.id === saved.selectedId) ? saved.selectedId : horizons[0].id;
    stageFilter = saved.stageFilter ?? "all";
    suggestions = saved.suggestions ?? "";
    bridgeReview = saved.bridgeReview ?? DEFAULT_BRIDGE_REVIEW;
    normalizeOrder();
  } catch {
    // Corrupt or unavailable browser storage falls back to the authored plan.
  }
}

function renderTimeline() {
  let visible = ordered().filter((item) => stageFilter === "all" || String(item.stage) === stageFilter);
  if (!visible.length) visible = ordered();
  timeline.innerHTML = visible.map((item) => {
    const stage = stageById(item.stage);
    return `<button class="horizon-card${item.id === selectedId ? " selected" : ""}" type="button" data-action="select" data-id="${escapeHtml(item.id)}" data-stage="${item.stage}">
      <span><strong>+${escapeHtml(item.shellMass)}</strong><b>${escapeHtml(item.totalMass)} TOTAL</b></span>
      <span><b>${escapeHtml(item.environment)}</b><small>${escapeHtml(item.observation)}</small></span>
      <span><small class="horizon-stage">STAGE ${item.stage} · ${escapeHtml(stage?.name ?? "UNASSIGNED")}</small><small>${escapeHtml(item.discoveries)}</small></span>
    </button>`;
  }).join("");
}

function renderEditor() {
  const item = byId(selectedId) ?? ordered()[0];
  if (!item) return;
  selectedId = item.id;
  const stage = stageById(item.stage);
  root.querySelector("[data-selected-name]").textContent = `${item.totalMass} · ${item.environment}`;
  root.querySelector("[data-selected-stage]").textContent = `STAGE ${item.stage} · ${stage?.name ?? "UNASSIGNED"}`;
  for (const key of ["id", "shellMass", "totalMass", "stage", "environment", "observation", "discoveries", "research", "residuumLot", "losses", "humanResponse", "notes"]) {
    editor.elements[key].value = item[key] ?? "";
  }
}

function renderStageSummary() {
  const container = root.querySelector("[data-stage-summary]");
  if (stageFilter === "all") {
    container.innerHTML = `<h3>SEVEN-STAGE SPINE</h3><p>Solitary Seed → Electronic Bloom → Environmental Breach → Structural Consumption → Observed Anomaly → Existential Conflict → Grey Goo. Mass opens the horizon; player behaviour determines how quickly danger and human response advance within it.</p>`;
    return;
  }
  const stage = stageById(stageFilter);
  container.innerHTML = `<h3>STAGE ${stage.id} · ${escapeHtml(stage.name.toUpperCase())} · ${escapeHtml(stage.range)}</h3><p>${escapeHtml(stage.principle)}</p>`;
}

function renderStatus() {
  const check = validation();
  const draftItems = changes().length + Number(Boolean(suggestions.trim())) + Number(bridgeReview !== DEFAULT_BRIDGE_REVIEW);
  root.querySelector("[data-stat='horizons']").textContent = `${horizons.length} HORIZONS`;
  root.querySelector("[data-stat='stages']").textContent = `${new Set(horizons.map((item) => item.stage)).size} STAGES USED`;
  root.querySelector("[data-stat='changes']").textContent = `${draftItems} DRAFT ITEMS`;
  if (check.duplicateIds.length) showMessage(`${check.duplicateIds.length} DUPLICATE IDENTIFIERS`, "error");
  else if (check.incomplete.length) showMessage(`${check.incomplete.length} INCOMPLETE HORIZONS`, "error");
  else if (check.invalidStages.length) showMessage(`${check.invalidStages.length} INVALID STAGES`, "error");
}

function renderJson() {
  jsonBox.value = JSON.stringify(portablePlan(), null, 2);
}

function render() {
  renderTimeline();
  renderEditor();
  renderStageSummary();
  renderStatus();
  renderJson();
  root.querySelectorAll("[data-action='filter-stage']").forEach((button) =>
    button.classList.toggle("active", button.dataset.stage === stageFilter));
}

function showMessage(text, tone = "") {
  const message = root.querySelector("[data-stat='message']");
  message.textContent = text;
  message.className = `planner-message ${tone}`;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    jsonBox.value = value;
    jsonBox.focus();
    jsonBox.select();
    document.execCommand("copy");
  }
}

function moveSelected(delta) {
  const items = ordered();
  const index = items.findIndex((item) => item.id === selectedId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return;
  [items[index].order, items[target].order] = [items[target].order, items[index].order];
  normalizeOrder();
  saveDraft();
  render();
}

function addHorizon() {
  const current = byId(selectedId) ?? ordered().at(-1);
  const baseId = "new-horizon";
  let suffix = 1;
  while (byId(`${baseId}-${suffix}`)) suffix += 1;
  const item = {
    id: `${baseId}-${suffix}`,
    order: (current?.order ?? horizons.length - 1) + 0.5,
    stage: current?.stage ?? 2,
    shellMass: "",
    totalMass: "",
    environment: "New material horizon",
    observation: "Describe the observation that changes the swarm's model.",
    discoveries: "",
    research: "",
    residuumLot: "Dedicated source lot.",
    losses: "",
    humanResponse: "",
    notes: "",
  };
  horizons.push(item);
  normalizeOrder();
  selectedId = item.id;
  stageFilter = "all";
  saveDraft();
  render();
}

function deleteSelected() {
  const item = byId(selectedId);
  if (!item || !window.confirm(`Delete ${item.totalMass || item.id} from this draft?`)) return;
  const index = ordered().findIndex((candidate) => candidate.id === item.id);
  horizons = horizons.filter((candidate) => candidate.id !== item.id);
  normalizeOrder();
  selectedId = ordered()[Math.min(index, horizons.length - 1)]?.id ?? "";
  saveDraft();
  render();
}

function importJson() {
  try {
    const parsed = JSON.parse(jsonBox.value);
    if (!Array.isArray(parsed.horizons) || !parsed.horizons.length) throw new Error("No horizons array found");
    horizons = parsed.horizons;
    suggestions = typeof parsed.suggestions === "string" ? parsed.suggestions : suggestions;
    bridgeReview = typeof parsed.bridgeReview === "string" ? parsed.bridgeReview : bridgeReview;
    normalizeOrder();
    selectedId = horizons[0].id;
    stageFilter = "all";
    root.querySelector("[data-suggestions]").value = suggestions;
    root.querySelector("[data-bridge-review]").value = bridgeReview;
    saveDraft();
    render();
    showMessage("HORIZON PLAN IMPORTED", "success");
  } catch (error) {
    showMessage(`IMPORT FAILED · ${error.message.toUpperCase()}`, "error");
  }
}

editor.addEventListener("input", (event) => {
  const item = byId(selectedId);
  if (!item || !event.target.name) return;
  item[event.target.name] = event.target.name === "stage" ? Number(event.target.value) : event.target.value;
  saveDraft();
  renderTimeline();
  renderStatus();
  renderJson();
  root.querySelector("[data-selected-name]").textContent = `${item.totalMass} · ${item.environment}`;
  const stage = stageById(item.stage);
  root.querySelector("[data-selected-stage]").textContent = `STAGE ${item.stage} · ${stage?.name ?? "UNASSIGNED"}`;
});

root.querySelector("[data-suggestions]").addEventListener("input", (event) => {
  suggestions = event.target.value;
  saveDraft();
  renderStatus();
  renderJson();
});

root.querySelector("[data-bridge-review]").addEventListener("input", (event) => {
  bridgeReview = event.target.value;
  saveDraft();
  renderStatus();
  renderJson();
});

root.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "select") {
    selectedId = button.dataset.id;
    renderTimeline();
    renderEditor();
  } else if (action === "filter-stage") {
    stageFilter = button.dataset.stage;
    const firstVisible = ordered().find((item) => stageFilter === "all" || String(item.stage) === stageFilter);
    if (firstVisible) selectedId = firstVisible.id;
    saveDraft();
    render();
  } else if (action === "move-earlier") moveSelected(-1);
  else if (action === "move-later") moveSelected(1);
  else if (action === "add") addHorizon();
  else if (action === "delete") deleteSelected();
  else if (action === "reset" && window.confirm("Discard the local horizon draft and restore the authored pathway?")) {
    horizons = clone(MASS_HORIZONS);
    selectedId = horizons[0].id;
    stageFilter = "all";
    suggestions = "";
    bridgeReview = DEFAULT_BRIDGE_REVIEW;
    localStorage.removeItem(STORAGE_KEY);
    root.querySelector("[data-suggestions]").value = "";
    root.querySelector("[data-bridge-review]").value = bridgeReview;
    render();
  } else if (action === "copy-changes") {
    const payload = {
      instruction: "Review these NanoSwarm mass-horizon changes with me. Do not implement until I explicitly approve them.",
      suggestions,
      bridgeReview: bridgeReview === DEFAULT_BRIDGE_REVIEW ? "" : bridgeReview,
      validation: validation(),
      changes: changes(),
    };
    if (!payload.changes.length && !suggestions.trim() && !payload.bridgeReview) {
      showMessage("NO DRAFT CHANGES TO COPY", "error");
      return;
    }
    await copyText(JSON.stringify(payload, null, 2));
    showMessage("HORIZON CHANGES COPIED · PASTE THEM INTO OUR CHAT", "success");
  } else if (action === "download") {
    const url = URL.createObjectURL(new Blob([JSON.stringify(portablePlan(), null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nanoswarm-mass-horizons.json";
    link.click();
    URL.revokeObjectURL(url);
  } else if (action === "refresh-json") renderJson();
  else if (action === "copy-json") {
    await copyText(jsonBox.value);
    showMessage("FULL HORIZON PLAN COPIED", "success");
  } else if (action === "import-json") importJson();
});

restoreDraft();
const gap = bridgeCounts();
root.querySelector("[data-gap-before]").textContent = `${gap.before.length} SIGNALS BEFORE SEARCH 1`;
root.querySelector("[data-gap-after]").textContent = `${gap.after.length} SIGNALS AFTER SEARCH 1`;
root.querySelector("[data-suggestions]").value = suggestions;
root.querySelector("[data-bridge-review]").value = bridgeReview;
render();
