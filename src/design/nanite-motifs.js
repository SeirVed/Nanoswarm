// Deterministic, module-specific scaffold candidates for the N0 planner.
// This is visual/proposal geometry only: it never changes the game recipe.

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;

const hash = (value) => {
  let result = value >>> 0;
  result = Math.imul(result ^ (result >>> 16), 0x7feb352d);
  result = Math.imul(result ^ (result >>> 15), 0x846ca68b);
  return (result ^ (result >>> 16)) >>> 0;
};

const rankFor = (seed, index, moduleIndex) =>
  hash((Number(seed) || 5575) + Math.imul(index + 1, 0x9e3779b1) + moduleIndex * 0x85ebca6b);

const add = (sites, point, local, seed, moduleIndex, attachment = false) => {
  const index = sites.length;
  sites.push({ point, local, rank: rankFor(seed, index, moduleIndex), attachment });
};

const lerpPoint = (left, right, amount) => [
  left[0] + (right[0] - left[0]) * amount,
  left[1] + (right[1] - left[1]) * amount,
  left[2] + (right[2] - left[2]) * amount,
];

const offset = (point, direction, length) => {
  const magnitude = Math.hypot(...direction) || 1;
  return point.map((value, axis) => value + direction[axis] / magnitude * length);
};

const C60_VERTICES = (() => {
  const raw = [];
  const addVertex = (point) => raw.push(point);
  for (let axis = 0; axis < 3; axis += 1) {
    for (const first of [-1, 1]) for (const second of [-1, 1]) {
      const point = [0, 0, 0];
      point[(axis + 1) % 3] = first;
      point[(axis + 2) % 3] = second * 3 * PHI;
      addVertex(point);
    }
  }
  const evenPermutations = (values) => [values, [values[1], values[2], values[0]], [values[2], values[0], values[1]]];
  for (const values of [[1, 2 + PHI, 2 * PHI], [PHI, 2, 2 * PHI + 1]]) {
    for (const permutation of evenPermutations(values)) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        addVertex([permutation[0] * sx, permutation[1] * sy, permutation[2] * sz]);
      }
    }
  }
  const unique = [...new Map(raw.map((point) => [point.map((value) => value.toFixed(8)).join('|'), point])).values()];
  let edge = Infinity;
  for (let left = 0; left < unique.length; left += 1) for (let right = left + 1; right < unique.length; right += 1) {
    edge = Math.min(edge, Math.hypot(
      unique[left][0] - unique[right][0],
      unique[left][1] - unique[right][1],
      unique[left][2] - unique[right][2],
    ));
  }
  return unique.map((point) => point.map((value) => value * 0.154 / edge));
})();

function ellipsoidCage(sites, count, centre, radii, seed, moduleIndex) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const vertical = 1 - 2 * (index + 0.5) / count;
    const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    const angle = index * goldenAngle;
    const local = [Math.cos(angle) * horizontal, Math.sin(angle) * horizontal, vertical];
    add(sites, [
      centre[0] + local[0] * radii[0],
      centre[1] + local[1] * radii[1],
      centre[2] + local[2] * radii[2],
    ], local, seed, moduleIndex);
  }
}

function hexPanel(sites, count, origin, axisU, axisV, width, height, seed, moduleIndex) {
  const columns = Math.max(2, Math.ceil(Math.sqrt((count * width) / Math.max(height, 0.1))));
  const rows = Math.max(2, Math.ceil(count / columns));
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const u = ((column + (row & 1) * 0.5) / Math.max(1, columns - 1) - 0.5) * width;
    const v = (row / Math.max(1, rows - 1) - 0.5) * height;
    const point = [
      origin[0] + axisU[0] * u + axisV[0] * v,
      origin[1] + axisU[1] * u + axisV[1] * v,
      origin[2] + axisU[2] * u + axisV[2] * v,
    ];
    add(sites, point, [u, v, 0], seed, moduleIndex);
  }
}

function tube(sites, count, path, radius, seed, moduleIndex, caps = { start: true, end: true }) {
  const around = 10;
  const along = Math.max(2, Math.ceil(count / around));
  for (let index = 0; index < count; index += 1) {
    const axial = Math.floor(index / around);
    const phase = (index % around) / around * TAU + (axial & 1) * Math.PI / around;
    const fraction = (axial + 0.5) / along;
    const segment = Math.min(path.length - 2, Math.floor(fraction * (path.length - 1)));
    const segmentAmount = fraction * (path.length - 1) - segment;
    const centre = lerpPoint(path[segment], path[segment + 1], segmentAmount);
    const direction = lerpPoint(path[segment], path[segment + 1], 1);
    const dx = direction[0] - path[segment][0];
    const dy = direction[1] - path[segment][1];
    const dz = direction[2] - path[segment][2];
    const horizontal = Math.hypot(dx, dy) || 1;
    const side = [-dy / horizontal, dx / horizontal, 0];
    const normal = [(-dx * dz) / horizontal, (-dy * dz) / horizontal, horizontal];
    const startClosure = caps.start ? Math.sin(fraction * Math.PI * 3) : 1;
    const endClosure = caps.end ? Math.sin((1 - fraction) * Math.PI * 3) : 1;
    const closure = Math.min(1, startClosure, endClosure);
    const point = [
      centre[0] + radius * closure * (side[0] * Math.cos(phase) + normal[0] * Math.sin(phase)),
      centre[1] + radius * closure * (side[1] * Math.cos(phase) + normal[1] * Math.sin(phase)),
      centre[2] + radius * closure * (side[2] * Math.cos(phase) + normal[2] * Math.sin(phase)),
    ];
    add(sites, point, [fraction, Math.cos(phase), Math.sin(phase)], seed, moduleIndex);
  }
}

function threePointEffector(sites, count, centre, side, seed, moduleIndex) {
  const perPoint = Math.floor(count / 3);
  for (let index = 0; index < 3; index += 1) {
    const angle = index / 3 * TAU;
    const allocation = perPoint + (index < count % 3 ? 1 : 0);
    ellipsoidCage(sites, allocation, [
      centre[0] + side * 0.1,
      centre[1] + Math.cos(angle) * 0.16,
      centre[2] + Math.sin(angle) * 0.16,
    ], [0.09, 0.07, 0.07], seed, moduleIndex);
  }
}

function c60Cage(sites, centre, attachmentVertex, seed, moduleIndex) {
  for (let index = 0; index < C60_VERTICES.length; index += 1) {
    const local = C60_VERTICES[index];
    add(sites, [centre[0] + local[0], centre[1] + local[1], centre[2] + local[2]], local, seed, moduleIndex, index === attachmentVertex);
  }
}

function carapaceCentres() {
  const centres = [];
  const band = (count, radiusX, radiusY, height, phase = 0) => {
    for (let index = 0; index < count; index += 1) {
      const angle = phase + index / count * TAU;
      centres.push([Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, height]);
    }
  };
  // Outer dorsal body, broad lateral carapace, then a recessed ventral inner shell.
  band(10, 1.65, 0.92, 0.78, Math.PI / 10);
  band(12, 1.95, 1.22, 0.18);
  band(10, 1.52, 0.88, -0.48, Math.PI / 10);
  // A horseshoe rim leaves the ventral assembly/output aperture physically open.
  for (const point of [[-1.1, -1.18, -0.78], [-0.55, -1.34, -0.84], [0.55, -1.34, -0.84], [1.1, -1.18, -0.78], [-1.28, -0.72, -0.92], [1.28, -0.72, -0.92], [-0.72, -0.42, -1.02], [0.72, -0.42, -1.02]]) centres.push(point);
  centres.push([0, 1.12, -0.16]);
  return centres;
}

const CARAPACE_CENTRES = carapaceCentres();

function carapaceCentre(index) {
  return CARAPACE_CENTRES[index % CARAPACE_CENTRES.length];
}

function shellTruss(sites, count, seed, moduleIndex) {
  const attachments = [
    [-1.85, 1.02, -0.72], [1.85, 1.02, -0.72], [-1.85, -1.02, -0.72], [1.85, -1.02, -0.72],
    [-1.85, 0.72, 0.52], [1.85, 0.72, 0.52], [0, -1.15, -0.76], [0, 0.96, 0.26], [0, 0.1, 1.03],
  ];
  const cages = Math.floor(count / C60_VERTICES.length);
  for (let index = 0; index < cages; index += 1) {
    const attachment = index < attachments.length ? attachments[index] : null;
    const attachmentVertex = attachment ? (index * 7) % C60_VERTICES.length : -1;
    const centre = attachment
      ? attachment.map((value, axis) => value - C60_VERTICES[attachmentVertex][axis])
      : carapaceCentre(index - attachments.length);
    c60Cage(sites, centre, attachmentVertex, seed, moduleIndex);
  }
  const remainder = count - cages * C60_VERTICES.length;
  if (remainder) ellipsoidCage(sites, remainder, [0, 0, 0], [1.4, 0.85, 0.65], seed, moduleIndex);
}

function anchorActuators(sites, count, seed, moduleIndex) {
  const bases = [
    [-1.85, 1.02, -0.72], [1.85, 1.02, -0.72],
    [-1.85, -1.02, -0.72], [1.85, -1.02, -0.72],
  ];
  const perAnchor = Math.floor(count / bases.length);
  let remainder = count % bases.length;
  for (const base of bases) {
    const side = Math.sign(base[0]) || 1;
    const flank = Math.sign(base[1]) || 1;
    const allocation = perAnchor + (remainder-- > 0 ? 1 : 0);
    const collar = Math.min(24, Math.max(0, allocation - 44));
    const pad = Math.min(36, Math.max(0, allocation - 1 - collar));
    const tubeBudget = allocation - 1 - collar - pad;
    const attached = offset(base, [side * 0.55, flank * 0.55, -0.3], 0.154);
    add(sites, attached, [0, 0, 0], seed, moduleIndex, true);
    ellipsoidCage(sites, collar, attached, [0.24, 0.2, 0.19], seed, moduleIndex);
    const endpoint = [side * 3.25, flank * 2.18, -1.62];
    const knee = [side * 2.62, flank * 1.72, -1.12];
    tube(sites, tubeBudget, [attached, knee, endpoint], 0.18, seed, moduleIndex);
    ellipsoidCage(sites, pad, endpoint, [0.28, 0.22, 0.14], seed, moduleIndex);
  }
}

function assemblyManipulators(sites, count, seed, moduleIndex) {
  const perManipulator = Math.floor(count / 2);
  for (let index = 0; index < 2; index += 1) {
    const side = index ? 1 : -1;
    const allocation = perManipulator + (index < count % 2 ? 1 : 0);
    const shell = [side * 1.85, 0.72, 0.52];
    const attached = offset(shell, [side, 0.3, 0.1], 0.154);
    const effector = Math.min(30, Math.max(0, allocation - 2));
    add(sites, attached, [0, 0, 0], seed, moduleIndex, true);
    const endpoint = [side * 3.4, 0.26, -0.32];
    tube(sites, allocation - 1 - effector, [
      attached,
      [side * 2.54, 0.84, 0.08],
      [side * 2.98, 0.53, -0.18],
      endpoint,
    ], 0.13, seed, moduleIndex);
    threePointEffector(sites, effector, endpoint, side, seed, moduleIndex);
  }
}

function intakeChannel(sites, count, seed, moduleIndex) {
  const attached = offset([0, -1.15, -0.76], [0, -0.7, -0.7], 0.154);
  const collar = Math.min(96, Math.max(0, count - 2));
  const throat = count - 1 - collar;
  add(sites, attached, [0, 0, 0], seed, moduleIndex, true);
  ellipsoidCage(sites, collar, [0, -1.35, -0.67], [0.38, 0.25, 0.25], seed, moduleIndex);
  tube(sites, throat, [attached, [0, -1.58, -0.62], [0, -2.12, -0.42]], 0.26, seed, moduleIndex, { start: true, end: false });
}

function computationalSubstrate(sites, count, seed, moduleIndex) {
  const layers = 3;
  const attached = offset([0, 0.96, 0.26], [0, -1, 0], 0.154);
  add(sites, attached, [0, 0, 0], seed, moduleIndex, true);
  const perLayer = Math.floor((count - 1) / layers);
  for (let layer = 0; layer < layers; layer += 1) {
    hexPanel(
      sites,
      perLayer + (layer < (count - 1) % layers ? 1 : 0),
      [0, 0.08, -0.22 + layer * 0.22],
      [1, 0, 0],
      [0, 1, 0],
      1.42,
      0.98,
      seed,
      moduleIndex,
    );
  }
}

function timingFieldArray(sites, count, seed, moduleIndex) {
  const layers = 2;
  const attached = offset([0, 0.1, 1.03], [0, 0, 1], 0.187);
  add(sites, attached, [0, 0, 0], seed, moduleIndex, true);
  const perLayer = Math.floor((count - 1) / layers);
  for (let layer = 0; layer < layers; layer += 1) {
    hexPanel(
      sites,
      perLayer + (layer < (count - 1) % layers ? 1 : 0),
      [0, 0.08, 1.42 + layer * 0.18],
      [1, 0, 0],
      [0, 1, 0],
      1.22,
      0.7,
      seed,
      moduleIndex,
    );
  }
}

const BUILDERS = {
  "shell-truss": shellTruss,
  "anchor-actuators": anchorActuators,
  "assembly-manipulators": assemblyManipulators,
  "intake-channel": intakeChannel,
  "computational-substrate": computationalSubstrate,
  "timing-field-array": timingFieldArray,
};

export function motifCandidates(item, moduleIndex, seed, need) {
  const sites = [];
  const builder = BUILDERS[item.id];
  if (!builder) throw new Error(`No scaffold motif defined for ${item.id}.`);
  builder(sites, need, seed, moduleIndex);
  if (sites.length !== need) throw new Error(`Motif atom budget mismatch for ${item.id}.`);
  return sites;
}
