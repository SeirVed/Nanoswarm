import { NANITE_ELEMENTS } from "../design/nanite.js";

export function createNaniteViewport(canvas, model, topology, { onSelect, focusedModules = [] } = {}) {
  const context = canvas.getContext("2d");
  const state = { yaw: -0.72, pitch: 0.38, panX: 0, panY: 0, zoom: 1, perspective: true, bonds: false, elements: new Set([0, 1, 2, 3]), selected: -1, focusedModules: new Set(focusedModules), drag: null, points: [], idleTimer: null, idleFrame: null, passivation: false, renderMode: "atoms" };
  const stopIdle = () => { if (state.idleTimer) window.clearTimeout(state.idleTimer); if (state.idleFrame) window.cancelAnimationFrame(state.idleFrame); state.idleTimer = null; state.idleFrame = null; };
  const draw = () => {
    const rect = canvas.getBoundingClientRect(); const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale)); canvas.height = Math.max(1, Math.floor(rect.height * scale)); context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, rect.width, rect.height);
    const base = Math.min(rect.width, rect.height) * 0.1 * state.zoom; const cosY = Math.cos(state.yaw); const sinY = Math.sin(state.yaw); const cosP = Math.cos(state.pitch); const sinP = Math.sin(state.pitch); const points = [];
    for (let index = 0; index < model.count; index += 1) {
      const element = model.element[index]; if (!state.elements.has(element)) continue;
      const x = model.position[index * 3]; const y = model.position[index * 3 + 1]; const z = model.position[index * 3 + 2];
      const rx = x * cosY - z * sinY; const rz = x * sinY + z * cosY; const ry = y * cosP - rz * sinP; const depth = y * sinP + rz * cosP + 9;
      const factor = state.perspective ? 9 / depth : 1; const radius = Math.max(0.5, (model.radiusPm[index] / 76) * 1.35 * factor * state.zoom);
      points.push({ index, x: rect.width / 2 + state.panX + rx * base * factor, y: rect.height / 2 + state.panY - ry * base * factor, depth, radius, element, module: model.module[index] });
    }
    points.sort((left, right) => right.depth - left.depth); state.points = points;
    if (state.bonds && state.renderMode === "atoms") {
      const byIndex = new Map(points.map((point) => [point.index, point])); context.lineWidth = 1.1;
      for (let bond = 0; bond < topology.pairs.length; bond += 2) {
        const left = byIndex.get(topology.pairs[bond]); const right = byIndex.get(topology.pairs[bond + 1]); if (!left || !right) continue;
        const highlighted = state.focusedModules.size === 0 || (state.focusedModules.has(left.module) && state.focusedModules.has(right.module));
        context.strokeStyle = "rgba(137, 255, 170, " + (highlighted ? "0.68" : "0.08") + ")";
        context.beginPath(); context.moveTo(left.x, left.y); context.lineTo(right.x, right.y); context.stroke();
      }
    }
    if (state.renderMode === "smooth") {
      context.save(); context.globalCompositeOperation = "lighter";
      for (const point of points) {
        const dimmed = state.focusedModules.size > 0 && !state.focusedModules.has(point.module);
        context.beginPath(); context.fillStyle = NANITE_ELEMENTS[point.element].color;
        context.globalAlpha = dimmed ? 0.008 : 0.075;
        context.arc(point.x, point.y, Math.max(3.5, point.radius * 3.8 + 1.8), 0, Math.PI * 2); context.fill();
      }
      context.globalCompositeOperation = "source-over";
      for (const point of points) {
        const dimmed = state.focusedModules.size > 0 && !state.focusedModules.has(point.module);
        context.beginPath(); context.fillStyle = point.index === state.selected ? "#f7fff8" : "#8dffae";
        context.globalAlpha = dimmed ? 0.018 : 0.09;
        context.arc(point.x, point.y, Math.max(1.4, point.radius * 1.8), 0, Math.PI * 2); context.fill();
      }
      context.restore();
    } else for (const point of points) {
      const dimmed = state.focusedModules.size > 0 && !state.focusedModules.has(point.module);
      context.beginPath(); context.fillStyle = point.index === state.selected ? "#f7fff8" : NANITE_ELEMENTS[point.element].color;
      context.globalAlpha = dimmed ? 0.06 : Math.min(0.92, 0.34 + (10 - point.depth) * 0.07);
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2); context.fill();
    }
    if (state.passivation && model.passivation) for (let index = 0; index < model.passivation.count; index += 1) { const x = model.passivation.position[index * 3]; const y = model.passivation.position[index * 3 + 1]; const z = model.passivation.position[index * 3 + 2]; const rx = x * cosY - z * sinY; const rz = x * sinY + z * cosY; const ry = y * cosP - rz * sinP; const depth = y * sinP + rz * cosP + 9; const factor = state.perspective ? 9 / depth : 1; context.beginPath(); context.fillStyle = "#d8f6ff"; context.globalAlpha = 0.72; context.arc(rect.width / 2 + state.panX + rx * base * factor, rect.height / 2 + state.panY - ry * base * factor, Math.max(0.35, 0.55 * factor * state.zoom), 0, Math.PI * 2); context.fill(); }
    context.globalAlpha = 1;
    if (state.selected >= 0) {
      const point = points.find((item) => item.index === state.selected);
      if (point) { context.strokeStyle = "#ffffff"; context.lineWidth = 1; context.beginPath(); context.arc(point.x, point.y, point.radius + 4, 0, Math.PI * 2); context.stroke(); }
    }
  };
  const scheduleIdle = () => {
    stopIdle();
    state.idleTimer = window.setTimeout(() => {
      const rotate = () => { state.yaw += 0.005; draw(); state.idleFrame = window.requestAnimationFrame(rotate); };
      state.idleFrame = window.requestAnimationFrame(rotate);
    }, 5000);
  };
  const reset = () => { stopIdle(); Object.assign(state, { yaw: -0.72, pitch: 0.38, panX: 0, panY: 0, zoom: 1, selected: -1 }); draw(); scheduleIdle(); };
  const select = (x, y) => {
    const hit = [...state.points].reverse().find((point) => Math.hypot(point.x - x, point.y - y) <= Math.max(6, point.radius + 3)); if (!hit) return;
    stopIdle(); state.selected = hit.index; onSelect?.(hit.index); draw(); scheduleIdle();
  };
  canvas.addEventListener("pointerdown", (event) => { stopIdle(); canvas.setPointerCapture(event.pointerId); state.drag = { x: event.clientX, y: event.clientY, pan: event.button === 1 || event.shiftKey || event.altKey, moved: false }; });
  canvas.addEventListener("pointermove", (event) => { if (!state.drag) return; const dx = event.clientX - state.drag.x; const dy = event.clientY - state.drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) state.drag.moved = true; if (state.drag.pan) { state.panX += dx; state.panY += dy; } else { state.yaw += dx * 0.009; state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + dy * 0.009)); } state.drag.x = event.clientX; state.drag.y = event.clientY; draw(); });
  canvas.addEventListener("pointerup", (event) => { const drag = state.drag; state.drag = null; if (drag && !drag.moved) { const rect = canvas.getBoundingClientRect(); select(event.clientX - rect.left, event.clientY - rect.top); } else scheduleIdle(); });
  canvas.addEventListener("wheel", (event) => { event.preventDefault(); stopIdle(); state.zoom = Math.max(0.35, Math.min(3, state.zoom * (event.deltaY > 0 ? 0.9 : 1.1))); draw(); scheduleIdle(); }, { passive: false });
  scheduleIdle();
  return { draw, reset, focusModules(indices) { state.focusedModules = new Set(indices); draw(); }, toggleProjection() { state.perspective = !state.perspective; draw(); return state.perspective; }, toggleElement(index) { state.elements.has(index) ? state.elements.delete(index) : state.elements.add(index); draw(); }, toggleBonds() { state.bonds = !state.bonds; draw(); return state.bonds; }, togglePassivation() { state.passivation = !state.passivation; draw(); return state.passivation; }, toggleRenderMode() { state.renderMode = state.renderMode === "atoms" ? "smooth" : "atoms"; draw(); return state.renderMode === "smooth"; }, state };
}
