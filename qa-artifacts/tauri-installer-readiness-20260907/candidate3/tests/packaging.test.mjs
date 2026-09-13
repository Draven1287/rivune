import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { artifactPlan, assertIdenticalTrees, findCommand, hashFileSet, hashTree } from "../scripts/packaging-core.mjs";
import { commandFor, discoverCargoConfigs, isMainModule, stageVerifiedMacBundle, validateExecution } from "../scripts/package-local.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "rivune-packaging-v3-"));
  const cwd = join(root, "project");
  const rendererRoot = join(cwd, "web");
  const hostRoot = join(cwd, "src-tauri");
  await mkdir(rendererRoot, { recursive: true });
  await mkdir(join(hostRoot, "src"), { recursive: true });
  await writeFile(join(rendererRoot, "index.html"), "accepted renderer");
  await writeFile(join(hostRoot, "tauri.conf.json"), JSON.stringify({ build: { frontendDist: "../web" } }));
  await writeFile(join(hostRoot, "Cargo.toml"), "[package]\nname='fixture'\n");
  await writeFile(join(hostRoot, "Cargo.lock"), "# accepted lock\n");
  await writeFile(join(hostRoot, "build.rs"), "fn main() {}\n");
  await writeFile(join(hostRoot, "src", "main.rs"), "fn main() {}\n");
  return { root, cwd, rendererRoot, hostRoot };
}

async function toolFixture(root, name = "cargo") {
  const realBin = join(root, "real-bin");
  const pathBin = join(root, "path-bin");
  await mkdir(realBin); await mkdir(pathBin);
  const executable = join(realBin, name);
  await writeFile(executable, "#!/bin/sh\n");
  await chmod(executable, 0o755);
  await symlink(executable, join(pathBin, name));
  return { executable, pathBin };
}

async function receiptFor(f, platform, architecture = process.arch) {
  return {
    schema: "rivune-tauri-installer-input-v3",
    status: "central-accepted-stable",
    platform,
    architecture,
    cwd: f.cwd,
    projectTreeSHA256: (await hashTree(f.cwd)).sha256,
    rendererTreeSHA256: (await hashTree(f.rendererRoot)).sha256,
    hostTreeSHA256: (await hashTree(f.hostRoot)).sha256,
    cargoConfigSHA256: (await hashFileSet(await discoverCargoConfigs(f.cwd, { PATH: "" }))).sha256
  };
}

test("uses Tauri on all OSes, binds cwd, and resolves CARGO_TARGET_DIR in artifact paths", () => {
  const cwd = "/tmp/rivune";
  assert.deepEqual(artifactPlan("darwin", { cwd }).command, ["cargo", "tauri", "build", "--bundles", "dmg"]);
  assert.deepEqual(artifactPlan("windows", { cwd }).command.slice(-2), ["--bundles", "nsis"]);
  const plan = commandFor({ platform: "linux", cwd, env: { CARGO_TARGET_DIR: "build-target" } });
  assert.equal(plan.plan.targetRoot, resolve(cwd, "build-target"));
  assert.equal(plan.plan.artifact, join(resolve(cwd, "build-target"), "release", "bundle", "{appimage,deb}", "*"));
  assert.throws(() => commandFor({ platform: "linux" }), /--cwd/);
});

test("tool discovery follows a valid executable symlink and returns its resolved path", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-tool-link-"));
  const { executable, pathBin } = await toolFixture(root);
  assert.equal(await findCommand("cargo", { platform: "linux", env: { PATH: pathBin } }), await realpath(executable));
});

test("Windows discovery honors PATHEXT and case-insensitive filenames", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-pathext-"));
  await writeFile(join(root, "Cargo.CmD"), "fixture");
  assert.equal(await findCommand("cargo", { platform: "windows", env: { PATH: root, PATHEXT: ".EXE;.CMD" } }), await realpath(join(root, "Cargo.CmD")));
});

test("main-module comparison uses pathToFileURL for spaces and URL metacharacters", () => {
  const path = "/tmp/Rivune package #3.mjs";
  assert.equal(isMainModule(pathToFileURL(path).href, path), true);
  assert.equal(isMainModule(pathToFileURL(path).href, undefined), false);
});

test("tree hash covers executable mode and rejects external symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-tree-"));
  const file = join(root, "runner");
  await writeFile(file, "same bytes");
  await chmod(file, 0o644);
  const before = await hashTree(root);
  await chmod(file, 0o755);
  assert.notEqual((await hashTree(root)).sha256, before.sha256);
  await symlink("/tmp", join(root, "outside"));
  await assert.rejects(hashTree(root), /External symlink/);
});

test("execution derives build trees from cwd and rejects unrelated or mutated inputs", async () => {
  const f = await fixture();
  const { pathBin } = await toolFixture(f.root);
  const receipt = await receiptFor(f, "linux");
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  const accepted = await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin } }, "linux");
  assert.equal(accepted.inputs.frontendDist, f.rendererRoot);

  const unrelated = join(f.root, "unrelated");
  await mkdir(unrelated); await writeFile(join(unrelated, "index.html"), "accepted elsewhere");
  receipt.rendererRoot = unrelated;
  receipt.rendererTreeSHA256 = (await hashTree(unrelated)).sha256;
  await writeFile(receiptPath, JSON.stringify(receipt));
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin } }, "linux"), /Actual renderer tree/);

  const current = await receiptFor(f, "linux");
  await writeFile(receiptPath, JSON.stringify(current));
  await writeFile(join(f.hostRoot, "build.rs"), "fn main() { println!(\"changed\"); }\n");
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin } }, "linux"), /project tree/);
});

test("execution rejects escaped frontendDist and cosmetic architecture claims", async () => {
  const f = await fixture();
  const { pathBin } = await toolFixture(f.root);
  await writeFile(join(f.hostRoot, "tauri.conf.json"), JSON.stringify({ build: { frontendDist: "../../outside" } }));
  const receipt = await receiptFor(f, "linux", "fake-architecture");
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin }, actualArchitecture: "real-architecture" }, "linux"), /architecture/);
  receipt.architecture = "real-architecture";
  await writeFile(receiptPath, JSON.stringify(receipt));
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin }, actualArchitecture: "real-architecture" }, "linux"), /frontendDist/);
});

test("execution binds reachable parent Cargo config and requires a lockfile", async () => {
  const f = await fixture();
  const { pathBin } = await toolFixture(f.root);
  const configDirectory = join(f.root, ".cargo");
  const configPath = join(configDirectory, "config.toml");
  await mkdir(configDirectory);
  await writeFile(configPath, "[build]\nrustflags=[]\n");
  const receipt = await receiptFor(f, "linux");
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin } }, "linux");
  await writeFile(configPath, "[build]\nrustflags=['-Ctarget-cpu=native']\n");
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin } }, "linux"), /Cargo configuration/);

  await rm(join(f.hostRoot, "Cargo.lock"));
  const noLockReceipt = await receiptFor(f, "linux");
  await writeFile(receiptPath, JSON.stringify(noLockReceipt));
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin } }, "linux"), /Cargo.lock/);
});

test("Mac execution gate requires a prior full-bundle hash and verifies the staged copy", async () => {
  const f = await fixture();
  const { pathBin } = await toolFixture(f.root);
  const app = join(f.cwd, "src-tauri", "target", "release", "bundle", "macos", "Rivune.app");
  await mkdir(join(app, "Contents", "Resources"), { recursive: true });
  await mkdir(join(app, "Contents", "MacOS"), { recursive: true });
  await writeFile(join(app, "Contents", "Info.plist"), "<plist>accepted</plist>");
  await writeFile(join(app, "Contents", "Resources", "icon.icns"), "icon");
  await writeFile(join(app, "Contents", "MacOS", "Rivune"), "binary");
  await symlink("Resources", join(app, "Contents", "CurrentResources"));
  const receipt = await receiptFor(f, "macos");
  receipt.macBundlePath = app;
  receipt.macBundleTreeSHA256 = (await hashTree(app)).sha256;
  receipt.macStagingRoot = join(f.root, "stage");
  await mkdir(receipt.macStagingRoot);
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  const validated = await validateExecution({ platform: "macos", cwd: f.cwd, receipt: receiptPath, env: { PATH: pathBin } }, "darwin");
  assert.equal(validated.macBundle.sha256, receipt.macBundleTreeSHA256);
  await assertIdenticalTrees(app, validated.macBundle.staged);
});

test("Mac staging rejects an unaccepted hash before copying", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-bad-mac-hash-"));
  const app = join(root, "Rivune.app");
  const stage = join(root, "stage");
  await mkdir(join(app, "Contents", "Resources"), { recursive: true });
  await writeFile(join(app, "Contents", "Info.plist"), "plist");
  await mkdir(stage);
  await assert.rejects(stageVerifiedMacBundle(app, stage, "0".repeat(64)), /accepted full-tree/);
});
