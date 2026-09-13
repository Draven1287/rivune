import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { artifactPlan, assertIdenticalTrees, findCommand, findCommandEvidence, hashFileSet, hashTree } from "../scripts/packaging-core.mjs";
import { validateProductIdentity } from "../scripts/identity-core.mjs";
import { commandFor, discoverCargoConfigs, executePackaging, isMainModule, stageVerifiedMacBundle, validateExecution } from "../scripts/package-local.mjs";

const execFile = promisify(execFileCallback);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "rivune-packaging-v4-"));
  const cwd = join(root, "project");
  const rendererRoot = join(cwd, "web");
  const hostRoot = join(cwd, "src-tauri");
  await mkdir(rendererRoot, { recursive: true });
  await mkdir(join(hostRoot, "src"), { recursive: true });
  await writeFile(join(rendererRoot, "index.html"), "accepted renderer");
  await writeNativeIconFixtures(join(hostRoot, "icons"));
  await writeFile(join(hostRoot, "tauri.conf.json"), JSON.stringify({
    productName: "Rivune", build: { frontendDist: "../web" }, app: { windows: [{ title: "Rivune" }] },
    bundle: { active: true, targets: ["dmg", "nsis", "appimage", "deb"], icon: ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"] }
  }));
  await writeFile(join(hostRoot, "Cargo.toml"), "[package]\nname='rivune'\n");
  await writeFile(join(hostRoot, "Cargo.lock"), "# accepted lock\n");
  await writeFile(join(hostRoot, "build.rs"), "fn main() {}\n");
  await writeFile(join(hostRoot, "src", "main.rs"), "fn main() {}\n");
  return { root, cwd, rendererRoot, hostRoot };
}

async function writeNativeIconFixtures(directory) {
  await mkdir(directory, { recursive: true });
  const png = Buffer.alloc(24); Buffer.from("89504e470d0a1a0a", "hex").copy(png); png.writeUInt32BE(512, 16); png.writeUInt32BE(512, 20);
  const ico = Buffer.alloc(6); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  const icns = Buffer.alloc(12); icns.write("icns", 0, "ascii"); icns.writeUInt32BE(icns.length, 4);
  await writeFile(join(directory, "icon.png"), png);
  await writeFile(join(directory, "icon.ico"), ico);
  await writeFile(join(directory, "icon.icns"), icns);
  await writeFile(join(directory, "AppIcon.icns"), icns);
}

async function toolFixture(root, name = "cargo") {
  const realBin = join(root, `real-${name}`);
  const pathBin = join(root, `path-${name}`);
  await mkdir(realBin); await mkdir(pathBin);
  const executable = join(realBin, "proxy");
  await writeFile(executable, "#!/bin/sh\ncase \"$0\" in *cargo) printf cargo ;; *hdiutil) printf hdiutil ;; *) printf proxy ;; esac\n");
  await chmod(executable, 0o755);
  const invocationPath = join(pathBin, name);
  await symlink(executable, invocationPath);
  return { executable, invocationPath, pathBin };
}

async function projectReceipt(f, platform, architecture = process.arch, env = { PATH: "" }) {
  return {
    schema: "rivune-tauri-installer-input-v4",
    kind: "accepted-project",
    status: "central-accepted-stable",
    platform,
    architecture,
    cwd: f.cwd,
    projectTreeSHA256: (await hashTree(f.cwd)).sha256,
    rendererTreeSHA256: (await hashTree(f.rendererRoot)).sha256,
    hostTreeSHA256: (await hashTree(f.hostRoot)).sha256,
    cargoConfigSHA256: (await hashFileSet(await discoverCargoConfigs(f.cwd, env))).sha256
  };
}

test("uses an explicit Mac build/review phase and resolves CARGO_TARGET_DIR", () => {
  const cwd = "/tmp/rivune";
  assert.deepEqual(commandFor({ platform: "macos", phase: "build-reviewable-app", cwd }).command, ["cargo", "tauri", "build", "--bundles", "app"]);
  assert.deepEqual(artifactPlan("windows", { cwd }).command.slice(-2), ["--bundles", "nsis"]);
  const plan = commandFor({ platform: "linux", cwd, env: { CARGO_TARGET_DIR: "build-target" } });
  assert.equal(plan.plan.targetRoot, resolve(cwd, "build-target"));
  assert.throws(() => commandFor({ platform: "macos", cwd }), /requires --phase/);
});

test("Cargo proxy discovery validates the target but invokes the symlink path", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-tool-link-"));
  const tool = await toolFixture(root, "cargo");
  const evidence = await findCommandEvidence("cargo", { platform: "linux", env: { PATH: tool.pathBin } });
  assert.equal(evidence.invocationPath, tool.invocationPath);
  assert.notEqual(evidence.resolvedPath, evidence.invocationPath);
  assert.equal(await findCommand("cargo", { platform: "linux", env: { PATH: tool.pathBin } }), tool.invocationPath);
  assert.equal((await execFile(evidence.invocationPath)).stdout, "cargo");
  assert.equal((await execFile(evidence.resolvedPath)).stdout, "proxy");
});

test("Windows discovery honors PATHEXT and case-insensitive filenames", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-pathext-"));
  await writeFile(join(root, "Cargo.CmD"), "fixture");
  assert.equal(await findCommand("cargo", { platform: "windows", env: { PATH: root, PATHEXT: ".EXE;.CMD" } }), join(root, "Cargo.CmD"));
});

test("main-module comparison uses pathToFileURL", () => {
  const path = "/tmp/Rivune package #4.mjs";
  assert.equal(isMainModule(pathToFileURL(path).href, path), true);
});

test("tree hash covers mode and rejects external symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-tree-"));
  const file = join(root, "runner");
  await writeFile(file, "same bytes"); await chmod(file, 0o644);
  const before = await hashTree(root);
  await chmod(file, 0o755);
  assert.notEqual((await hashTree(root)).sha256, before.sha256);
  await symlink("/tmp", join(root, "outside"));
  await assert.rejects(hashTree(root), /External symlink/);
});

test("product identity rejects generic names, empty icons, and all-target shorthand", async () => {
  const f = await fixture();
  await assert.rejects(validateProductIdentity(f.cwd, {
    productName: "rivune-desktop", app: { windows: [{ title: "rivune-desktop" }] }, bundle: { targets: "all", icon: [] }
  }, "[package]\nname='rivune-desktop'\n"), /productName must be Rivune/);
});

test("project execution derives build roots from cwd and rejects mutations", async () => {
  const f = await fixture();
  const tool = await toolFixture(f.root, "cargo");
  const env = { PATH: tool.pathBin };
  const receipt = await projectReceipt(f, "linux", process.arch, env);
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  const accepted = await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env }, "linux");
  assert.equal(accepted.command[0], tool.invocationPath);
  await writeFile(join(f.hostRoot, "build.rs"), "fn main() { panic!(); }\n");
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env }, "linux"), /project tree/);
});

test("external Cargo path dependencies fail closed", async () => {
  const f = await fixture();
  const tool = await toolFixture(f.root, "cargo");
  const external = join(f.root, "external-crate");
  await mkdir(external); await writeFile(join(external, "Cargo.toml"), "[package]\nname='external'\n");
  await writeFile(join(f.hostRoot, "Cargo.toml"), "[package]\nname='rivune'\n[dependencies]\nexternal={ path='../../external-crate' }\n");
  const env = { PATH: tool.pathBin };
  const receipt = await projectReceipt(f, "linux", process.arch, env);
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env }, "linux"), /External Cargo path dependency/);
});

test("src-tauri Cargo config is bound and a lockfile is required", async () => {
  const f = await fixture();
  const tool = await toolFixture(f.root, "cargo");
  const configDirectory = join(f.hostRoot, ".cargo");
  await mkdir(configDirectory); await writeFile(join(configDirectory, "config.toml"), "[build]\nrustflags=[]\n");
  const env = { PATH: tool.pathBin };
  const receipt = await projectReceipt(f, "linux", process.arch, env);
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env }, "linux");
  await rm(join(f.hostRoot, "Cargo.lock"));
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env }, "linux"), /Cargo.lock/);
});

test("Mac accepted-app execution feeds verified staging to hdiutil and never rebuilds", async () => {
  const f = await fixture();
  const tool = await toolFixture(f.root, "hdiutil");
  const app = join(f.cwd, "src-tauri", "target", "release", "bundle", "macos", "Rivune.app");
  await mkdir(join(app, "Contents", "Resources"), { recursive: true });
  await mkdir(join(app, "Contents", "MacOS"), { recursive: true });
  await writeFile(join(app, "Contents", "Info.plist"), "<plist><dict><key>CFBundleName</key><string>Rivune</string><key>CFBundleIconFile</key><string>AppIcon</string></dict></plist>");
  await writeNativeIconFixtures(join(app, "Contents", "Resources"));
  await writeFile(join(app, "Contents", "MacOS", "Rivune"), "binary");
  const stagingRoot = join(f.root, "stage"); await mkdir(stagingRoot);
  const receipt = {
    schema: "rivune-tauri-installer-input-v4", kind: "accepted-mac-app", status: "central-accepted-stable",
    platform: "macos", architecture: process.arch, macBundlePath: app,
    macBundleTreeSHA256: (await hashTree(app)).sha256, macStagingRoot: stagingRoot
  };
  const receiptPath = join(f.root, "mac-receipt.json"); await writeFile(receiptPath, JSON.stringify(receipt));
  const recordings = [];
  const validated = await executePackaging({
    platform: "macos", phase: "bundle-accepted-app", cwd: f.cwd, receipt: receiptPath,
    out: join(f.root, "Rivune.dmg"), env: { PATH: tool.pathBin }
  }, "darwin", async (command, context) => recordings.push({ command, context }));
  assert.equal(recordings.length, 1);
  assert.equal(recordings[0].command[0], tool.invocationPath);
  assert.ok(recordings[0].command.includes(stagingRoot));
  assert.equal(recordings[0].command.includes("cargo"), false);
  await assertIdenticalTrees(app, validated.macBundle.staged);
});

test("Mac staging rejects an unaccepted hash before copying", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-bad-mac-hash-"));
  const app = join(root, "Rivune.app"); const stage = join(root, "stage");
  await mkdir(join(app, "Contents", "Resources"), { recursive: true });
  await writeFile(join(app, "Contents", "Info.plist"), "<plist><dict><key>CFBundleName</key><string>Rivune</string><key>CFBundleIconFile</key><string>AppIcon</string></dict></plist>");
  await writeNativeIconFixtures(join(app, "Contents", "Resources")); await mkdir(stage);
  await assert.rejects(stageVerifiedMacBundle(app, stage, "0".repeat(64)), /accepted full-tree/);
});

test("Mac packaging refuses a staging root containing unaccepted content", async () => {
  const root = await mkdtemp(join(tmpdir(), "rivune-dirty-mac-stage-"));
  const app = join(root, "Rivune.app"); const stage = join(root, "stage");
  await mkdir(join(app, "Contents", "Resources"), { recursive: true });
  await writeFile(join(app, "Contents", "Info.plist"), "<plist><dict><key>CFBundleName</key><string>Rivune</string><key>CFBundleIconFile</key><string>AppIcon</string></dict></plist>");
  await writeNativeIconFixtures(join(app, "Contents", "Resources"));
  await mkdir(stage); await writeFile(join(stage, "unexpected.txt"), "not accepted");
  await assert.rejects(stageVerifiedMacBundle(app, stage, (await hashTree(app)).sha256), /must be empty/);
});
