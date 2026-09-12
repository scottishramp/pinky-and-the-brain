#!/usr/bin/env node
// Concatenate Tier 0 + fast_context pages into the snapshot document.
// Wire bus.setSnapshot() to Redis SET (or your store) in a real repo.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function frontmatterFlag(raw, name) {
  const match = raw.match(new RegExp(`^${name}:\\s*(true|false)\\s*$`, "m"));
  return match ? match[1] === "true" : false;
}

function collectFiles(root) {
  const files = ["AGENTS.md", "knowledge/index.md"];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const raw = fs.readFileSync(rel, "utf8");
      if (frontmatterFlag(raw, "fast_context")) files.push(rel);
    }
  }
  if (fs.existsSync("knowledge")) walk("knowledge");
  return [...new Set(files)].filter((file) => fs.existsSync(file));
}

function main() {
  const root = process.argv[2] || ".";
  process.chdir(root);
  const files = collectFiles(".");
  const context = files
    .map((file) => `# ${file}\n\n${fs.readFileSync(file, "utf8")}`)
    .join("\n\n---\n\n");
  const snapshot = {
    context,
    context_hash: crypto.createHash("sha256").update(context).digest("hex"),
    context_length: context.length,
    context_files: files,
    published_at: new Date().toISOString(),
  };
  const out = process.argv[3];
  const json = JSON.stringify(snapshot, null, 2);
  if (out) fs.writeFileSync(out, json);
  else console.log(json);
}

main();
