export const TOOLTIP_DELAY_MS = 1_500;

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
  volume: "Adjust the gain of the procedural synthetic-mind soundscape.",
  "set-share": "Set this directive's persistent allocation percentage.",
  "set-share-percent": "Type an exact persistent allocation percentage from 0 to 100.",
});

export function tooltipTextFor(target) {
  if (!target) return "";
  const explicit = target.dataset?.tooltip;
  if (explicit) return explicit;
  const action = target.dataset?.action;
  if (action && ACTION_TOOLTIPS[action]) return ACTION_TOOLTIPS[action];
  const accessibleLabel = target.getAttribute?.("aria-label");
  if (accessibleLabel) return accessibleLabel;
  if (target.matches?.("button")) return target.textContent?.trim().replace(/\s+/g, " ") ?? "";
  return "";
}

export function installDelayedTooltips(root, delay = TOOLTIP_DELAY_MS) {
  const tooltip = document.createElement("div");
  tooltip.className = "delayed-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);

  let activeTarget = null;
  let activeText = "";
  let hoverStartedAt = 0;
  let pointer = null;
  let timer = null;

  function hide(clearPointer = true) {
    clearTimeout(timer);
    timer = null;
    activeTarget = null;
    activeText = "";
    hoverStartedAt = 0;
    if (clearPointer) pointer = null;
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

  function schedule(target, text, remaining = delay) {
    clearTimeout(timer);
    activeTarget = target;
    activeText = text;
    tooltip.hidden = true;
    timer = setTimeout(() => show(target, text), remaining);
  }

  function refresh() {
    if (!pointer) return;
    const hovered = document.elementFromPoint(pointer.x, pointer.y);
    if (!hovered || !root.contains(hovered)) {
      hide();
      return;
    }
    const target = hovered.closest?.("[data-tooltip], [data-action], [aria-label], button, input, select, textarea");
    const text = tooltipTextFor(target);
    if (!target || !text) {
      hide();
      return;
    }
    if (text !== activeText) {
      hoverStartedAt = Date.now();
      schedule(target, text);
      return;
    }
    activeTarget = target;
    if (!tooltip.hidden) {
      show(target, text);
      return;
    }
    schedule(target, text, Math.max(0, delay - (Date.now() - hoverStartedAt)));
  }

  root.addEventListener("pointerover", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    const target = event.target.closest?.("[data-tooltip], [data-action], [aria-label], button, input, select, textarea");
    const text = tooltipTextFor(target);
    if (!target || !text || target === activeTarget) return;
    hoverStartedAt = Date.now();
    schedule(target, text);
  });

  root.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
  });

  root.addEventListener("pointerout", (event) => {
    if (!activeTarget || activeTarget.contains(event.relatedTarget)) return;
    const departed = event.target.closest?.("[data-tooltip], [data-action], [aria-label], button, input, select, textarea");
    if (departed === activeTarget || !activeTarget.contains(event.target)) hide();
  });
  root.addEventListener("pointerdown", hide);
  root.addEventListener("scroll", hide, true);
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);

  return Object.freeze({ hide, refresh });
}
