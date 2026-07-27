import { chmod, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

const output = new URL("../dist/", import.meta.url);
const project = new URL("../", import.meta.url);
const release = (process.env.GITHUB_SHA?.slice(0, 12) || "local").replace(/[^a-zA-Z0-9_-]/g, "");

async function writeReleaseHtml(sourcePath, outputPath) {
  const source = await readFile(new URL(sourcePath, project), "utf8");
  const versioned = source
    .replaceAll("./src/", `./assets/${release}/src/`)
    .replaceAll("../src/", `../assets/${release}/src/`)
    .replace("  </head>", `    <meta name="nanoswarm-build" content="${release}" />\n  </head>`);
  await writeFile(new URL(outputPath, output), versioned);
}

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
await cp(new URL("research-planner/", project), new URL("research-planner/", output), { recursive: true });
await cp(new URL("horizon-planner/", project), new URL("horizon-planner/", output), { recursive: true });
await cp(new URL("nanite-planner/", project), new URL("nanite-planner/", output), { recursive: true });
await cp(new URL("src/", project), new URL(`assets/${release}/src/`, output), { recursive: true });
await writeReleaseHtml("index.html", "index.html");
await writeReleaseHtml("research-planner/index.html", "research-planner/index.html");
await writeReleaseHtml("horizon-planner/index.html", "horizon-planner/index.html");
await writeReleaseHtml("nanite-planner/index.html", "nanite-planner/index.html");
await writeFile(new URL(".nojekyll", output), "");
await makeTreeWritable(output);

console.log(`NanoSwarm build complete: dist/ · release ${release}`);
