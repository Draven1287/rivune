import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAcknowledgement, parseSnapshot } from "../web/core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const workspace = resolve(here, "../../../..");
const cargo = resolve(workspace, ".toolchains/cargo/bin/cargo");
const result = spawnSync(cargo, ["run", "--locked", "--offline", "--quiet", "--example", "wire_fixture"], {
  cwd: resolve(here, "../src-tauri"), encoding: "utf8",
  env: { ...process.env, CARGO_HOME: resolve(workspace, ".toolchains/cargo"), RUSTUP_HOME: resolve(workspace, ".toolchains/rustup"), CARGO_TARGET_DIR: resolve(workspace, ".toolchains/target-candidate4-r2") },
});
assert.equal(result.status, 0, result.stderr);
const wire = JSON.parse(result.stdout);
assert.equal(parseSnapshot(wire.snapshot).runs[0].conversationID, "conversation-1");
assert.equal(parseAcknowledgement(wire.acknowledgement, "request-2").state, "accepted");
assert.equal(wire.decodedSubmitConversationID, "conversation-1");
assert.equal(wire.decodedRetrySourceRunID, "request-1");
assert.equal(wire.decodedProviderPath, "/fixture/claude");
assert.equal(wire.decodedProviderTimeoutMs, 120000);
console.log(JSON.stringify({ rustToJS: "pass", jsToRust: "pass" }));
