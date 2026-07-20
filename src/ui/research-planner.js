import { RESEARCH } from "../game/content.js";

const root = document.querySelector("#research-planner-root");
const STORAGE_KEY = "nanoswarm.research-planner.v2";
const LEGACY_STORAGE_KEY = "nanoswarm.research-planner.v1";
const NODE_WIDTH = 174;
const NODE_HEIGHT = 62;
const VIEW_WIDTH = 1_000;
const VIEW_HEIGHT = 700;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const SVG_NS = "http://www.w3.org/2000/svg";

const clone = (value) => structuredClone(value);
const portable = (value) => JSON.parse(JSON.stringify(value, (_key, item) =>
  typeof item === "bigint" ? item.toString() : item));

function inferCategory(definition) {
  const id = definition.id;
  if (id.includes("specialized-morphologies")) return "morphology";
  if (id.includes("distributed-reasoning-mesh")) return "compute";
  if (id.includes("atmospheric")) return "atmosphere";
  if (id.includes("autonomous")) return "autonomy";
  if (id.includes("spectral") || id.includes("residuum")) return "analysis";
  if (id.includes("sorting")) return "sorting";
  if (id.includes("payload") || id.includes("route-memory") || id.includes("material-caches")) return "collection";
  if (id.includes("capacitive") || id.includes("rf-scavenging")) return "energy";
  return "coordination";
}

function sourceNodes() {
  return Object.values(RESEARCH).map((definition) => {
    const item = portable(definition);
    return {
      ...item,
      unlockNanites: item.unlockNanites ?? "",
      requiresDiscovery: item.requiresDiscovery ?? "",
      requiresStage: item.requiresStage ?? "",
      requiresSearch: item.requiresSearch ?? "",
      trigger: item.trigger ?? "",
      series: item.series ?? "",
      tier: item.tier ?? 0,
      category: inferCategory(item),
      x: 0,
      y: 0,
    };
  });
}

root.innerHTML = `
  <div class="planner-shell">
    <header class="planner-header">
      <a class="planner-brand" href="../">
        <span class="planner-brand-mark">◈</span>
        <span><h1>NANOSWARM</h1><p>RESEARCH ARCHITECTURE WORKBENCH</p></span>
      </a>
      <nav class="planner-header-nav" aria-label="Workbench navigation">
        <a class="planner-back" href="../horizon-planner/">MASS HORIZONS</a>
        <a class="planner-back" href="../">RETURN TO SIMULATION</a>
      </nav>
    </header>
    <main class="planner-main">
      <section class="planner-intro">
        <div>
          <h2>RESEARCH TREE PLANNER</h2>
          <p>Drag empty space to pan, use the wheel or controls to zoom, and drag nodes to arrange them. Select a node to edit its work, costs, effects, gates, and dependencies. This is a private browser draft until its JSON is copied or downloaded.</p>
        </div>
      </section>
      <div class="planner-toolbar" aria-label="Planner controls">
        <button class="planner-button" type="button" data-action="layout">AUTO-LAYOUT</button>
        <button class="planner-button" type="button" data-action="zoom-out" aria-label="Zoom out">−</button>
        <button class="planner-button" type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
        <button class="planner-button" type="button" data-action="fit">FIT TREE</button>
        <span class="planner-badge" data-stat="zoom">100% ZOOM</span>
        <button class="planner-button" type="button" data-action="connect" aria-pressed="false">CONNECT DEPENDENCY</button>
        <button class="planner-button" type="button" data-action="add">ADD RESEARCH</button>
        <label class="planner-switch"><input type="checkbox" data-action="expand"> SHOW EVERY REFINEMENT</label>
        <button class="planner-button" type="button" data-action="reset">RESET DRAFT</button>
        <button class="planner-button primary" type="button" data-action="copy-changes">COPY CHANGES FOR PETE</button>
        <button class="planner-button" type="button" data-action="download">DOWNLOAD FULL PLAN</button>
      </div>
      <label class="planner-suggestions">
        <span>SUGGESTIONS</span>
        <textarea class="planner-textarea" data-suggestions rows="3" placeholder="SUGGESTIONS"></textarea>
      </label>
      <div class="planner-status" aria-live="polite">
        <span class="planner-badge" data-stat="nodes"></span>
        <span class="planner-badge" data-stat="links"></span>
        <span class="planner-badge" data-stat="changes"></span>
        <span class="planner-message" data-stat="message"></span>
      </div>
      <div class="planner-workspace">
        <section class="planner-graph-frame" aria-label="Research dependency graph">
          <svg class="planner-graph" role="img" aria-labelledby="planner-graph-title planner-graph-description"></svg>
        </section>
        <aside>
          <div class="planner-empty planner-editor" data-editor-empty>Select a research node to inspect or edit it.</div>
          <form class="planner-editor" data-editor hidden>
            <div class="planner-editor-heading">
              <strong data-selected-name></strong>
              <span class="planner-badge" data-selected-category></span>
            </div>
            <div class="planner-form-grid">
              <label class="planner-field full">NAME<input class="planner-input" name="name" autocomplete="off"></label>
              <label class="planner-field full">IDENTIFIER<input class="planner-input" name="id" readonly></label>
              <label class="planner-field full">DESCRIPTION<textarea class="planner-textarea" name="description" rows="3"></textarea></label>
              <label class="planner-field full">REVEALING OBSERVATION<textarea class="planner-textarea" name="trigger" rows="2"></textarea></label>
              <label class="planner-field full">PLAYER-FACING EFFECT<textarea class="planner-textarea" name="effect" rows="2"></textarea></label>
              <label class="planner-field">WORK · NANITE-MS<input class="planner-input" name="requiredNaniteMs" inputmode="numeric"></label>
              <label class="planner-field">NANITES TO REVEAL<input class="planner-input" name="unlockNanites" inputmode="numeric" placeholder="none"></label>
              <label class="planner-field">MINIMUM STAGE<input class="planner-input" name="requiresStage" inputmode="numeric" placeholder="none"></label>
              <label class="planner-field">MATERIAL SEARCH<input class="planner-input" name="requiresSearch" inputmode="numeric" placeholder="none"></label>
              <label class="planner-field">DISCOVERY GATE<select class="planner-select" name="requiresDiscovery"><option value="">None</option><option value="atmosphereVisible">Atmosphere visible</option><option value="residuumVisible">Residuum visible</option><option value="radioSignalDetected">Radio signal detected</option><option value="externalMaterialRoutes">External material routes</option></select></label>
              <label class="planner-field">CATEGORY<select class="planner-select" name="category"><option value="coordination">Coordination</option><option value="analysis">Analysis</option><option value="energy">Energy</option><option value="collection">Collection</option><option value="sorting">Sorting</option><option value="atmosphere">Atmosphere</option><option value="compute">Compute</option><option value="autonomy">Autonomy</option><option value="morphology">Morphology</option></select></label>
            </div>
            <section class="planner-section">
              <strong>RESOURCE COST</strong>
              <div class="planner-cost-grid">
                <label class="planner-field">ENERGY<input class="planner-input" name="energy" inputmode="numeric"></label>
                <label class="planner-field">CARBON<input class="planner-input" name="carbon" inputmode="numeric"></label>
                <label class="planner-field">SILICON<input class="planner-input" name="silicon" inputmode="numeric"></label>
                <label class="planner-field">COPPER<input class="planner-input" name="copper" inputmode="numeric"></label>
                <label class="planner-field">GOLD<input class="planner-input" name="gold" inputmode="numeric"></label>
              </div>
            </section>
            <section class="planner-section">
              <strong>SIMULATION BONUSES · JSON</strong>
              <label class="planner-field"><textarea class="planner-textarea" name="bonuses" rows="3"></textarea></label>
            </section>
            <section class="planner-section">
              <strong>PREREQUISITES</strong>
              <div class="dependency-list" data-dependencies></div>
              <div class="dependency-adder">
                <label class="planner-field">ADD PREREQUISITE<select class="planner-select" name="newDependency"></select></label>
                <button class="planner-button" type="button" data-action="add-dependency">ADD</button>
              </div>
            </section>
            <div class="planner-derived" data-derived></div>
            <div class="planner-actions">
              <button class="planner-button" type="button" data-action="duplicate">DUPLICATE</button>
              <button class="planner-button danger" type="button" data-action="delete">DELETE FROM DRAFT</button>
            </div>
          </form>
        </aside>
      </div>
      <details class="planner-data">
        <summary>FULL EDITABLE JSON</summary>
        <textarea class="planner-textarea" data-json aria-label="Research plan JSON"></textarea>
        <div class="planner-actions">
          <button class="planner-button" type="button" data-action="refresh-json">REFRESH JSON</button>
          <button class="planner-button" type="button" data-action="copy-json">COPY FULL JSON</button>
          <button class="planner-button" type="button" data-action="import-json">IMPORT JSON ABOVE</button>
        </div>
      </details>
    </main>
  </div>`;

const svg = root.querySelector(".planner-graph");
const editor = root.querySelector("[data-editor]");
const emptyEditor = root.querySelector("[data-editor-empty]");
const jsonBox = root.querySelector("[data-json]");
let nodes = sourceNodes();
let expanded = false;
let selectedId = "parallel-directives";
let connectFrom = "";
let dragging = null;
let panning = null;
let suggestions = "";
let camera = { x: 0, y: 0, zoom: 1 };

const byId = (id) => nodes.find((item) => item.id === id);
const visibleNodes = () => expanded ? nodes : nodes.filter((item) => !item.series || item.tier === 1);
const proxyId = (id) => {
  const item = byId(id);
  return !expanded && item?.series ? item.series : id;
};
const seriesCount = (series) => nodes.filter((item) => item.series === series).length;

function semantic(item) {
  const output = clone(item);
  delete output.x;
  delete output.y;
  return output;
}

function formatCount(value) {
  try {
    const number = BigInt(value || "0");
    if (number < 100_000_000n) return number.toLocaleString("en-US");
    const raw = number.toString();
    return `${raw[0]}.${raw.slice(1, 4).replace(/0+$/u, "")}e${raw.length - 1}`.replace(".e", "e");
  } catch {
    return String(value || "0");
  }
}

function durationLabel(item) {
  let seconds;
  try { seconds = Number(BigInt(item.requiredNaniteMs || "0") / 100_000n); }
  catch { return "invalid work"; }
  if (seconds < 60) return `${seconds}s @ 100 n-eq`;
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m @ 100 n-eq`;
  if (seconds < 86_400) return `${Math.round(seconds / 3_600)}h @ 100 n-eq`;
  if (seconds < 31_536_000) return `${Math.round(seconds / 86_400)}d @ 100 n-eq`;
  return `${Math.round(seconds / 31_536_000)}y @ 100 n-eq`;
}

function layout(items = visibleNodes()) {
  const ids = new Set(items.map((item) => item.id));
  const ranks = new Map();
  function rankOf(rawId, trail = new Set()) {
    const id = proxyId(rawId);
    if (ranks.has(id)) return ranks.get(id);
    if (trail.has(id)) return 0;
    const item = byId(id);
    if (!item) return 0;
    trail.add(id);
    const requirements = [...new Set(item.requires.map(proxyId))]
      .filter((requirement) => requirement !== id && ids.has(requirement));
    const rank = requirements.length
      ? 1 + Math.max(...requirements.map((requirement) => rankOf(requirement, new Set(trail))))
      : 0;
    ranks.set(id, rank);
    return rank;
  }
  items.forEach((item) => rankOf(item.id));
  const groups = new Map();
  for (const item of items) {
    const rank = ranks.get(item.id) ?? 0;
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(item);
  }
  const widest = Math.max(1, ...[...groups.values()].map((group) => group.length));
  for (const [rank, group] of groups) {
    group.sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
    group.forEach((item, index) => {
      item.x = 34 + (index + (widest - group.length) / 2) * (NODE_WIDTH + 24);
      item.y = 26 + rank * 94;
    });
  }
}

layout();
const baseline = clone(nodes);

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      nodes = saved;
      return false;
    }
    if (!Array.isArray(saved?.nodes) || !saved.nodes.length) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      suggestions = typeof legacy?.suggestions === "string" ? legacy.suggestions : "";
      return false;
    }
    nodes = saved.nodes;
    suggestions = typeof saved.suggestions === "string" ? saved.suggestions : "";
    if (saved.camera && Number.isFinite(saved.camera.x) && Number.isFinite(saved.camera.y) && Number.isFinite(saved.camera.zoom)) {
      camera = saved.camera;
      return true;
    }
  } catch {
    // Storage can be unavailable in privacy modes; the session remains usable.
  }
  return false;
}

function saveDraft() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, suggestions, camera })); }
  catch { /* The in-memory draft remains usable. */ }
}

function validation() {
  const ids = new Set(nodes.map((item) => item.id));
  const dangling = [];
  for (const item of nodes) {
    for (const requirement of item.requires) {
      if (!ids.has(requirement)) dangling.push({ research: item.id, missing: requirement });
    }
  }
  const visiting = new Set();
  const visited = new Set();
  let cycle = false;
  function visit(id) {
    if (visiting.has(id)) { cycle = true; return; }
    if (visited.has(id)) return;
    visiting.add(id);
    byId(id)?.requires.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  nodes.forEach((item) => visit(item.id));
  return { cycle, dangling };
}

function changes() {
  const before = new Map(baseline.map((item) => [item.id, semantic(item)]));
  const after = new Map(nodes.map((item) => [item.id, semantic(item)]));
  const output = [];
  for (const [id, item] of after) {
    if (!before.has(id)) output.push({ id, change: "added", after: item });
    else if (JSON.stringify(before.get(id)) !== JSON.stringify(item)) {
      output.push({ id, change: "edited", before: before.get(id), after: item });
    }
  }
  for (const [id, item] of before) {
    if (!after.has(id)) output.push({ id, change: "deleted", before: item });
  }
  return output;
}

function graphBounds(items) {
  return {
    width: Math.max(760, ...items.map((item) => item.x + NODE_WIDTH + 34)),
    height: Math.max(660, ...items.map((item) => item.y + NODE_HEIGHT + 34)),
  };
}

function clampZoom(value) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function fitTree(renderAfter = true) {
  const bounds = graphBounds(visibleNodes());
  const zoom = clampZoom(Math.min(VIEW_WIDTH / bounds.width, VIEW_HEIGHT / bounds.height) * 0.94);
  camera = {
    zoom,
    x: (VIEW_WIDTH - bounds.width * zoom) / 2,
    y: (VIEW_HEIGHT - bounds.height * zoom) / 2,
  };
  saveDraft();
  if (renderAfter) renderGraph();
}

function svgPoint(clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function worldPoint(clientX, clientY) {
  const point = svgPoint(clientX, clientY);
  return {
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  };
}

function zoomAt(factor, focus = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 }) {
  const previous = camera.zoom;
  const next = clampZoom(previous * factor);
  const worldX = (focus.x - camera.x) / previous;
  const worldY = (focus.y - camera.y) / previous;
  camera.zoom = next;
  camera.x = focus.x - worldX * next;
  camera.y = focus.y - worldY * next;
  saveDraft();
  renderGraph();
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function renderGraph() {
  const items = visibleNodes();
  const ids = new Set(items.map((item) => item.id));
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.classList.toggle("is-panning", Boolean(panning));
  svg.replaceChildren();
  const title = svgElement("title", { id: "planner-graph-title" });
  title.textContent = "NanoSwarm research dependency graph";
  const description = svgElement("desc", { id: "planner-graph-description" });
  description.textContent = "Arrows lead from prerequisite research to the research it unlocks.";
  const definitions = svgElement("defs");
  const marker = svgElement("marker", { id: "planner-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
  marker.append(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "context-stroke" }));
  definitions.append(marker);
  const edges = svgElement("g");
  const nodeLayer = svgElement("g");
  const worldLayer = svgElement("g", {
    class: "planner-world",
    transform: `translate(${camera.x} ${camera.y}) scale(${camera.zoom})`,
  });
  const edgeKeys = new Set();
  for (const target of items) {
    for (const rawRequirement of target.requires) {
      const requirement = proxyId(rawRequirement);
      if (requirement === target.id || !ids.has(requirement)) continue;
      const edgeKey = `${requirement}>${target.id}`;
      if (edgeKeys.has(edgeKey)) continue;
      edgeKeys.add(edgeKey);
      const source = byId(requirement);
      const sourceX = source.x + NODE_WIDTH / 2;
      const sourceY = source.y + NODE_HEIGHT;
      const targetX = target.x + NODE_WIDTH / 2;
      const targetY = target.y;
      const middleY = (sourceY + targetY) / 2;
      edges.append(svgElement("path", {
        d: `M ${sourceX} ${sourceY} C ${sourceX} ${middleY}, ${targetX} ${middleY}, ${targetX} ${targetY}`,
        class: `planner-edge${selectedId === source.id || selectedId === target.id ? " selected" : ""}`,
      }));
    }
  }
  for (const item of items) {
    const group = svgElement("g", {
      class: `planner-node${selectedId === item.id ? " selected" : ""}${connectFrom === item.id ? " connect-source" : ""}`,
      transform: `translate(${item.x} ${item.y})`,
      "data-id": item.id,
      "data-category": item.category,
      "aria-label": `${item.name}; ${item.requires.length} prerequisites`,
    });
    group.append(svgElement("rect", { width: NODE_WIDTH, height: NODE_HEIGHT, rx: 5 }));
    const heading = svgElement("text", { x: 10, y: 23 });
    const rawName = !expanded && item.series ? item.name.replace(/ I$/u, "") : item.name;
    heading.textContent = rawName.length > 26 ? `${rawName.slice(0, 25)}…` : rawName;
    const meta = svgElement("text", { x: 10, y: 45, class: "node-meta" });
    meta.textContent = !expanded && item.series
      ? `${seriesCount(item.series)} REFINEMENTS · ${item.category.toUpperCase()}`
      : `${durationLabel(item)} · ${item.category.toUpperCase()}`;
    group.append(heading, meta);
    nodeLayer.append(group);
  }
  worldLayer.append(edges, nodeLayer);
  svg.append(title, description, definitions, worldLayer);
  root.querySelector("[data-stat='zoom']").textContent = `${Math.round(camera.zoom * 100)}% ZOOM`;
  renderStatus(edgeKeys.size);
}

function clearMessage() {
  const message = root.querySelector("[data-stat='message']");
  message.textContent = "";
  message.className = "planner-message";
}

function showMessage(text, tone = "") {
  const message = root.querySelector("[data-stat='message']");
  message.textContent = text;
  message.className = `planner-message${tone ? ` ${tone}` : ""}`;
}

function renderStatus(linkCount) {
  const check = validation();
  const draftItems = changes().length + (suggestions.trim() ? 1 : 0);
  root.querySelector("[data-stat='nodes']").textContent = `${nodes.length} RESEARCHES`;
  root.querySelector("[data-stat='links']").textContent = `${linkCount} VISIBLE LINKS`;
  root.querySelector("[data-stat='changes']").textContent = `${draftItems} DRAFT ITEMS`;
  if (check.cycle) showMessage("DEPENDENCY CYCLE DETECTED", "error");
  else if (check.dangling.length) showMessage(`${check.dangling.length} MISSING DEPENDENCY REFERENCES`, "error");
  else if (connectFrom) showMessage(`SELECT THE RESEARCH THAT SHOULD REQUIRE ${byId(connectFrom)?.name.toUpperCase()}`, "success");
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function renderEditor() {
  const item = byId(selectedId);
  editor.hidden = !item;
  emptyEditor.hidden = Boolean(item);
  if (!item) return;
  root.querySelector("[data-selected-name]").textContent = item.name;
  root.querySelector("[data-selected-category]").textContent = item.series
    ? `${item.category.toUpperCase()} · TIER ${item.tier}`
    : item.category.toUpperCase();
  for (const key of ["name", "id", "description", "trigger", "effect", "requiredNaniteMs", "unlockNanites", "requiresStage", "requiresSearch", "requiresDiscovery", "category"]) {
    editor.elements[key].value = item[key] ?? "";
  }
  editor.elements.energy.value = item.cost.energy;
  for (const key of ["carbon", "silicon", "copper", "gold"]) editor.elements[key].value = item.cost.atoms[key];
  editor.elements.bonuses.value = JSON.stringify(item.bonuses ?? {}, null, 2);
  const dependencies = root.querySelector("[data-dependencies]");
  dependencies.replaceChildren();
  if (!item.requires.length) {
    const empty = document.createElement("span");
    empty.className = "planner-derived";
    empty.textContent = "ROOT RESEARCH · NO PREREQUISITES";
    dependencies.append(empty);
  }
  for (const requirement of item.requires) {
    const chip = document.createElement("span");
    chip.className = "dependency-chip";
    chip.append(document.createTextNode(byId(requirement)?.name ?? requirement));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.removeDependency = requirement;
    remove.setAttribute("aria-label", `Remove ${requirement}`);
    remove.textContent = "×";
    chip.append(remove);
    dependencies.append(chip);
  }
  const select = editor.elements.newDependency;
  select.replaceChildren(option("", "Choose research…"));
  nodes
    .filter((candidate) => candidate.id !== item.id && !item.requires.includes(candidate.id))
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((candidate) => select.append(option(candidate.id, candidate.name)));
  root.querySelector("[data-derived]").textContent = `${durationLabel(item)} · ${item.unlockNanites ? `REVEALS AT ${formatCount(item.unlockNanites)} NANITES` : "REVEALS BY DEPENDENCY"}${item.requiresStage !== "" ? ` · STAGE ${item.requiresStage}` : ""}${item.requiresSearch !== "" ? ` · SEARCH ${item.requiresSearch}` : ""}${item.requiresDiscovery ? ` · GATE ${item.requiresDiscovery}` : ""}`;
}

function render() {
  saveDraft();
  renderGraph();
  renderEditor();
}

function refreshJson() {
  jsonBox.value = JSON.stringify({ version: 1, suggestions, researches: nodes.map(semantic) }, null, 2);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  jsonBox.value = text;
  jsonBox.focus();
  jsonBox.select();
  document.execCommand("copy");
}

function addResearch() {
  let suffix = 1;
  while (byId(`new-research-${suffix}`)) suffix += 1;
  const created = {
    id: `new-research-${suffix}`,
    name: "New Research",
    description: "Describe the capability being investigated.",
    effect: "Describe what changes for the player.",
    trigger: "Describe the observation that makes this question thinkable.",
    requires: ["relative-allocation"],
    requiredNaniteMs: "60000000",
    unlockNanites: "",
    requiresDiscovery: "",
    requiresStage: "",
    requiresSearch: "",
    cost: { energy: "0", atoms: { carbon: "0", silicon: "0", copper: "0", gold: "0" } },
    bonuses: {},
    category: "analysis",
    series: "",
    tier: 0,
    x: 24,
    y: 24,
  };
  nodes.push(created);
  selectedId = created.id;
  layout();
  fitTree(false);
  render();
}

function duplicateSelected() {
  const source = byId(selectedId);
  if (!source) return;
  let suffix = 1;
  let id = `${source.id}-copy`;
  while (byId(id)) id = `${source.id}-copy-${++suffix}`;
  const copied = clone(source);
  copied.id = id;
  copied.name = `${source.name} Copy`;
  copied.series = "";
  copied.tier = 0;
  copied.x += 26;
  copied.y += 26;
  nodes.push(copied);
  selectedId = id;
  render();
}

function importJson() {
  const parsed = JSON.parse(jsonBox.value);
  const imported = Array.isArray(parsed) ? parsed : parsed.researches ?? parsed.nodes;
  if (!Array.isArray(imported) || !imported.length) throw new Error("No research array found");
  const requiredKeys = ["id", "name", "requires", "requiredNaniteMs", "cost"];
  for (const item of imported) {
    if (requiredKeys.some((key) => item[key] === undefined)) throw new Error(`Malformed research: ${item.id ?? "unknown"}`);
    item.x ??= 0;
    item.y ??= 0;
    item.category ??= inferCategory(item);
    item.series ??= "";
    item.tier ??= 0;
    item.unlockNanites ??= "";
    item.requiresDiscovery ??= "";
    item.requiresStage ??= "";
    item.requiresSearch ??= "";
    item.trigger ??= "";
    item.bonuses ??= {};
  }
  nodes = imported;
  suggestions = typeof parsed.suggestions === "string" ? parsed.suggestions : suggestions;
  root.querySelector("[data-suggestions]").value = suggestions;
  selectedId = nodes[0].id;
  layout();
  fitTree(false);
  render();
}

editor.addEventListener("input", (event) => {
  const item = byId(selectedId);
  const field = event.target.name;
  if (!item || !field || ["id", "newDependency", "bonuses"].includes(field)) return;
  if (field === "energy") item.cost.energy = event.target.value;
  else if (["carbon", "silicon", "copper", "gold"].includes(field)) item.cost.atoms[field] = event.target.value;
  else item[field] = event.target.value;
  saveDraft();
  renderGraph();
  root.querySelector("[data-selected-name]").textContent = item.name;
  root.querySelector("[data-selected-category]").textContent = item.series
    ? `${item.category.toUpperCase()} · TIER ${item.tier}`
    : item.category.toUpperCase();
});

root.querySelector("[data-suggestions]").addEventListener("input", (event) => {
  suggestions = event.target.value;
  saveDraft();
  renderStatus(root.querySelectorAll(".planner-edge").length);
});

editor.elements.bonuses.addEventListener("change", (event) => {
  try {
    const value = JSON.parse(event.target.value);
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Bonuses must be an object");
    byId(selectedId).bonuses = value;
    clearMessage();
    render();
  } catch (error) {
    showMessage(`BONUS JSON INVALID · ${error.message}`, "error");
  }
});

root.addEventListener("click", async (event) => {
  const remove = event.target.closest("[data-remove-dependency]");
  if (remove) {
    const item = byId(selectedId);
    item.requires = item.requires.filter((id) => id !== remove.dataset.removeDependency);
    clearMessage();
    render();
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action || action === "expand") return;
  if (action === "layout") {
    layout();
    fitTree(false);
    clearMessage();
    render();
  } else if (action === "zoom-in") {
    zoomAt(1.25);
  } else if (action === "zoom-out") {
    zoomAt(0.8);
  } else if (action === "fit") {
    fitTree();
  } else if (action === "connect") {
    connectFrom = connectFrom ? "" : selectedId;
    event.target.closest("button").setAttribute("aria-pressed", String(Boolean(connectFrom)));
    renderGraph();
  } else if (action === "add") {
    addResearch();
  } else if (action === "reset") {
    nodes = clone(baseline);
    suggestions = "";
    root.querySelector("[data-suggestions]").value = "";
    selectedId = "parallel-directives";
    connectFrom = "";
    root.querySelector("[data-action='connect']").setAttribute("aria-pressed", "false");
    fitTree(false);
    clearMessage();
    render();
  } else if (action === "add-dependency") {
    const item = byId(selectedId);
    const requirement = editor.elements.newDependency.value;
    if (requirement && !item.requires.includes(requirement)) item.requires.push(requirement);
    clearMessage();
    render();
  } else if (action === "duplicate") {
    duplicateSelected();
  } else if (action === "delete") {
    nodes = nodes.filter((item) => item.id !== selectedId);
    selectedId = "";
    clearMessage();
    render();
  } else if (action === "refresh-json") {
    refreshJson();
  } else if (action === "copy-json") {
    refreshJson();
    await copyText(jsonBox.value);
    showMessage("FULL PLAN COPIED", "success");
  } else if (action === "import-json") {
    try {
      importJson();
      showMessage("PLAN IMPORTED", "success");
    } catch (error) {
      showMessage(`IMPORT FAILED · ${error.message}`, "error");
    }
  } else if (action === "copy-changes") {
    const planChanges = changes();
    if (!planChanges.length && !suggestions.trim()) {
      showMessage("NO DRAFT CHANGES TO COPY", "error");
      return;
    }
    const payload = JSON.stringify({
      instruction: "Review these NanoSwarm research-tree changes with me. Do not implement until I explicitly approve them.",
      suggestions,
      validation: validation(),
      changes: planChanges,
    }, null, 2);
    await copyText(payload);
    showMessage("CHANGES COPIED · PASTE THEM INTO OUR CHAT", "success");
  } else if (action === "download") {
    const content = JSON.stringify({ version: 1, suggestions, researches: nodes.map(semantic) }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nanoswarm-research-plan.json";
    link.click();
    URL.revokeObjectURL(url);
    showMessage("FULL PLAN DOWNLOADED", "success");
  }
});

root.querySelector("[data-action='expand']").addEventListener("change", (event) => {
  expanded = event.target.checked;
  const selected = byId(selectedId);
  if (!expanded && selected?.series) selectedId = selected.series;
  layout();
  fitTree(false);
  clearMessage();
  render();
});

svg.addEventListener("pointerdown", (event) => {
  const group = event.target.closest(".planner-node");
  if (!group) {
    const point = svgPoint(event.clientX, event.clientY);
    panning = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      cameraX: camera.x,
      cameraY: camera.y,
    };
    svg.setPointerCapture(event.pointerId);
    renderGraph();
    return;
  }
  const id = group.dataset.id;
  if (connectFrom && connectFrom !== id) {
    const target = byId(id);
    if (!target.requires.includes(connectFrom)) target.requires.push(connectFrom);
    connectFrom = "";
    root.querySelector("[data-action='connect']").setAttribute("aria-pressed", "false");
    selectedId = id;
    clearMessage();
    render();
    return;
  }
  selectedId = id;
  const item = byId(id);
  const point = worldPoint(event.clientX, event.clientY);
  dragging = { id, pointerId: event.pointerId, dx: point.x - item.x, dy: point.y - item.y };
  svg.setPointerCapture(event.pointerId);
  renderGraph();
  renderEditor();
});

svg.addEventListener("pointermove", (event) => {
  if (panning && panning.pointerId === event.pointerId) {
    const point = svgPoint(event.clientX, event.clientY);
    camera.x = panning.cameraX + point.x - panning.startX;
    camera.y = panning.cameraY + point.y - panning.startY;
    renderGraph();
    return;
  }
  if (!dragging || dragging.pointerId !== event.pointerId) return;
  const item = byId(dragging.id);
  const point = worldPoint(event.clientX, event.clientY);
  item.x = Math.max(0, point.x - dragging.dx);
  item.y = Math.max(0, point.y - dragging.dy);
  renderGraph();
});

function stopPointerInteraction(event) {
  const active = dragging?.pointerId === event.pointerId || panning?.pointerId === event.pointerId;
  if (!active) return;
  if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  dragging = null;
  panning = null;
  saveDraft();
  renderGraph();
}

svg.addEventListener("pointerup", stopPointerInteraction);
svg.addEventListener("pointercancel", stopPointerInteraction);
svg.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, svgPoint(event.clientX, event.clientY));
}, { passive: false });
svg.addEventListener("dblclick", () => fitTree());

const restoredCamera = restoreDraft();
if (!visibleNodes().some((item) => item.x || item.y)) layout();
if (!restoredCamera) fitTree(false);
root.querySelector("[data-suggestions]").value = suggestions;
render();
