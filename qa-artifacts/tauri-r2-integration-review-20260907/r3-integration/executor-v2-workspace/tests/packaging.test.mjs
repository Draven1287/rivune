import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { artifactPlan, assertIdenticalTrees, findCommand, findCommandEvidence, hashFileSet, hashTree, sha256File } from "../scripts/packaging-core.mjs";
import { validateNativeIcon, validateProductIdentity } from "../scripts/identity-core.mjs";
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
  await writeFile(join(hostRoot, "Cargo.toml"), "[package]\nname='rivune-desktop'\n[[bin]]\nname='rivune'\npath='src/main.rs'\n");
  await writeFile(join(hostRoot, "Cargo.lock"), "# accepted lock\n");
  await writeFile(join(hostRoot, "build.rs"), "fn main() {}\n");
  await writeFile(join(hostRoot, "src", "main.rs"), "fn main() {}\n");
  return { root, cwd, rendererRoot, hostRoot };
}

async function writeNativeIconFixtures(directory) {
  await mkdir(directory, { recursive: true });
  const approved = new URL("../icons/", import.meta.url);
  await copyFile(new URL("icon.png", approved), join(directory, "icon.png"));
  await copyFile(new URL("icon.ico", approved), join(directory, "icon.ico"));
  await copyFile(new URL("icon.icns", approved), join(directory, "icon.icns"));
  await copyFile(new URL("icon.icns", approved), join(directory, "AppIcon.icns"));
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

async function projectReceipt(f, platform, architecture = process.arch, env = { PATH: "" }, externalRoots = []) {
  return {
    schema: "rivune-tauri-installer-input-v5",
    kind: "accepted-project",
    status: "central-accepted-stable",
    platform,
    architecture,
    cwd: f.cwd,
    projectTreeSHA256: (await hashTree(f.cwd)).sha256,
    rendererTreeSHA256: (await hashTree(f.rendererRoot)).sha256,
    hostTreeSHA256: (await hashTree(f.hostRoot)).sha256,
    cargoConfigSHA256: (await hashFileSet(await discoverCargoConfigs(f.cwd, env))).sha256,
    externalLocalDependencies: await Promise.all(externalRoots.map(async root => ({ root: resolve(root), sha256: (await hashTree(root)).sha256 })))
  };
}

function metadataRunnerFor(f, extraManifests = []) {
  return async (command, context) => {
    assert.deepEqual(command.slice(1, 6), ["metadata", "--locked", "--offline", "--format-version", "1"]);
    assert.equal(context.env.CARGO_NET_OFFLINE, "true");
    return {
      packages: [
        {
          source: null,
          name: "rivune-desktop",
          manifest_path: join(f.hostRoot, "Cargo.toml"),
          targets: [{ name: "rivune", kind: ["bin"], crate_types: ["bin"], src_path: join(f.hostRoot, "src", "main.rs") }]
        },
        ...extraManifests.map(manifest_path => ({ source: null, manifest_path }))
      ]
    };
  };
}

async function macBuildContext(f) {
  const toolchainRoot = join(f.root, "tauri-cli");
  const cliPath = join(toolchainRoot, "node_modules", "@tauri-apps", "cli", "tauri.js");
  const mainPath = join(toolchainRoot, "node_modules", "@tauri-apps", "cli", "main.js");
  const nativePath = join(toolchainRoot, "node_modules", "@tauri-apps", "cli-darwin-arm64", "cli.darwin-arm64.node");
  const executableLink = join(toolchainRoot, "node_modules", ".bin", "tauri");
  const cargoPath = join(f.root, "cargo-home", "bin", "cargo");
  const targetRoot = join(f.root, "shared-target");
  await mkdir(join(cliPath, ".."), { recursive: true });
  await mkdir(join(nativePath, ".."), { recursive: true });
  await mkdir(join(executableLink, ".."), { recursive: true });
  await mkdir(join(cargoPath, ".."), { recursive: true });
  await writeFile(cliPath, "#!/bin/sh\nexit 0\n"); await chmod(cliPath, 0o755);
  await writeFile(mainPath, "module.exports = {};\n");
  await symlink("../@tauri-apps/cli/tauri.js", executableLink);
  await writeFile(nativePath, "accepted native binding");
  await writeFile(cargoPath, "#!/bin/sh\nexit 0\n"); await chmod(cargoPath, 0o755);
  const toolReceiptPath = join(toolchainRoot, "INSTALL_RECEIPT.json");
  await writeFile(toolReceiptPath, JSON.stringify({
    schema: "rivune-workspace-tauri-cli-v1",
    cliVersion: "tauri-cli 2.11.4",
    executable: "node_modules/.bin/tauri",
    executableSymlinkTarget: "../@tauri-apps/cli/tauri.js",
    files: {
      "node_modules/@tauri-apps/cli/tauri.js": await sha256File(cliPath),
      "node_modules/@tauri-apps/cli/main.js": await sha256File(mainPath),
      "node_modules/@tauri-apps/cli-darwin-arm64/cli.darwin-arm64.node": await sha256File(nativePath)
    }
  }));
  const env = {
    PATH: `${join(f.root, "cargo-home", "bin")}:/usr/bin:/bin:/usr/sbin:/sbin`,
    CARGO_HOME: join(f.root, "cargo-home"),
    RUSTUP_HOME: join(f.root, "rustup-home"),
    CARGO_TARGET_DIR: targetRoot,
    SDKROOT: "/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk",
    CARGO_NET_OFFLINE: "true"
  };
  const receipt = await projectReceipt(f, "macos", "arm64", env);
  Object.assign(receipt, {
    buildEnvironment: env,
    metadataFeatures: ["custom-protocol"],
    metadataFilterPlatform: "aarch64-apple-darwin",
    sourceInputs: {
      tauriConfigSHA256: await sha256File(join(f.hostRoot, "tauri.conf.json")),
      cargoManifestSHA256: await sha256File(join(f.hostRoot, "Cargo.toml")),
      rustBuildScriptSHA256: await sha256File(join(f.hostRoot, "build.rs")),
      cargoLockSHA256: await sha256File(join(f.hostRoot, "Cargo.lock"))
    },
    toolchain: {
      tauriCliReceiptPath: toolReceiptPath,
      tauriCliReceiptSHA256: await sha256File(toolReceiptPath),
      cargoPath,
      cargoSHA256: await sha256File(cargoPath),
      cargoTargetDir: targetRoot
    }
  });
  const receiptPath = join(f.root, "accepted-project.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  return { cliPath: executableLink, wrapperPath: cliPath, mainPath, nativePath, cargoPath, targetRoot, toolReceiptPath, env, receipt, receiptPath };
}

test("uses an explicit Mac build/review phase and resolves CARGO_TARGET_DIR", () => {
  const cwd = "/tmp/rivune";
  assert.deepEqual(commandFor({ platform: "macos", phase: "build-reviewable-app", cwd, tauriCliPath: "/tools/tauri", cargoPath: "/tools/cargo" }).command,
    ["/tools/tauri", "build", "--runner", "/tools/cargo", "--features", "custom-protocol", "--bundles", "app", "--", "--locked", "--offline"]);
  assert.deepEqual(artifactPlan("windows", { cwd }).command.slice(3, 5), ["--bundles", "nsis"]);
  const plan = commandFor({ platform: "linux", cwd, env: { CARGO_TARGET_DIR: "build-target" } });
  assert.equal(plan.plan.targetRoot, resolve(cwd, "build-target"));
  assert.throws(() => commandFor({ platform: "macos", cwd }), /requires --phase/);
});

test("Mac app-only validation emits pinned CLI, Cargo runner, feature, target metadata and fresh output", async () => {
  const f = await fixture();
  const c = await macBuildContext(f);
  const metadataRunner = async (command, context) => {
    assert.deepEqual(command.slice(-4), ["--features", "custom-protocol", "--filter-platform", "aarch64-apple-darwin"]);
    assert.equal(context.env.CARGO_NET_OFFLINE, "true");
    return { packages: [{ source: null, name: "rivune-desktop", manifest_path: join(f.hostRoot, "Cargo.toml"),
      targets: [{ name: "rivune", kind: ["bin"], crate_types: ["bin"], src_path: join(f.hostRoot, "src", "main.rs") }] }] };
  };
  const accepted = await validateExecution({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env: c.env, actualArchitecture: "arm64", metadataRunner }, "darwin");
  assert.deepEqual(accepted.command, [c.cliPath, "build", "--runner", c.cargoPath, "--features", "custom-protocol", "--bundles", "app", "--", "--locked", "--offline"]);
  assert.equal(accepted.inputs.expectedOutput, join(c.targetRoot, "release", "bundle", "macos", "Rivune.app"));
});

test("Mac app-only validation rejects a changed pinned CLI payload", async () => {
  const f = await fixture(); const c = await macBuildContext(f);
  await writeFile(c.cliPath, "changed CLI payload");
  await assert.rejects(validateExecution({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env: c.env, actualArchitecture: "arm64", metadataRunner: metadataRunnerFor(f) }, "darwin"), /executable SHA-256/);
});

test("Mac app-only validation rejects a changed CLI main module", async () => {
  const f = await fixture(); const c = await macBuildContext(f);
  await writeFile(c.mainPath, "changed main module");
  await assert.rejects(validateExecution({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env: c.env, actualArchitecture: "arm64", metadataRunner: metadataRunnerFor(f) }, "darwin"), /main module SHA-256/);
});

test("Mac app-only validation rejects the wrong CLI receipt hash", async () => {
  const f = await fixture(); const c = await macBuildContext(f);
  c.receipt.toolchain.tauriCliReceiptSHA256 = "0".repeat(64);
  await writeFile(c.receiptPath, JSON.stringify(c.receipt));
  await assert.rejects(validateExecution({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env: c.env, actualArchitecture: "arm64", metadataRunner: metadataRunnerFor(f) }, "darwin"), /CLI receipt SHA-256/);
});

test("Mac app-only validation rejects a target outside the accepted shared target", async () => {
  const f = await fixture(); const c = await macBuildContext(f);
  const env = { ...c.env, CARGO_TARGET_DIR: join(f.root, "wrong-target") };
  await assert.rejects(validateExecution({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env, actualArchitecture: "arm64", metadataRunner: metadataRunnerFor(f) }, "darwin"), /CARGO_TARGET_DIR/);
});

test("Mac app-only validation rejects an unbound source receipt", async () => {
  const f = await fixture(); const c = await macBuildContext(f);
  c.receipt.sourceInputs.cargoLockSHA256 = "0".repeat(64);
  await writeFile(c.receiptPath, JSON.stringify(c.receipt));
  await assert.rejects(validateExecution({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env: c.env, actualArchitecture: "arm64", metadataRunner: metadataRunnerFor(f) }, "darwin"), /Cargo.lock SHA-256/);
});

test("Mac app-only validation refuses an existing app output", async () => {
  const f = await fixture(); const c = await macBuildContext(f);
  await mkdir(join(c.targetRoot, "release", "bundle", "macos", "Rivune.app"), { recursive: true });
  await assert.rejects(validateExecution({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env: c.env, actualArchitecture: "arm64", metadataRunner: metadataRunnerFor(f) }, "darwin"), /output must be fresh/);
});

test("Mac metadata and build runner strip inherited Rust, Cargo, Node and signing overrides", async () => {
  const f = await fixture(); const c = await macBuildContext(f);
  const overrides = {
    RUSTFLAGS: "-C target-cpu=native", RUSTC_WRAPPER: "/tmp/unaccepted-wrapper",
    CARGO_BUILD_TARGET: "x86_64-apple-darwin", NODE_OPTIONS: "--require=/tmp/unaccepted.js",
    TAURI_SIGNING_PRIVATE_KEY: "unaccepted", APPLE_SIGNING_IDENTITY: "unaccepted", DYLD_INSERT_LIBRARIES: "/tmp/unaccepted.dylib"
  };
  const assertSanitized = environment => {
    for (const key of Object.keys(overrides)) assert.equal(Object.hasOwn(environment, key), false, `${key} was not sanitized`);
    assert.equal(environment.CARGO_TARGET_DIR, c.targetRoot);
    assert.equal(environment.CARGO_NET_OFFLINE, "true");
  };
  const metadataRunner = async (_command, context) => {
    assertSanitized(context.env);
    return { packages: [{ source: null, name: "rivune-desktop", manifest_path: join(f.hostRoot, "Cargo.toml"),
      targets: [{ name: "rivune", kind: ["bin"], crate_types: ["bin"], src_path: join(f.hostRoot, "src", "main.rs") }] }] };
  };
  let buildRuns = 0;
  await executePackaging({ platform: "macos", phase: "build-reviewable-app", cwd: f.cwd,
    receipt: c.receiptPath, env: { ...c.env, ...overrides }, actualArchitecture: "arm64", metadataRunner }, "darwin",
  async (_command, context) => { buildRuns += 1; assertSanitized(context.env); });
  assert.equal(buildRuns, 1);
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
  }, "[package]\nname='rivune-desktop'\n[[bin]]\nname='rivune-desktop'\n"), /productName must be Rivune/);
});

test("product identity requires explicit rivune binary and real icon payloads", async () => {
  const f = await fixture();
  const config = {
    productName: "Rivune", app: { windows: [{ title: "Rivune" }] },
    bundle: { targets: ["dmg", "nsis", "appimage", "deb"], icon: ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"] }
  };
  await assert.rejects(validateProductIdentity(f.cwd, config, "[package]\nname='rivune'\n"), /explicit \[\[bin\]\]/);
  const fake = join(f.root, "header-only.ico");
  const bytes = Buffer.alloc(6); bytes.writeUInt16LE(1, 2); bytes.writeUInt16LE(1, 4); await writeFile(fake, bytes);
  await assert.rejects(validateNativeIcon(fake), /Invalid Windows ICO|invalid image entry/);
});

test("product identity accepts canonical rivune-desktop through its exact metadata-resolved rivune binary", async () => {
  const f = await fixture();
  const config = JSON.parse(await readFile(join(f.hostRoot, "tauri.conf.json"), "utf8"));
  const manifest = await readFile(join(f.hostRoot, "Cargo.toml"), "utf8");
  const metadata = {
    packages: [{
      source: null,
      name: "rivune-desktop",
      manifest_path: join(f.hostRoot, "Cargo.toml"),
      targets: [{ name: "rivune", kind: ["bin"], crate_types: ["bin"], src_path: join(f.hostRoot, "src", "main.rs") }]
    }]
  };
  const identity = await validateProductIdentity(f.cwd, config, manifest, metadata);
  assert.equal(identity.packageName, "rivune-desktop");
  assert.equal(identity.binaryName, "rivune");
  assert.equal(identity.binarySource, join(f.hostRoot, "src", "main.rs"));
  assert.equal(identity.binaryEvidence, "cargo-metadata");
});

test("product identity rejects absent, ambiguous, substring, and mismatched metadata binaries", async () => {
  const f = await fixture();
  const config = JSON.parse(await readFile(join(f.hostRoot, "tauri.conf.json"), "utf8"));
  const manifest = await readFile(join(f.hostRoot, "Cargo.toml"), "utf8");
  const root = targets => ({ packages: [{ source: null, name: "rivune-desktop",
    manifest_path: join(f.hostRoot, "Cargo.toml"), targets }] });
  const target = (name = "rivune", path = join(f.hostRoot, "src", "main.rs")) =>
    ({ name, kind: ["bin"], crate_types: ["bin"], src_path: path });
  await assert.rejects(validateProductIdentity(f.cwd, config, manifest, root([])), /exactly one product binary/);
  await assert.rejects(validateProductIdentity(f.cwd, config, manifest, root([target(), target("helper")])), /exactly one product binary/);
  await assert.rejects(validateProductIdentity(f.cwd, config, manifest, root([target("rivune-helper")])), /named exactly rivune/);
  await assert.rejects(validateProductIdentity(f.cwd, config, manifest, root([target("rivune", join(f.hostRoot, "src", "other.rs"))])), /src-tauri\/src\/main\.rs/);
  await assert.rejects(validateProductIdentity(f.cwd, config, manifest,
    { packages: [{ ...root([target()]).packages[0], name: "rivune" }] }), /package name does not match/);
  await assert.rejects(validateProductIdentity(f.cwd, config,
    "[package]\nname='rivune-desktop'\n[[bin]]\nname='my-rivune-helper'\npath='src/main.rs'\n"), /named exactly rivune/);
  await assert.rejects(validateProductIdentity(f.cwd, config,
    "[package]\nname='rivune-desktop'\n[[bin]]\nname='rivune'\npath='src/other.rs'\n"), /path must be exactly src\/main\.rs/);
});

test("project execution derives build roots from cwd and rejects mutations", async () => {
  const f = await fixture();
  const tool = await toolFixture(f.root, "cargo");
  const env = { PATH: tool.pathBin };
  const receipt = await projectReceipt(f, "linux", process.arch, env);
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  const metadataRunner = metadataRunnerFor(f);
  const accepted = await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env, metadataRunner }, "linux");
  assert.equal(accepted.command[0], tool.invocationPath);
  await writeFile(join(f.hostRoot, "build.rs"), "fn main() { panic!(); }\n");
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env, metadataRunner }, "linux"), /project tree/);
});

test("Cargo metadata binds transitive external local dependencies and rejects mutation", async () => {
  const f = await fixture();
  const tool = await toolFixture(f.root, "cargo");
  const external = join(f.root, "external-crate");
  await mkdir(external); await writeFile(join(external, "Cargo.toml"), "[package]\nname='external'\n");
  await writeFile(join(f.hostRoot, "Cargo.toml"), "[package]\nname='rivune-desktop'\n[[bin]]\nname='rivune'\npath='src/main.rs'\n[dependencies]\nexternal={ path='../../external-crate' }\n");
  const env = { PATH: tool.pathBin };
  const externalManifest = join(external, "Cargo.toml");
  const receipt = await projectReceipt(f, "linux", process.arch, env, [external]);
  const receiptPath = join(f.root, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  const metadataRunner = metadataRunnerFor(f, [externalManifest]);
  const accepted = await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env, metadataRunner }, "linux");
  assert.equal(accepted.inputs.externalLocalDependencies[0].root, await realpath(external));
  await writeFile(externalManifest, "[package]\nname='mutated'\n");
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env, metadataRunner }, "linux"), /external local Cargo dependencies/);
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
  const metadataRunner = metadataRunnerFor(f);
  await validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env, metadataRunner }, "linux");
  await rm(join(f.hostRoot, "Cargo.lock"));
  await assert.rejects(validateExecution({ platform: "linux", cwd: f.cwd, receipt: receiptPath, env, metadataRunner }, "linux"), /Cargo.lock/);
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
    schema: "rivune-tauri-installer-input-v5", kind: "accepted-mac-app", status: "central-accepted-stable",
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
