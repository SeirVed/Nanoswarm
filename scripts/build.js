import { cp, mkdir, rm } from "node:fs/promises";

const output = new URL("../dist/", import.meta.url);
const project = new URL("../", import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("index.html", project), new URL("index.html", output));
await cp(new URL("src/", project), new URL("src/", output), { recursive: true });

console.log("NanoSwarm build complete: dist/");
