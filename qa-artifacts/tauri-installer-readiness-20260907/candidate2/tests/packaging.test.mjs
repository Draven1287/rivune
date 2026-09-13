import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { artifactPlan, assertIdenticalTrees, findCommand, hashTree } from "../scripts/packaging-core.mjs";
import { commandFor, isMainModule, stageVerifiedMacBundle, validateExecution } from "../scripts/package-local.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "rivune-packaging-v2-"));
  const cwd = join(root, "project");
  const rendererRoot = join(cwd, "web");
  const hostRoot = join(cwd, "src-tauri");
  await mkdir(rendererRoot, { recursive: true });
  await mkdir(hostRoot, { recursive: true });
  await writeFile(join(rendererRoot, "index.html"), "accepted renderer");
  await writeFile(join(hostRoot, "main.rs"), "accepted host");
  return { root, cwd, rendererRoot, hostRoot };
}

test("uses Tauri packaging on all three OS plans and records explicit cwd", () => {
  assert.deepEqual(artifactPlan("darwin").command, ["cargo", "tauri", "build", "--bundles", "dmg"]);
  assert.deepEqual(artifactPlan("windows").command.slice(-2), ["--bundles", "nsis"]);
  assert.deepEqual(artifactPlan("linux").command.slice(-2), ["--bundles", "appimage,deb"]);
  assert.equal(commandFor({ platform: "linux", cwd: "/tmp/rivune" }).cwd, "/tmp/rivune");
  assert.throws(() => commandFor({ platform: "linux" }), /--cwd must be an absolute path/);
});

test("Windows command discovery honors PATH separators, PATHEXT, and case-insensitive filenames", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-pathext-"));
  const first = join(root, "empty");
  const second = join(root, "tools");
  await mkdir(first); await mkdir(second);
  await writeFile(join(second, "Cargo.ExE"), "fixture");
  assert.equal(await findCommand("cargo", {
    platform: "windows",
    env: { PATH: `${first};${second}`, PATHEXT: ".COM;.EXE;.CMD" }
  }), join(second, "Cargo.ExE"));
  assert.equal(await findCommand("missing", { platform: "windows", env: { PATH: second, PATHEXT: ".EXE" } }), null);
});

test("main-module comparison uses pathToFileURL safely for spaces and URL metacharacters", () => {
  const path = "/tmp/Rivune package #2.mjs";
  assert.equal(isMainModule(pathToFileURL(path).href, path), true);
  assert.equal(isMainModule(pathToFileURL(path).href, undefined), false);
});

test("tree hash changes for content, inventory, and symlink-target changes", async () => {
  const { rendererRoot } = await fixture();
  await symlink("index.html", join(rendererRoot, "current"));
  const first = await hashTree(rendererRoot);
  await writeFile(join(rendererRoot, "index.html"), "changed renderer");
  assert.notEqual((await hashTree(rendererRoot)).sha256, first.sha256);
  await writeFile(join(rendererRoot, "extra.css"), "x");
  assert.notEqual((await hashTree(rendererRoot)).sha256, first.sha256);
});

test("execution acceptance hashes the actual renderer and host trees and rejects later mutation", async () => {
  const f = await fixture();
  const bin = join(f.root, "bin");
  await mkdir(bin);
  await writeFile(join(bin, "cargo"), "#!/bin/sh\n");
  await chmod(join(bin, "cargo"), 0o755);
  const receiptPath = join(f.root, "receipt.json");
  const receipt = {
    schema: "rivune-tauri-installer-input-v2",
    status: "central-accepted-stable",
    platform: "linux",
    cwd: f.cwd,
    rendererRoot: f.rendererRoot,
    rendererTreeSHA256: (await hashTree(f.rendererRoot)).sha256,
    hostRoot: f.hostRoot,
    hostTreeSHA256: (await hashTree(f.hostRoot)).sha256
  };
  await writeFile(receiptPath, JSON.stringify(receipt));
  const accepted = await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: bin } }, "linux");
  assert.equal(accepted.actual.renderer.sha256, receipt.rendererTreeSHA256);
  await writeFile(join(f.hostRoot, "main.rs"), "mutated after acceptance");
  await assert.rejects(
    validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: bin } }, "linux"),
    /Actual host tree/
  );
});

test("Mac staged-copy identity covers Info.plist, Resources, files, and symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-mac-bundle-"));
  const app = join(root, "Rivune.app");
  await mkdir(join(app, "Contents", "Resources"), { recursive: true });
  await mkdir(join(app, "Contents", "MacOS"), { recursive: true });
  await writeFile(join(app, "Contents", "Info.plist"), "<plist>fixture</plist>");
  await writeFile(join(app, "Contents", "Resources", "icon.icns"), "icon");
  await writeFile(join(app, "Contents", "MacOS", "Rivune"), "binary");
  await symlink("../Resources", join(app, "Contents", "CurrentResources"));
  const stage = join(root, "stage");
  await mkdir(stage);
  const staged = await stageVerifiedMacBundle(app, stage);
  await assertIdenticalTrees(app, staged);
  await writeFile(join(staged, "Contents", "Resources", "icon.icns"), "changed");
  await assert.rejects(assertIdenticalTrees(app, staged), /does not exactly match/);
});

test("Mac bundle staging refuses incomplete bundles", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-bad-mac-bundle-"));
  const app = join(root, "Rivune.app");
  const stage = join(root, "stage");
  await mkdir(join(app, "Contents"), { recursive: true });
  await mkdir(stage);
  await assert.rejects(stageVerifiedMacBundle(app, stage), /Info.plist/);
});
