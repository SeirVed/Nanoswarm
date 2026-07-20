import { chmod, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";

const output = new URL("../dist/", import.meta.url);
const project = new URL("../", import.meta.url);

async function makeTreeWritable(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      if (entry.isDirectory()) await makeTreeWritable(child);
      else await chmod(child, 0o666);
    }
    await chmod(directory, 0o777);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await makeTreeWritable(output);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("index.html", project), new URL("index.html", output));
await cp(new URL("research-planner/", project), new URL("research-planner/", output), { recursive: true });
await cp(new URL("src/", project), new URL("src/", output), { recursive: true });
await writeFile(new URL(".nojekyll", output), "");
await makeTreeWritable(output);

console.log("NanoSwarm build complete: dist/");
