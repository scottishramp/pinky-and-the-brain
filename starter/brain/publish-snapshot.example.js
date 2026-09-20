#!/usr/bin/env node
// Concatenate Tier 0 + fast_context pages into the snapshot document.
// Wire bus.setSnapshot() to Redis SET (or your store) in a real repo.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function frontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  return match ? match[1] : "";
}

function frontmatterValue(raw, name) {
  const match = frontmatter(raw).match(
    new RegExp(`^${name}:\\s*([^#\\n]+?)\\s*$`, "m"),
  );
  return match ? match[1].trim() : "";
}

function frontmatterFlag(raw, name) {
  return frontmatterValue(raw, name) === "true";
}

function collectFiles(root) {
  const files = ["AGENTS.md", "knowledge/index.md"];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.relative(root, path.join(dir, entry.name));
      if (entry.isDirectory()) {
        if (rel === path.join("knowledge", "connections")) continue;
        walk(path.join(root, rel));
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const raw = fs.readFileSync(path.join(root, rel), "utf8");
      const sensitivity = frontmatterValue(raw, "sensitivity").toLowerCase();
      if (frontmatterFlag(raw, "fast_context") && sensitivity !== "high") {
        files.push(rel);
      }
    }
  }
  const knowledgeRoot = path.join(root, "knowledge");
  if (fs.existsSync(knowledgeRoot)) walk(knowledgeRoot);
  return [...new Set(files)].filter((file) =>
    fs.existsSync(path.join(root, file)),
  );
}

function buildSnapshot(root = ".") {
  const files = collectFiles(root);
  const context = files
    .map(
      (file) =>
        `# ${file}\n\n${fs.readFileSync(path.join(root, file), "utf8")}`,
    )
    .join("\n\n---\n\n");
  return {
    schema_version: 1,
    context,
    context_hash: crypto.createHash("sha256").update(context).digest("hex"),
    context_length: context.length,
    context_files: files,
    published_at: new Date().toISOString(),
  };
}

function main() {
  const root = path.resolve(process.argv[2] || ".");
  const snapshot = buildSnapshot(root);
  const out = process.argv[3];
  const json = JSON.stringify(snapshot, null, 2);
  if (out) fs.writeFileSync(out, json);
  else console.log(json);
}

if (require.main === module) main();

module.exports = {
  buildSnapshot,
  collectFiles,
  frontmatterFlag,
  frontmatterValue,
};
