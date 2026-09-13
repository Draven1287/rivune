import { readFile, realpath } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import process from "node:process";

import { hashFileSet, hashTree, sha256File } from "./packaging-core.mjs";
import {
  collectExternalLocalDependencies,
  discoverCargoConfigs
} from "./package-local.mjs";

const workspace = "/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI";
const cwd = join(workspace, "qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2");
const cargoHome = join(workspace, ".toolchains/cargo");
const rustupHome = join(workspace, ".toolchains/rustup");
const target = join(workspace, ".toolchains/target-candidate4-r2");
const sdk = "/Applications/Xcode-beta.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX27.0.sdk";
const cargo = join(cargoHome, "bin/cargo");
const cliReceipt = join(workspace, ".toolchains/tauri-cli/INSTALL_RECEIPT.json");
const manifestPath = join(cwd, "src-tauri/Cargo.toml");
const buildEnvironment = {
  CARGO_HOME: cargoHome,
  RUSTUP_HOME: rustupHome,
  CARGO_TARGET_DIR: target,
  SDKROOT: sdk,
  PATH: `/Users/Aaravshah/.local/bin:${cargoHome}/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
  CARGO_NET_OFFLINE: "true"
};

function runCapture(command, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", code => code === 0
      ? resolvePromise(stdout)
      : reject(new Error(`metadata exited ${code}: ${stderr.trim()}`)));
  });
}

const metadataCommand = [
  cargo,
  "metadata",
  "--locked",
  "--offline",
  "--format-version",
  "1",
  "--manifest-path",
  manifestPath,
  "--features",
  "custom-protocol",
  "--filter-platform",
  "aarch64-apple-darwin"
];

const metadata = await runCapture(metadataCommand, { cwd, env: buildEnvironment });
const metadataJSON = JSON.parse(metadata);
if (resolve(metadataJSON.target_directory) !== target) {
  throw new Error(`metadata target mismatch: ${metadataJSON.target_directory}`);
}

const rendererRoot = join(cwd, "web");
const hostRoot = join(cwd, "src-tauri");
const cargoConfigPaths = await discoverCargoConfigs(cwd, buildEnvironment);
const [project, renderer, host, cargoConfig, externalLocalDependencies] = await Promise.all([
  hashTree(cwd),
  hashTree(rendererRoot),
  hashTree(hostRoot),
  hashFileSet(cargoConfigPaths),
  collectExternalLocalDependencies(metadataJSON, cwd, manifestPath)
]);

const receipt = {
  schema: "rivune-tauri-installer-input-v5",
  status: "central-accepted-stable",
  kind: "accepted-project",
  platform: "macos",
  architecture: "arm64",
  cwd: await realpath(cwd),
  projectTreeSHA256: project.sha256,
  rendererTreeSHA256: renderer.sha256,
  hostTreeSHA256: host.sha256,
  cargoConfigSHA256: cargoConfig.sha256,
  cargoConfigPaths,
  externalLocalDependencies,
  buildEnvironment,
  metadataFeatures: ["custom-protocol"],
  metadataFilterPlatform: "aarch64-apple-darwin",
  sourceInputs: {
    tauriConfigSHA256: await sha256File(join(cwd, "src-tauri/tauri.conf.json")),
    cargoManifestSHA256: await sha256File(manifestPath),
    rustBuildScriptSHA256: await sha256File(join(cwd, "src-tauri/build.rs")),
    cargoLockSHA256: await sha256File(join(cwd, "src-tauri/Cargo.lock"))
  },
  toolchain: {
    tauriCliReceiptPath: cliReceipt,
    tauriCliReceiptSHA256: await sha256File(cliReceipt),
    cargoPath: cargo,
    cargoSHA256: await sha256File(cargo),
    cargoTargetDir: target
  },
  metadataEvidence: {
    command: metadataCommand,
    targetDirectory: metadataJSON.target_directory,
    packageCount: metadataJSON.packages.length,
    workspaceMemberCount: metadataJSON.workspace_members.length,
    rootManifest: manifestPath
  },
  scope: "validation input only; no compilation, launch, installation, packaging, signing, notarization, deletion, or publication"
};

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
