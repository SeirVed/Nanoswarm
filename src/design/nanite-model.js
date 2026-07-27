import { NANITE_ELEMENTS } from "./nanite.js";

const ELEMENT_INDEX = Object.fromEntries(NANITE_ELEMENTS.map((element, index) => [element.id, index]));
const RADII_PM = [76, 111, 132, 136];
const frame = (id, index, total) => {
  if (id === "shell-truss") return [[0, 0, 0], [2.75, 2, 1.75]];
  if (id === "anchor-actuators") {
    const leg = Math.floor(index / Math.max(1, total / 4));
    return [[leg % 2 ? 2.8 : -2.8, leg < 2 ? 1.55 : -1.55, 0], [0.7, 0.48, 0.48]];
  }
  if (id === "assembly-manipulators") return [[index % 2 ? 3.05 : -3.05, 0.1, -0.2], [0.75, 0.42, 0.4]];
  if (id === "intake-channel") return [[0, -1.3, -1.2], [1.25, 0.6, 0.42]];
  if (id === "computational-substrate") return [[0, 0, 0.15], [1.15, 1.05, 0.78]];
  return [[0, 0.1, 1.2], [1.25, 0.9, 0.4]];
};

const random = (seed) => () => {
  let value = seed += 0x6d2b79f5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};

export function generateNaniteModel(plan) {
  const count = plan.modules.reduce((total, module) => total + Object.values(module.atoms).reduce((sum, value) => sum + Number(value), 0), 0);
  const position = new Float32Array(count * 3);
  const element = new Uint8Array(count);
  const module = new Uint8Array(count);
  const radiusPm = new Uint16Array(count);
  const next = random(Number(plan.seed) || 5575);
  let cursor = 0;
  for (let moduleIndex = 0; moduleIndex < plan.modules.length; moduleIndex += 1) {
    const designModule = plan.modules[moduleIndex];
    const total = Object.values(designModule.atoms).reduce((sum, value) => sum + Number(value), 0);
    let local = 0;
    for (const atom of NANITE_ELEMENTS) {
      for (let ordinal = 0; ordinal < Number(designModule.atoms[atom.id] ?? 0); ordinal += 1) {
        const [centre, extent] = frame(designModule.id, local, total);
        const theta = next() * Math.PI * 2;
        const phi = Math.acos(1 - 2 * next());
        const distance = Math.cbrt(next());
        position[cursor * 3] = centre[0] + Math.cos(theta) * Math.sin(phi) * distance * extent[0];
        position[cursor * 3 + 1] = centre[1] + Math.sin(theta) * Math.sin(phi) * distance * extent[1];
        position[cursor * 3 + 2] = centre[2] + Math.cos(phi) * distance * extent[2];
        element[cursor] = ELEMENT_INDEX[atom.id]; module[cursor] = moduleIndex; radiusPm[cursor] = RADII_PM[ELEMENT_INDEX[atom.id]];
        cursor += 1; local += 1;
      }
    }
  }
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (let index = 0; index < count; index += 1) for (let axis = 0; axis < 3; axis += 1) { const value = position[index * 3 + axis]; bounds.min[axis] = Math.min(bounds.min[axis], value); bounds.max[axis] = Math.max(bounds.max[axis], value); }
  bounds.size = bounds.max.map((value, axis) => value - bounds.min[axis]);
  return { count, position, element, module, radiusPm, bounds };
}
