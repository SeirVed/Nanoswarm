export const TOOLTIP_DELAY_MS = 1_500;
const TOOLTIP_TARGET_SELECTOR = "[data-tooltip], [data-action], [aria-label], button, input, select, textarea";

export const ACTION_TOOLTIPS = Object.freeze({
  begin: "Assume local directive authority over the stranded seed. This starts a new deterministic simulation with one damaged assembler and its recorded arrival history.",
  start: "Start one exact, indivisible job. Workers and inputs committed at launch cannot be redirected until that job reaches its completion boundary.",
  adjust: "Move one nanite into or out of this directive's target allocation. Hold the button to repeat progressively faster; in-flight cohorts still finish before workers return.",
  "step-share": "Change this persistent allocation target by one percentage point. Hold to accelerate; unlocked targets redistribute while protected targets retain their requested shares.",
  lock: "Protect this directive's percentage while other allocation targets change. Locking preserves intent, but never interrupts nanites already inside an indivisible cohort.",
  research: "Reserve every listed atom and unit of energy immediately, then add this topic to the queue. Reserved inputs remain conserved but unavailable to production.",
  "research-move": "Move this topic within the editable queue without losing accumulated work or changing its reserved inputs. Only the first queue entry receives research capacity.",
  "research-cancel": "Cancel this topic and release every reserved input. Work already performed on the cancelled topic is discarded and cannot be recovered.",
  "research-tab": "Switch between currently unresolved signals and research already completed. The list exposes only topics whose prerequisites the swarm has actually discovered.",
  "log-filter": "Filter the retained running log by significance. This changes only the visible history and does not alter simulation state or retention.",
  prospect: "Commit one available nanite to search beyond the exhausted material field. Search work is indivisible and produces a new substrate only at completion.",
  audio: "Enable or silence the procedural synthetic mind. Its harmony observes real swarm state but never affects resources, timing, or deterministic outcomes.",
  reset: "Erase the current local save and replay the seed's arrival. This is irreversible unless the browser has an external backup of its local storage.",
  volume: "Adjust synthetic-mind gain only. Volume is presentation state and has no effect on simulation speed, research, jobs, or saved resources.",
  "set-share": "Set this directive's persistent workforce percentage with the slider. Newly replicated nanites are automatically distributed toward these targets.",
  "set-share-percent": "Type an exact persistent allocation percentage from 0 to 100, with up to two decimal places. The value is committed when the field changes or loses focus.",
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

export function tooltipIdentityFor(target) {
  if (!target) return "";
  if (target.dataset?.tooltipKey) return `key:${target.dataset.tooltipKey}`;
  if (target.dataset?.action) {
    const details = ["action", "directive", "research", "tab", "tier", "delta", "shareDelta"]
      .map((key) => target.dataset[key] ?? "")
      .join(":");
    return `control:${details}`;
  }
  if (target.dataset?.unlockId) return `unlock:${target.dataset.unlockId}`;
  if (target.dataset?.cohortSlot) return `cohort:${target.dataset.cohortSlot}`;
  const label = target.getAttribute?.("aria-label");
  return label ? `label:${label}` : `text:${tooltipTextFor(target)}`;
}

export function installDelayedTooltips(root, delay = TOOLTIP_DELAY_MS) {
  const tooltip = document.createElement("div");
  tooltip.className = "delayed-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);

  let activeTarget = null;
  let activeText = "";
  let activeIdentity = "";
  let hoverStartedAt = 0;
  let pointer = null;
  let timer = null;

  function hide(clearPointer = true) {
    clearTimeout(timer);
    timer = null;
    activeTarget = null;
    activeText = "";
    activeIdentity = "";
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
    activeIdentity = tooltipIdentityFor(target);
    tooltip.hidden = true;
    timer = setTimeout(() => show(target, text), remaining);
  }

  function refresh() {
    if (!pointer) return;
    let target = null;
    if (activeIdentity) {
      target = [...root.querySelectorAll(TOOLTIP_TARGET_SELECTOR)]
        .find((candidate) => tooltipIdentityFor(candidate) === activeIdentity) ?? null;
    }
    if (!target) {
      const hovered = document.elementFromPoint(pointer.x, pointer.y);
      if (!hovered || !root.contains(hovered)) {
        hide();
        return;
      }
      target = hovered.closest?.(TOOLTIP_TARGET_SELECTOR);
    }
    const text = tooltipTextFor(target);
    if (!target || !text) {
      hide();
      return;
    }
    if (!activeIdentity || tooltipIdentityFor(target) !== activeIdentity) {
      hoverStartedAt = Date.now();
      schedule(target, text);
      return;
    }
    activeTarget = target;
    activeText = text;
    if (!tooltip.hidden) {
      show(target, text);
      return;
    }
    schedule(target, text, Math.max(0, delay - (Date.now() - hoverStartedAt)));
  }

  root.addEventListener("pointerover", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    const target = event.target.closest?.(TOOLTIP_TARGET_SELECTOR);
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
    const departed = event.target.closest?.(TOOLTIP_TARGET_SELECTOR);
    if (departed === activeTarget || !activeTarget.contains(event.target)) hide();
  });
  root.addEventListener("pointerdown", hide);
  root.addEventListener("scroll", hide, true);
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);

  return Object.freeze({ hide, refresh });
}
