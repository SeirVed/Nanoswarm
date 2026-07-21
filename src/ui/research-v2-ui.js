import { RESEARCH } from "../game/content.js";
import {
  effectiveResearchCapacity,
  startQueuedResearch,
} from "../game/engine.js";
import { formatCount, formatEnergy } from "../game/quantities.js";
import { saveGame } from "../game/storage.js";

let scheduled = false;

function replaceStateInPlace(target, source) {
  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key];
  }
  Object.assign(target, source);
  globalThis.__nanoswarmState = target;
}

function showResearchNotice(panel, message, tone = "warn") {
  let notice = panel.querySelector("[data-mnemonic-notice]");
  if (!notice) {
    notice = document.createElement("p");
    notice.dataset.mnemonicNotice = "";
    notice.className = "panel-note";
    panel.prepend(notice);
  }
  notice.classList.toggle("tone-good", tone === "good");
  notice.textContent = message;
}

function startWaitingResearch(panel, id) {
  const current = globalThis.__nanoswarmState;
  if (!current) return;
  const result = startQueuedResearch(current, id, Date.now());
  if (!result.ok) {
    showResearchNotice(panel, result.reason);
    return;
  }
  replaceStateInPlace(current, result.state);
  saveGame(current, Date.now());
  showResearchNotice(panel, "MNEMONIC CONSTRUCTION STARTED.", "good");
  schedulePatch();
}

function patchResearchPanel() {
  const state = globalThis.__nanoswarmState;
  const panel = document.querySelector(".research-panel");
  if (!state || !panel) return;

  const capacity = effectiveResearchCapacity(state);
  const active = state.researchQueue.find((item) => item.status === "active") ?? null;
  const constructing = active?.memoryNanites ?? 0n;

  const headingValue = panel.querySelector(".panel-heading span:last-child");
  if (headingValue) headingValue.textContent = `${formatCount(capacity)} MNEMONIC CAPACITY`;

  const capacityBlock = panel.querySelector(".research-capacity");
  if (capacityBlock) {
    capacityBlock.dataset.tooltip =
      "The computronium core supplies 100 bootstrap units. The bank under construction is writable working memory, while installed mnemonic banks contribute reusable bandwidth.";
    capacityBlock.innerHTML = `<span>COMPUTRONIUM + MNEMONIC SUBSTRATE</span><strong>CORE 100 · CONSTRUCTING ${formatCount(
      constructing,
    )} · INSTALLED ${formatCount(state.mnemonicNanites)} n-eq</strong>`;
  }

  const activeBlock = panel.querySelector(".active-research");
  if (activeBlock && !active) {
    activeBlock.hidden = true;
  } else if (activeBlock && active) {
    activeBlock.hidden = false;
    const eyebrow = activeBlock.querySelector(".eyebrow");
    if (eyebrow) eyebrow.textContent = active.memoryNanites > 0n
      ? "ACTIVE MNEMONIC CONSTRUCTION"
      : "ACTIVE BOOTSTRAP RESEARCH";
  }

  const sectionRule = panel.querySelector(".section-rule span");
  if (sectionRule) sectionRule.textContent =
    "QUEUE INTENT ONLY · ENERGY AND NANITES COMMIT WHEN CONSTRUCTION STARTS";

  const rows = [...panel.querySelectorAll(".research-queue-row")];
  rows.forEach((row, index) => {
    const item = state.researchQueue[index];
    if (!item) return;
    const status = item.status === "active"
      ? "ACTIVE"
      : index === state.researchQueue.findIndex((candidate) => candidate.status === "queued")
        ? "WAITING FOR START"
        : "QUEUED";
    const small = row.querySelector("div small");
    if (small) {
      const definition = RESEARCH[item.id];
      const percent = definition.requiredNaniteMs > 0n
        ? Number(item.progressNaniteMs * 1_000n / definition.requiredNaniteMs) / 10
        : 100;
      small.textContent = `${status} · ${percent.toFixed(1)}% WORK COMPLETE`;
    }
    row.dataset.tooltip =
      item.status === "active"
        ? "The committed nanites are already being reconfigured and cannot return to the active swarm."
        : "Queued research reserves nothing. Start it explicitly after the current mnemonic bank completes.";

    const controls = row.querySelector(".queue-controls");
    if (
      controls &&
      item.status === "queued" &&
      !active &&
      index === state.researchQueue.findIndex((candidate) => candidate.status === "queued") &&
      !controls.querySelector("[data-action='mnemonic-start']")
    ) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "queue-button";
      button.dataset.action = "mnemonic-start";
      button.textContent = "START";
      button.addEventListener("click", () => startWaitingResearch(panel, item.id));
      controls.prepend(button);
    }
  });

  for (const article of panel.querySelectorAll(".research-card")) {
    const button = article.querySelector("button[data-research]");
    const definition = button ? RESEARCH[button.dataset.research] : null;
    if (!definition) continue;
    const smalls = article.querySelectorAll("small");
    const costLine = smalls[smalls.length - 1];
    if (!costLine) continue;
    if (definition.memoryNanites === 0n) {
      costLine.textContent =
        `BOOTSTRAP ARCHIVE · 0 NANITES CONVERTED · E ${formatEnergy(definition.energyCost)}`;
    } else {
      const activeAfter = state.nanites > definition.memoryNanites
        ? state.nanites - definition.memoryNanites
        : 0n;
      costLine.textContent =
        `MEMORY ${formatCount(definition.memoryNanites)} NANITES · E ${formatEnergy(
          definition.energyCost,
        )} · ACTIVE AFTER ${formatCount(activeAfter)}`;
    }
    article.dataset.tooltip =
      `${definition.description} Research consumes energy and permanently fixes its listed active nanites as mnemonic substrate. Loose elemental inventory is never charged.`;
  }
}

function schedulePatch() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    patchResearchPanel();
  });
}

const observer = new MutationObserver(schedulePatch);
const root = document.querySelector("#root");
if (root) observer.observe(root, { childList: true, subtree: true });
schedulePatch();
