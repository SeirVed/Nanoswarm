const key = (x, y, z) => `${x}|${y}|${z}`;

export function analyseNaniteTopology(model, cutoffNm = 0.34) {
  const cells = new Map(); const pairs = []; const degree = new Uint8Array(model.count); const limits = [4, 4, 6, 2]; const cell = cutoffNm;
  for (let index = 0; index < model.count; index += 1) {
    const x = Math.floor(model.position[index * 3] / cell); const y = Math.floor(model.position[index * 3 + 1] / cell); const z = Math.floor(model.position[index * 3 + 2] / cell);
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) for (const other of cells.get(key(x + dx, y + dy, z + dz)) ?? []) {
      const ax = model.position[index * 3] - model.position[other * 3]; const ay = model.position[index * 3 + 1] - model.position[other * 3 + 1]; const az = model.position[index * 3 + 2] - model.position[other * 3 + 2]; const distance = Math.hypot(ax, ay, az);
      if (distance >= 0.14 && distance <= cutoffNm && degree[other] < limits[model.element[other]] && degree[index] < limits[model.element[index]] && pairs.length < 16000) { pairs.push(other, index); degree[other] += 1; degree[index] += 1; }
    }
    const bucket = cells.get(key(x, y, z)) ?? []; bucket.push(index); cells.set(key(x, y, z), bucket);
  }
  const isolated = [...degree].filter((value) => value === 0).length;
  const overCoordinated = [...degree].filter((value) => value > 6).length;
  return { pairs: Uint32Array.from(pairs), degree, isolated, overCoordinated, bondCount: pairs.length / 2, cutoffNm };
}
