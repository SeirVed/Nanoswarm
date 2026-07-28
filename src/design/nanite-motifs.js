// Deterministic, module-specific scaffold candidates for the N0 planner.
// This is visual/proposal geometry only: it never changes the game recipe.

const TAU = Math.PI * 2;

const hash = (value) => {
  let result = value >>> 0;
  result = Math.imul(result ^ (result >>> 16), 0x7feb352d);
  result = Math.imul(result ^ (result >>> 15), 0x846ca68b);
  return (result ^ (result >>> 16)) >>> 0;
};

const rankFor = (seed, index, moduleIndex) =>
  hash((Number(seed) || 5575) + Math.imul(index + 1, 0x9e3779b1) + moduleIndex * 0x85ebca6b);

const add = (sites, point, local, seed, moduleIndex) => {
  const index = sites.length;
  sites.push({ point, local, rank: rankFor(seed, index, moduleIndex) });
};

const lerpPoint = (left, right, amount) => [
  left[0] + (right[0] - left[0]) * amount,
  left[1] + (right[1] - left[1]) * amount,
  left[2] + (right[2] - left[2]) * amount,
];

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

function tube(sites, count, path, radius, seed, moduleIndex) {
  const around = 10;
  const along = Math.max(2, Math.ceil(count / around));
  for (let index = 0; index < count; index += 1) {
    const axial = Math.floor(index / around);
    const phase = (index % around) / around * TAU + (axial & 1) * Math.PI / around;
    const fraction = axial / Math.max(1, along - 1);
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
    const point = [
      centre[0] + radius * (side[0] * Math.cos(phase) + normal[0] * Math.sin(phase)),
      centre[1] + radius * (side[1] * Math.cos(phase) + normal[1] * Math.sin(phase)),
      centre[2] + radius * (side[2] * Math.cos(phase) + normal[2] * Math.sin(phase)),
    ];
    add(sites, point, [fraction, Math.cos(phase), Math.sin(phase)], seed, moduleIndex);
  }
}

function shellTruss(sites, count, seed, moduleIndex) {
  const pieces = [
    [[0, 1.45, 0], [1, 0, 0], [0, 0, 1], 5.1, 2.25],
    [[0, -1.45, 0], [1, 0, 0], [0, 0, 1], 5.1, 2.25],
    [[0, 0, 1.15], [1, 0, 0], [0, 1, 0], 5.1, 2.9],
    [[0, 0, -1.15], [1, 0, 0], [0, 1, 0], 5.1, 2.9],
  ];
  const base = Math.floor(count / pieces.length);
  let remainder = count % pieces.length;
  for (const [origin, u, v, width, height] of pieces) {
    const allocation = base + (remainder-- > 0 ? 1 : 0);
    hexPanel(sites, allocation, origin, u, v, width, height, seed, moduleIndex);
  }
}

function anchorActuators(sites, count, seed, moduleIndex) {
  const bases = [
    [-2.05, 1.28, -0.72], [2.05, 1.28, -0.72],
    [-2.05, -1.28, -0.72], [2.05, -1.28, -0.72],
  ];
  const perAnchor = Math.floor(count / bases.length);
  let remainder = count % bases.length;
  for (const base of bases) {
    const side = Math.sign(base[0]) || 1;
    const flank = Math.sign(base[1]) || 1;
    const endpoint = [side * 3.25, flank * 2.18, -1.62];
    const knee = [side * 2.62, flank * 1.72, -1.12];
    tube(sites, perAnchor + (remainder-- > 0 ? 1 : 0), [base, knee, endpoint], 0.18, seed, moduleIndex);
  }
}

function assemblyManipulators(sites, count, seed, moduleIndex) {
  const perManipulator = Math.floor(count / 2);
  for (let index = 0; index < 2; index += 1) {
    const side = index ? 1 : -1;
    const allocation = perManipulator + (index < count % 2 ? 1 : 0);
    tube(sites, allocation, [
      [side * 2.15, 0.58, 0.42],
      [side * 2.82, 0.84, 0.08],
      [side * 3.4, 0.26, -0.32],
    ], 0.13, seed, moduleIndex);
  }
}

function intakeChannel(sites, count, seed, moduleIndex) {
  const spine = Math.floor(count * 0.65);
  tube(sites, spine, [[-1.25, -1.38, -1.18], [0, -1.65, -1.3], [1.25, -1.38, -1.18]], 0.2, seed, moduleIndex);
  hexPanel(sites, count - spine, [0, -1.47, -1.01], [1, 0, 0], [0, 0, 1], 2.3, 0.52, seed, moduleIndex);
}

function computationalSubstrate(sites, count, seed, moduleIndex) {
  const layers = 3;
  const perLayer = Math.floor(count / layers);
  for (let layer = 0; layer < layers; layer += 1) {
    hexPanel(
      sites,
      perLayer + (layer < count % layers ? 1 : 0),
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
  const perLayer = Math.floor(count / layers);
  for (let layer = 0; layer < layers; layer += 1) {
    hexPanel(
      sites,
      perLayer + (layer < count % layers ? 1 : 0),
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
