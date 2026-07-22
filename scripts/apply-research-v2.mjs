import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing replacement target: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Replacement target is not unique: ${label}`);
  }
  return