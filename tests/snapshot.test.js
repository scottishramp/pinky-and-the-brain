const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  buildSnapshot,
  frontmatterFlag,
} = require("../starter/brain/publish-snapshot.example.js");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pinky-snapshot-"));
  fs.mkdirSync(path.join(root, "knowledge", "connections"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Agent\n");
  fs.writeFileSync(path.join(root, "knowledge", "index.md"), "# Index\n");
  fs.writeFileSync(
    path.join(root, "knowledge", "included.md"),
    "---\nfast_context: true\n---\n\n# Included\n",
  );
  fs.writeFileSync(
    path.join(root, "knowledge", "excluded.md"),
    "---\nfast_context: false\n---\n\nfast_context: true\n",
  );
  fs.writeFileSync(
    path.join(root, "knowledge", "connections", "secret.md"),
    "---\nfast_context: true\n---\n\n# Connection\n",
  );
  fs.writeFileSync(
    path.join(root, "knowledge", "sensitive.md"),
    "---\nfast_context: true\nsensitivity: high\n---\n\n# Sensitive\n",
  );
  return root;
}

test("frontmatter flags are read only from frontmatter", () => {
  assert.equal(
    frontmatterFlag("---\nfast_context: false\n---\nfast_context: true\n", "fast_context"),
    false,
  );
});

test("snapshot includes selected knowledge and excludes connections", (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const snapshot = buildSnapshot(root);
  assert.equal(snapshot.schema_version, 1);
  assert.deepEqual(snapshot.context_files, [
    "AGENTS.md",
    "knowledge/index.md",
    "knowledge/included.md",
  ]);
  assert.match(snapshot.context, /# Included/);
  assert.doesNotMatch(snapshot.context, /# Connection/);
  assert.doesNotMatch(snapshot.context, /# Sensitive/);
});
