import { NANITE_ELEMENTS, cloneNanitePlan, validateNanitePlan } from "../design/nanite.js";
import { generateNaniteModel } from "../design/nanite-model.js";
import { analyseNaniteTopology } from "../design/nanite-topology.js";
import { createNaniteViewport } from "./nanite-viewport.js";

const root = document.querySelector("#nanite-planner-root");
const STORAGE_KEY = "nanoswarm.nanite-planner.v1";
const baseline = cloneNanitePlan();
let plan = cloneNanitePlan();
let selectedId = plan.modules[0].id;
let focusedIds = new Set();
let message = "";
let viewport;

const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const byId = (id) => plan.modules.find((module) => module.id === id);
const atomCount = (atoms) => Object.values(atoms).reduce((total, value) => total + Number(value), 0);
const formatAtoms = (value) => Number(value).toLocaleString("en-US");
const formatMass = (value) => `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 5 })} Da`;

root.innerHTML = `
  <div class="planner-shell nanite-shell">
    <header class="planner-header">
      <a class="planner-brand" href="../"><span class="planner-brand-mark">◈</span><span><h1>NANOSWARM</h1><p>N0 NANITE DESIGN WORKBENCH</p></span></a>
      <nav class="planner-header-nav" aria-label="Workbench navigation"><a class="planner-back" href="../research-planner/">RESEARCH TREE</a><a class="planner-back" href="../horizon-planner/">MASS HORIZONS</a><a class="planner-back" href="../">RETURN TO SIMULATION</a></nav>
    </header>
    <main class="planner-main">
      <section class="planner-intro nanite-intro"><div><h2>N0 SEED WORKER</h2><p>This is a design draft, not a molecular simulation. Its exact atom budget and declared modules can be edited here, but it never changes the live nanite recipe, game save, or replication balance.</p></div><span class="planner-badge" data-canonical-status></span></section>
      <section class="nanite-honesty"><strong>SCIENTIFIC HONESTY</strong><span>Exact counts and a coherent schematic are not proof of bonding, stability, computation, energy transfer, sensing, or autonomous fabrication at this scale.</span></section>
      <div class="planner-toolbar"><button class="planner-button" type="button" data-action="reset">RESET DRAFT</button><button class="planner-button primary" type="button" data-action="copy-changes">COPY CHANGES FOR PETE</button><button class="planner-button" type="button" data-action="download">DOWNLOAD FULL PLAN</button></div>
      <label class="planner-suggestions"><span>SUGGESTIONS</span><textarea class="planner-textarea" data-suggestions rows="3" placeholder="Questions, physical concerns, design ideas, or revisions for review"></textarea></label>
      <div class="planner-status" aria-live="polite"><span class="planner-badge" data-stat="atoms"></span><span class="planner-badge" data-stat="mass"></span><span class="planner-badge" data-stat="changes"></span><span class="planner-message" data-stat="message"></span></div>
      <div class="nanite-workspace"><aside class="nanite-budget" data-budget></aside><section class="nanite-schematic" aria-label="Temporary module-level N0 schematic" data-schematic></section><aside class="planner-editor nanite-editor" data-editor></aside></div>
      <section class="nanite-warnings" data-warnings></section>
      <details class="planner-data nanite-data"><summary>FULL EDITABLE JSON</summary><textarea class="planner-textarea" data-json aria-label="Nanite plan JSON"></textarea><div class="planner-actions"><button class="planner-button" type="button" data-action="refresh-json">REFRESH JSON</button><button class="planner-button" type="button" data-action="copy-json">COPY FULL JSON</button><button class="planner-button" type="button" data-action="import-json">IMPORT JSON ABOVE</button></div></details>
    </main>
  </div>`;

const budget = root.querySelector("[data-budget]");
const schematic = root.querySelector("[data-schematic]");
const editor = root.querySelector("[data-editor]");
const warnings = root.querySelector("[data-warnings]");
const jsonBox = root.querySelector("[data-json]");

function saveDraft() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan, selectedId })); } catch { /* In-memory draft remains usable. */ } }
function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved?.plan || !Array.isArray(saved.plan.modules)) return;
    plan = saved.plan;
    selectedId = plan.modules.some((module) => module.id === saved.selectedId) ? saved.selectedId : plan.modules[0]?.id;
  } catch { /* Corrupt local data falls back to the authored N0 draft. */ }
}

function changes() {
  const result = [];
  const prior = new Map(baseline.modules.map((module) => [module.id, module]));
  for (const module of plan.modules) {
    const before = prior.get(module.id);
    if (!before) result.push({ id: module.id, change: "added", after: module });
    else if (JSON.stringify(before) !== JSON.stringify(module)) result.push({ id: module.id, change: "edited", before, after: module });
    prior.delete(module.id);
  }
  for (const before of prior.values()) result.push({ id: before.id, change: "deleted", before });
  return result;
}

function portablePlan() { return { version: 1, plan, validation: validateNanitePlan(plan) }; }

function renderBudget(check) {
  budget.innerHTML = `<header><strong>EXACT MATERIAL BUDGET</strong><span>${check.exactRecipe ? "RECIPE EXACT" : "RECIPE DELTA"}</span></header><div class="nanite-element-list">${NANITE_ELEMENTS.map((element) => {
    const used = check.totals[element.id]; const target = Number(plan.recipe?.[element.id] ?? 0); const delta = check.deltas[element.id];
    return `<div class="nanite-element" style="--element-color:${element.color}"><b>${element.symbol}</b><span>${element.name}</span><strong>${formatAtoms(used)}</strong><small>OF ${formatAtoms(target)} · ${delta === 0 ? "EXACT" : `${delta > 0 ? "+" : ""}${formatAtoms(delta)} DELTA`}</small></div>`;
  }).join("")}</div><div class="nanite-metrics"><div><span>DERIVED MASS</span><strong>${formatMass(check.massDa)}</strong><small>${(check.massDa * 1.6605390666e-27).toExponential(8)} kg</small></div><div><span>PROCESS ENERGY</span><strong>${plan.energyPj} pJ</strong><small>EXTERNAL BUILD BUDGET</small></div><div><span>ASSEMBLY WORK</span><strong>${plan.assemblyNaniteMs / 1000} s</strong><small>BASE COHORT DURATION</small></div><div><span>BODY ENVELOPE</span><strong>${plan.envelopeNm.body.join(" × ")} nm</strong><small>${plan.envelopeNm.span} nm APPENDAGE SPAN</small></div></div>`;
}

function renderSchematic() {
  const model = generateNaniteModel(plan);
  const topology = analyseNaniteTopology(model);
  const dimensions = model.bounds.size.map((value) => value.toFixed(2)).join(" × ");
  schematic.innerHTML = `<header><strong>DETERMINISTIC LATTICE SCAFFOLD</strong><span>${model.count.toLocaleString("en-US")} ATOMS · ${dimensions} nm</span></header><p>Module-specific lattice candidates, exact element placement, and valence-limited authored bonds generated from seed ${plan.seed}. Drag to rotate; Shift/Alt drag or middle drag to pan; wheel to zoom. This is a design model, not a validated molecular structure.</p><div class="nanite-viewport"><canvas data-atom-canvas aria-label="Rotatable N0 atom model"></canvas><div class="nanite-viewport-overlay">${dimensions} nm BOUNDS · ${((validateNanitePlan(plan).massDa * 1.6605390666e-22) / Math.max(1, model.bounds.size.reduce((total, value) => total * value, 1))).toFixed(2)} g/cm³ BOUNDING DENSITY</div></div><div class="nanite-view-controls"><button class="planner-button" data-action="view-reset">RESET VIEW</button><button class="planner-button" data-action="view-projection">PERSPECTIVE</button><button class="planner-button" data-action="view-bonds">AUTHORED BONDS · ${topology.bondCount.toLocaleString("en-US")}</button><button class="planner-button" data-action="view-surface">SMOOTH CARAPACE</button>${NANITE_ELEMENTS.map((element, index) => `<button class="planner-button active" data-action="view-element" data-element="${index}" style="--element-color:${element.color}">${element.symbol}</button>`).join("")}</div><div class="nanite-legend">${plan.modules.map((module) => `<button type="button" data-action="select" data-id="${escapeHtml(module.id)}" class="${module.id === selectedId ? "selected" : ""}"><span></span>${escapeHtml(module.name)}</button>`).join("")}</div>`;
  viewport = createNaniteViewport(schematic.querySelector("[data-atom-canvas]"), model, topology, { focusedModules: plan.modules.map((module, index) => focusedIds.has(module.id) ? index : -1).filter((index) => index >= 0), onSelect(index) { selectedId = plan.modules[model.module[index]].id; focusedIds.add(selectedId); message = "ATOM " + (index + 1); renderEditor(); renderStatus(validateNanitePlan(plan)); viewport.focusModules(plan.modules.map((module, moduleIndex) => focusedIds.has(module.id) ? moduleIndex : -1).filter((moduleIndex) => moduleIndex >= 0)); } });
  viewport.draw();
  const passivationButton = document.createElement("button"); passivationButton.className = "planner-button"; passivationButton.dataset.action = "view-passivation"; passivationButton.textContent = "H PASSIVATION - " + model.passivation.count.toLocaleString("en-US"); schematic.querySelector(".nanite-view-controls").append(passivationButton); schematic.querySelector(".nanite-viewport-overlay").textContent += " - " + model.physicalAtomCount.toLocaleString("en-US") + " PHYSICAL ATOMS - " + model.physicalMassDa.toFixed(2) + " Da";
  for (const button of schematic.querySelectorAll("[data-action='select']")) button.classList.toggle("selected", focusedIds.has(button.dataset.id));
}

function renderEditor() {
  const module = byId(selectedId) ?? plan.modules[0];
  if (!module) return;
  selectedId = module.id;
  editor.innerHTML = `<div class="planner-editor-heading"><strong>MODULE EDITOR</strong><span class="planner-badge">${escapeHtml(module.function.toUpperCase())}</span></div><div class="planner-form-grid"><label class="planner-field full">MODULE NAME<input class="planner-input" data-field="name" value="${escapeHtml(module.name)}"></label><label class="planner-field full">FUNCTION<input class="planner-input" data-field="function" value="${escapeHtml(module.function)}"></label><label class="planner-field full">DECLARED ROLE<textarea class="planner-textarea short-textarea" data-field="description">${escapeHtml(module.description)}</textarea></label>${NANITE_ELEMENTS.map((element) => `<label class="planner-field">${element.symbol} · ${element.name.toUpperCase()}<input class="planner-input" type="number" min="0" max="9999" step="1" data-atom="${element.id}" value="${module.atoms[element.id]}"></label>`).join("")}</div><p class="nanite-editor-note">Counts must remain whole non-negative atoms. An experimental allocation may be saved and exported, but it is never sent to the simulation.</p>`;
  const seedField = document.createElement("label"); seedField.className = "planner-field full"; seedField.innerHTML = "DESIGN SEED<input class=\"planner-input\" type=\"number\" min=\"0\" max=\"4294967295\" step=\"1\" data-plan-field=\"seed\" value=\"" + (Number(plan.seed) || 0) + "\">"; editor.querySelector(".planner-form-grid").prepend(seedField);
}

function renderWarnings(check) {
  const invalid = check.invalid.length ? check.invalid : (check.exactRecipe ? [] : ["Module totals no longer match the selected recipe."]);
  warnings.innerHTML = `<div class="nanite-warning ${invalid.length ? "invalid" : "valid"}"><strong>${invalid.length ? "INVALID" : "VALID"}</strong><span>${invalid.length ? escapeHtml(invalid.join(" · ")) : "Whole module counts exactly match the N0 recipe."}</span></div><div class="nanite-warning"><strong>UNVERIFIED</strong><span>No mixed C–Si–Cu–Au force field, quantum stability calculation, logical mechanism, energy-transfer model, or atom-recognition mechanism is represented here.</span></div><div class="nanite-warning"><strong>SPECULATIVE</strong><span>The canonical recipe lacks conventional passivation elements. This module schematic is a design hypothesis, not a chemically demonstrated nanomachine.</span></div>`;
}

function renderStatus(check) {
  root.querySelector("[data-canonical-status]").textContent = plan.canonical && check.exactRecipe ? "CANONICAL DRAFT · EXACT" : "EXPERIMENTAL DRAFT";
  root.querySelector("[data-stat='atoms']").textContent = `${formatAtoms(atomCount(check.totals))} DECLARED ATOMS`;
  root.querySelector("[data-stat='mass']").textContent = formatMass(check.massDa);
  root.querySelector("[data-stat='changes']").textContent = `${changes().length + Number(Boolean(plan.suggestions?.trim()))} DRAFT ITEMS`;
  const target = root.querySelector("[data-stat='message']"); target.textContent = message; target.className = `planner-message ${message ? "success" : ""}`;
}

function renderJson() { jsonBox.value = JSON.stringify(portablePlan(), null, 2); }
function render() { const check = validateNanitePlan(plan); renderBudget(check); renderSchematic(); renderEditor(); renderWarnings(check); renderStatus(check); renderJson(); root.querySelector("[data-suggestions]").value = plan.suggestions ?? ""; }
async function copyText(value) { try { await navigator.clipboard.writeText(value); } catch { jsonBox.value = value; jsonBox.focus(); jsonBox.select(); document.execCommand("copy"); } }

function importPlan() {
  try {
    const parsed = JSON.parse(jsonBox.value);
    if (!parsed?.plan || !Array.isArray(parsed.plan.modules)) throw new Error("Expected a Stage A plan with modules.");
    plan = parsed.plan; plan.recipe = structuredClone(baseline.recipe); plan.canonical = true; selectedId = plan.modules.some((module) => module.id === selectedId) ? selectedId : plan.modules[0]?.id; saveDraft(); message = "PLAN IMPORTED · CANONICAL RECIPE RETAINED"; render();
  } catch (error) { message = `IMPORT REJECTED · ${error.message}`; renderStatus(validateNanitePlan(plan)); }
}

root.addEventListener("input", (event) => {
  const module = byId(selectedId);
  if (event.target.matches("[data-suggestions]")) plan.suggestions = event.target.value;
  else if (event.target.matches("[data-plan-field='seed']")) return;
  else if (module && event.target.matches("[data-field]")) module[event.target.dataset.field] = event.target.value;
  else if (module && event.target.matches("[data-atom]")) {
    module.atoms[event.target.dataset.atom] = Math.max(0, Math.min(9999, Number(event.target.value) || 0));
    event.target.value = module.atoms[event.target.dataset.atom];
    saveDraft(); message = "DRAFT SAVED LOCALLY"; render(); return;
  } else return;
  saveDraft(); message = "DRAFT SAVED LOCALLY"; renderStatus(validateNanitePlan(plan));
});

root.addEventListener("change", (event) => {
  if (!event.target.matches("[data-plan-field='seed']")) return;
  plan.seed = Math.max(0, Math.min(4294967295, Math.floor(Number(event.target.value) || 0)));
  saveDraft(); message = "SEED UPDATED - LATTICE REGENERATED"; render();
});

root.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]"); if (!button) return;
  const action = button.dataset.action;
  if (action === "view-reset") { viewport?.reset(); return; }
  if (action === "view-projection") { button.textContent = viewport?.toggleProjection() ? "PERSPECTIVE" : "ORTHOGRAPHIC"; return; }
  if (action === "view-bonds") { button.classList.toggle("active", viewport?.toggleBonds()); return; }
  if (action === "view-passivation") { button.classList.toggle("active", viewport?.togglePassivation()); return; }
  if (action === "view-surface") { const smooth = viewport?.toggleRenderMode(); button.classList.toggle("active", smooth); button.textContent = smooth ? "ATOMISTIC VIEW" : "SMOOTH CARAPACE"; return; }
  if (action === "view-element") { viewport?.toggleElement(Number(button.dataset.element)); button.classList.toggle("active"); return; }
  if (action === "select") { selectedId = button.dataset.id; focusedIds.has(selectedId) ? focusedIds.delete(selectedId) : focusedIds.add(selectedId); viewport?.focusModules(plan.modules.map((module, index) => focusedIds.has(module.id) ? index : -1).filter((index) => index >= 0)); for (const item of schematic.querySelectorAll("[data-action='select']")) item.classList.toggle("selected", focusedIds.has(item.dataset.id)); renderEditor(); return; }
  if (action === "reset") { localStorage.removeItem(STORAGE_KEY); plan = cloneNanitePlan(); selectedId = plan.modules[0].id; focusedIds.clear(); message = "CANONICAL DRAFT RESTORED"; render(); return; }
  if (action === "copy-changes") {
    const check = validateNanitePlan(plan);
    const payload = { instruction: "Design review only. Do not implement these changes until explicitly requested.", suggestions: plan.suggestions ?? "", canonicalRecipe: baseline.recipe, atomDeltas: check.deltas, changedModules: changes(), envelopeNm: plan.envelopeNm, designSeed: plan.seed, validation: { exactRecipe: check.exactRecipe, invalid: check.invalid, scientificWarnings: ["No validated mixed force field", "No quantum stability calculation", "Missing surface-passivation elements"] } };
    await copyText(JSON.stringify(payload, null, 2)); message = "CHANGE PAYLOAD COPIED"; renderStatus(check); return;
  }
  if (action === "copy-json") { await copyText(jsonBox.value); message = "FULL PLAN COPIED"; renderStatus(validateNanitePlan(plan)); return; }
  if (action === "download") { const url = URL.createObjectURL(new Blob([JSON.stringify(portablePlan(), null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "nanoswarm-n0-seed-worker.json"; link.click(); URL.revokeObjectURL(url); message = "FULL PLAN DOWNLOADED"; renderStatus(validateNanitePlan(plan)); return; }
  if (action === "refresh-json") { renderJson(); message = "JSON REFRESHED"; renderStatus(validateNanitePlan(plan)); return; }
  if (action === "import-json") importPlan();
});

restoreDraft();
render();
