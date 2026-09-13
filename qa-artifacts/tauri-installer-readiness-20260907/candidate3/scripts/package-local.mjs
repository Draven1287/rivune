import { cp, lstat, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import {
  artifactPlan,
  assertAbsolute,
  assertIdenticalTrees,
  assertMatchingHost,
  findCommand,
  hashFileSet,
  hashTree,
  normalizePlatform
} from "./packaging-core.mjs";

export function parseArgs(argv) {
  const values = { execute: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--execute") values.execute = true;
    else if (token.startsWith("--")) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
      values[token.slice(2)] = value;
    } else throw new Error(`Unexpected argument: ${token}`);
  }
  return values;
}

export function commandFor(options = {}) {
  const platform = normalizePlatform(options.platform ?? process.platform);
  const cwd = assertAbsolute(options.cwd, "--cwd");
  const plan = artifactPlan(platform, { cwd, env: options.env ?? process.env });
  return { platform, cwd, plan, command: plan.command };
}

export async function loadAcceptance(path) {
  if (!path) throw new Error("An explicit --receipt is required for execution");
  const receipt = JSON.parse(await readFile(path, "utf8"));
  if (receipt.schema !== "rivune-tauri-installer-input-v3") throw new Error("Unsupported acceptance receipt schema");
  if (receipt.status !== "central-accepted-stable") throw new Error("Input is not central-accepted-stable");
  return receipt;
}

export async function validateExecution(options, actualOS = process.platform) {
  const platform = normalizePlatform(options.platform ?? actualOS);
  assertMatchingHost(platform, actualOS);
  const receipt = await loadAcceptance(options.receipt);
  if (receipt.platform !== platform) throw new Error("Acceptance platform does not match");
  const cwd = assertAbsolute(options.cwd, "--cwd");
  const acceptedCwd = assertAbsolute(receipt.cwd, "receipt cwd");
  if (acceptedCwd !== cwd) throw new Error("Acceptance cwd does not match --cwd");
  const actualArchitecture = options.actualArchitecture ?? process.arch;
  if (receipt.architecture !== actualArchitecture) throw new Error("Acceptance architecture does not match the build host");
  const tauriConfigPath = join(cwd, "src-tauri", "tauri.conf.json");
  const cargoManifestPath = join(cwd, "src-tauri", "Cargo.toml");
  const rustBuildScriptPath = join(cwd, "src-tauri", "build.rs");
  for (const required of [tauriConfigPath, cargoManifestPath, rustBuildScriptPath]) {
    if (!(await lstat(required).catch(() => null))?.isFile()) throw new Error(`Required Tauri build input is missing: ${required}`);
  }
  const lockCandidates = [join(cwd, "Cargo.lock"), join(cwd, "src-tauri", "Cargo.lock")];
  const cargoLockPath = (await Promise.all(lockCandidates.map(async path => (await lstat(path).catch(() => null))?.isFile() ? path : null))).find(Boolean);
  if (!cargoLockPath) throw new Error("A cwd-reachable Cargo.lock is required");
  const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8"));
  const frontendDist = tauriConfig?.build?.frontendDist;
  if (typeof frontendDist !== "string" || !frontendDist) throw new Error("Tauri build.frontendDist must name a local tree");
  const rendererRoot = resolve(join(cwd, "src-tauri"), frontendDist);
  const hostRoot = join(cwd, "src-tauri");
  if (!inside(cwd, rendererRoot)) throw new Error("Tauri frontendDist must remain inside the accepted cwd");
  if (!(await lstat(rendererRoot).catch(() => null))?.isDirectory()) throw new Error("Tauri frontendDist is not a directory");
  const cargoConfigPaths = await discoverCargoConfigs(cwd, options.env ?? process.env);
  const [project, renderer, host, cargoConfig] = await Promise.all([
    hashTree(cwd), hashTree(rendererRoot), hashTree(hostRoot), hashFileSet(cargoConfigPaths)
  ]);
  if (project.sha256 !== receipt.projectTreeSHA256) throw new Error("Actual cwd project tree does not match its accepted SHA-256");
  if (renderer.sha256 !== receipt.rendererTreeSHA256) throw new Error("Actual renderer tree does not match its accepted SHA-256");
  if (host.sha256 !== receipt.hostTreeSHA256) throw new Error("Actual host tree does not match its accepted SHA-256");
  if (cargoConfig.sha256 !== receipt.cargoConfigSHA256) throw new Error("Actual reachable Cargo configuration does not match its accepted SHA-256");
  const cargo = await findCommand("cargo", { platform, env: options.env ?? process.env });
  if (!cargo) throw new Error("cargo was not found on PATH/PATHEXT");
  let macBundle = null;
  if (platform === "macos") {
    const plan = artifactPlan(platform, { cwd, architecture: actualArchitecture, env: options.env ?? process.env });
    const source = assertAbsolute(receipt.macBundlePath, "receipt macBundlePath");
    const expectedParent = join(plan.targetRoot, "release", "bundle", "macos");
    if (!inside(expectedParent, source) || !source.endsWith(".app")) {
      throw new Error("Accepted Mac bundle must be a .app in the effective Tauri macos bundle directory");
    }
    const stagingRoot = assertAbsolute(receipt.macStagingRoot, "receipt macStagingRoot");
    if (inside(cwd, stagingRoot)) throw new Error("Mac staging root must be outside the accepted cwd");
    macBundle = await stageVerifiedMacBundle(source, receipt.macStagingRoot, receipt.macBundleTreeSHA256);
  }
  return {
    platform, cwd, cargo, receipt, macBundle,
    inputs: { tauriConfigPath, cargoManifestPath, rustBuildScriptPath, cargoLockPath, cargoConfigPaths, frontendDist: rendererRoot },
    actual: { project, renderer, host, cargoConfig }
  };
}

export async function discoverCargoConfigs(cwd, env = process.env) {
  const candidates = [];
  let directory = assertAbsolute(cwd, "cargo config cwd");
  while (true) {
    candidates.push(join(directory, ".cargo", "config.toml"), join(directory, ".cargo", "config"));
    const parent = resolve(directory, "..");
    if (parent === directory) break;
    directory = parent;
  }
  const cargoHome = env.CARGO_HOME || (env.HOME ? join(env.HOME, ".cargo") : null);
  if (cargoHome) candidates.push(join(cargoHome, "config.toml"), join(cargoHome, "config"));
  const existing = [];
  for (const path of candidates) {
    const entry = await lstat(path).catch(() => null);
    if (entry?.isFile() || entry?.isSymbolicLink()) existing.push(path);
  }
  return [...new Set(existing.map(path => resolve(path)))].sort();
}

function inside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export async function stageVerifiedMacBundle(sourceApp, stagingRoot, acceptedSHA256) {
  const source = assertAbsolute(sourceApp, "source app");
  const staging = assertAbsolute(stagingRoot, "staging root");
  if (!source.endsWith(".app")) throw new Error("source app must be a .app bundle");
  if (!/^[a-f0-9]{64}$/i.test(acceptedSHA256 || "")) throw new Error("An accepted full-bundle SHA-256 is required");
  for (const required of ["Contents/Info.plist", "Contents/Resources"]) {
    const stat = await lstat(join(source, required)).catch(() => null);
    if (!stat) throw new Error(`Mac bundle is missing ${required}`);
  }
  const accepted = await hashTree(source);
  if (accepted.sha256 !== acceptedSHA256) throw new Error("Actual Mac bundle does not match its accepted full-tree SHA-256");
  const staged = join(staging, source.split(/[\\/]/).at(-1));
  await cp(source, staged, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
  await assertIdenticalTrees(source, staged);
  if ((await hashTree(staged)).sha256 !== acceptedSHA256) throw new Error("Staged Mac bundle hash does not match acceptance");
  return { source, staged, sha256: acceptedSHA256 };
}

async function run(command, cwd, env) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command[0], command.slice(1), { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolvePromise() : reject(new Error(`${command[0]} exited ${code}`)));
  });
}

export function isMainModule(metaURL, argvPath) {
  return Boolean(argvPath) && metaURL === pathToFileURL(resolve(argvPath)).href;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plan = commandFor(options);
  if (!options.execute) {
    console.log(JSON.stringify({ mode: "plan-only", ...plan, gate: "--execute requires filesystem-bound v2 acceptance" }, null, 2));
    return;
  }
  const validated = await validateExecution(options);
  await run([validated.cargo, ...plan.command.slice(1)], validated.cwd, process.env);
  console.log(JSON.stringify({
    mode: "executed",
    platform: plan.platform,
    cwd: validated.cwd,
    projectTreeSHA256: validated.actual.project.sha256,
    rendererTreeSHA256: validated.actual.renderer.sha256,
    hostTreeSHA256: validated.actual.host.sha256,
    cargoConfigSHA256: validated.actual.cargoConfig.sha256,
    expectedArtifact: plan.plan.artifact
  }, null, 2));
}

if (isMainModule(import.meta.url, process.argv[1])) {
  main().catch(error => {
    console.error(`installer packaging refused: ${error.message}`);
    process.exitCode = 1;
  });
}
