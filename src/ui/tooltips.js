export const TOOLTIP_DELAY_MS = 3_000;

export const ACTION_TOOLTIPS = Object.freeze({
  begin: "Assume control of the stranded seed and begin the local simulation.",
  start: "Start one discrete job with the available primary assembler.",
  adjust: "Move one nanite into or out of this directive. Hold to accelerate.",
  "step-share": "Change this persistent allocation target by one percentage point. Hold to accelerate.",
  lock: "Protect this directive's percentage while other allocation targets change.",
  research: "Reserve the listed inputs and add this topic to the research queue.",
  "research-move": "Move this topic within the editable research queue.",
  "research-cancel": "Cancel this topic, discard its work, and release all reserved inputs.",
  "research-tab": "Switch between unresolved and completed research topics.",
  "log-filter": "Show only events at this significance tier without changing retention.",
  prospect: "Commit one available nanite to search for another material field.",
  audio: "Enable or silence the procedural synthetic-mind soundscape.",
  reset: "Erase the current local save and restart the seed arrival sequence.",
});

export function tooltipTextFor(target) {
  if (!target) return "";
  const explicit = target.dataset?.tooltip;
  if (explicit) return explicit;
  const action = target.dataset?.action;
  if (action && ACTION_TOOLTIPS[action]) return ACTION_TOOLTIPS[action];
  return target.getAttribute?.("aria-label") ?? "";
}

export function installDelayedTooltips(root, delay = TOOLTIP_DELAY_MS) {
  const tooltip = document.createElement("div");
  tooltip.className = "delayed-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);

  let activeTarget = null;
  let timer = null;

  function hide() {
    clearTimeout(timer);
    timer = null;
    activeTarget = null;
    tooltip.hidden = true;
  }

  function show(target, text) {
    if (!target.isConnected) return;
    tooltip.textContent = text;
    tooltip.hidden = false;
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - tooltipRect.width - 8,
      targetRect.left + targetRect.width / 2 - tooltipRect.width / 2));
    const below = targetRect.bottom + 9;
    const top = below + tooltipRect.height <= window.innerHeight - 8
      ? below
      : Math.max(8, targetRect.top - tooltipRect.height - 9);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  root.addEventListener("pointerover", (event) => {
    const target = event.target.closest?.("[data-tooltip], [data-action], [aria-label]");
    const text = tooltipTextFor(target);
    if (!target || !text || target === activeTarget) return;
    hide();
    activeTarget = target;
    timer = setTimeout(() => show(target, text), delay);
  });

  root.addEventListener("pointerout", (event) => {
    if (!activeTarget || activeTarget.contains(event.relatedTarget)) return;
    const departed = event.target.closest?.("[data-tooltip], [data-action], [aria-label]");
    if (departed === activeTarget || !activeTarget.contains(event.target)) hide();
  });
  root.addEventListener("pointerdown", hide);
  root.addEventListener("scroll", hide, true);
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);

  return Object.freeze({ hide });
}
