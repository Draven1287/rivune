import { cp, lstat, readFile, readdir, realpath } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { validateNativeIcon, validateProductIdentity } from "./identity-core.mjs";
import {
  artifactPlan,
  assertAbsolute,
  assertIdenticalTrees,
  assertMatchingHost,
  findCommandEvidence,
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
  if (platform === "macos") {
    if (options.phase === "build-reviewable-app") {
      return { platform, phase: options.phase, cwd, plan, command: ["cargo", "tauri", "build", "--bundles", "app", "--", "--locked", "--offline"] };
    }
    if (options.phase === "bundle-accepted-app") {
      const stagingRoot = assertAbsolute(options.stagingRoot, "--staging-root");
      const output = assertAbsolute(options.out, "--out");
      return {
        platform, phase: options.phase, cwd, plan,
        command: ["hdiutil", "create", "-volname", "Rivune", "-srcfolder", stagingRoot, "-ov", "-format", "UDZO", output]
      };
    }
    throw new Error("macOS requires --phase build-reviewable-app or bundle-accepted-app");
  }
  if (options.phase && options.phase !== "package") throw new Error(`${platform} supports only --phase package`);
  return { platform, phase: "package", cwd, plan, command: plan.command };
}

export async function loadAcceptance(path) {
  if (!path) throw new Error("An explicit --receipt is required for execution");
  const receipt = JSON.parse(await readFile(path, "utf8"));
  if (receipt.schema !== "rivune-tauri-installer-input-v5") throw new Error("Unsupported acceptance receipt schema");
  if (receipt.status !== "central-accepted-stable") throw new Error("Input is not central-accepted-stable");
  return receipt;
}

export async function validateExecution(options, actualOS = process.platform) {
  const platform = normalizePlatform(options.platform ?? actualOS);
  assertMatchingHost(platform, actualOS);
  const cwd = assertAbsolute(options.cwd, "--cwd");
  const actualArchitecture = options.actualArchitecture ?? process.arch;
  const receipt = await loadAcceptance(options.receipt);
  if (receipt.platform !== platform) throw new Error("Acceptance platform does not match");
  if (receipt.architecture !== actualArchitecture) throw new Error("Acceptance architecture does not match the build host");

  if (platform === "macos" && options.phase === "bundle-accepted-app") {
    if (receipt.kind !== "accepted-mac-app") throw new Error("Mac bundling requires an accepted-mac-app receipt");
    const plan = artifactPlan(platform, { cwd, architecture: actualArchitecture, env: options.env ?? process.env });
    const source = assertAbsolute(receipt.macBundlePath, "receipt macBundlePath");
    const expectedParent = join(plan.targetRoot, "release", "bundle", "macos");
    if (!inside(expectedParent, source) || !source.endsWith(".app")) {
      throw new Error("Accepted Mac bundle must be a .app in the effective Tauri macos bundle directory");
    }
    const stagingRoot = assertAbsolute(receipt.macStagingRoot, "receipt macStagingRoot");
    if (inside(cwd, stagingRoot)) throw new Error("Mac staging root must be outside the accepted cwd");
    const macBundle = await stageVerifiedMacBundle(source, stagingRoot, receipt.macBundleTreeSHA256);
    const tool = await findCommandEvidence("hdiutil", { platform, env: options.env ?? process.env });
    if (!tool) throw new Error("hdiutil was not found on PATH");
    const exact = commandFor({ ...options, stagingRoot, out: options.out });
    return { platform, phase: options.phase, cwd, receipt, macBundle, tool, command: [tool.invocationPath, ...exact.command.slice(1)] };
  }

  if (receipt.kind !== "accepted-project") throw new Error("Tauri build/package requires an accepted-project receipt");
  const acceptedCwd = assertAbsolute(receipt.cwd, "receipt cwd");
  if (acceptedCwd !== cwd) throw new Error("Acceptance cwd does not match --cwd");
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
  const cargoManifestText = await readFile(cargoManifestPath, "utf8");
  const productIdentity = await validateProductIdentity(cwd, tauriConfig, cargoManifestText);
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
  const tool = await findCommandEvidence("cargo", { platform, env: options.env ?? process.env });
  if (!tool) throw new Error("cargo was not found on PATH/PATHEXT");
  const metadataCommand = [tool.invocationPath, "metadata", "--locked", "--offline", "--format-version", "1", "--manifest-path", cargoManifestPath];
  const metadataRunner = options.metadataRunner ?? runCapture;
  const metadata = await metadataRunner(metadataCommand, { cwd, env: offlineEnv(options.env ?? process.env) });
  const externalLocalDependencies = await collectExternalLocalDependencies(metadata, cwd, cargoManifestPath);
  await assertAcceptedDependencySet(externalLocalDependencies, receipt.externalLocalDependencies);
  const exact = commandFor(options);
  return {
    platform, phase: exact.phase, cwd, receipt, tool, command: [tool.invocationPath, ...exact.command.slice(1)],
    inputs: { tauriConfigPath, cargoManifestPath, rustBuildScriptPath, cargoLockPath, cargoConfigPaths, frontendDist: rendererRoot, productIdentity, metadataCommand, externalLocalDependencies },
    actual: { project, renderer, host, cargoConfig }
  };
}

export async function discoverCargoConfigs(cwd, env = process.env) {
  const candidates = [join(cwd, "src-tauri", ".cargo", "config.toml"), join(cwd, "src-tauri", ".cargo", "config")];
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

export async function collectExternalLocalDependencies(metadataValue, cwd, rootManifestPath) {
  const metadata = typeof metadataValue === "string" ? JSON.parse(metadataValue) : metadataValue;
  if (!metadata || !Array.isArray(metadata.packages)) throw new Error("Cargo metadata returned no package graph");
  const physicalCwd = await realpath(cwd);
  const physicalRootManifest = await realpath(rootManifestPath);
  const roots = new Set();
  let includedRoot = false;
  for (const pkg of metadata.packages) {
    if (pkg.source != null || typeof pkg.manifest_path !== "string") continue;
    const manifest = await realpath(pkg.manifest_path).catch(() => null);
    if (!manifest) throw new Error(`Cargo metadata local manifest is missing: ${pkg.manifest_path}`);
    if (manifest === physicalRootManifest) includedRoot = true;
    const root = dirname(manifest);
    if (!inside(physicalCwd, root)) roots.add(root);
  }
  if (!includedRoot) throw new Error("Cargo metadata did not include the accepted root manifest");
  const evidence = [];
  for (const root of [...roots].sort()) evidence.push(await hashTree(root));
  return evidence.map(({ root, sha256 }) => ({ root, sha256 }));
}

async function assertAcceptedDependencySet(actual, accepted) {
  if (!Array.isArray(accepted)) throw new Error("Receipt must bind externalLocalDependencies");
  const normalize = async entries => (await Promise.all(entries.map(async entry => ({ root: await realpath(resolve(entry.root)), sha256: entry.sha256 })))).sort((a, b) => a.root.localeCompare(b.root));
  if (JSON.stringify(await normalize(actual)) !== JSON.stringify(await normalize(accepted))) {
    throw new Error("Actual transitive external local Cargo dependencies do not match acceptance");
  }
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
  const stagingEntry = await lstat(staging).catch(() => null);
  if (!stagingEntry?.isDirectory() || stagingEntry.isSymbolicLink()) throw new Error("staging root must be a real directory");
  if ((await readdir(staging)).length !== 0) throw new Error("staging root must be empty before accepted bundle copy");
  for (const required of ["Contents/Info.plist", "Contents/Resources"]) {
    if (!(await lstat(join(source, required)).catch(() => null))) throw new Error(`Mac bundle is missing ${required}`);
  }
  const plist = await readFile(join(source, "Contents", "Info.plist"), "utf8");
  if (!/<key>CFBundle(?:DisplayName|Name)<\/key>\s*<string>Rivune<\/string>/.test(plist)) {
    throw new Error("Accepted Mac bundle Info.plist must identify Rivune");
  }
  const iconName = plist.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
  if (!iconName) throw new Error("Accepted Mac bundle Info.plist must name its icon");
  const iconPath = join(source, "Contents", "Resources", iconName.endsWith(".icns") ? iconName : `${iconName}.icns`);
  await validateNativeIcon(iconPath);
  const accepted = await hashTree(source);
  if (accepted.sha256 !== acceptedSHA256) throw new Error("Actual Mac bundle does not match its accepted full-tree SHA-256");
  const staged = join(staging, basename(source));
  await cp(source, staged, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
  await assertIdenticalTrees(source, staged);
  if ((await hashTree(staged)).sha256 !== acceptedSHA256) throw new Error("Staged Mac bundle hash does not match acceptance");
  if ((await readdir(staging)).some(name => name !== basename(source))) throw new Error("Unaccepted entry appeared in Mac staging root");
  return { source, staged, stagingRoot: staging, sha256: acceptedSHA256 };
}

async function run(command, { cwd, env }) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command[0], command.slice(1), { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolvePromise() : reject(new Error(`${command[0]} exited ${code}`)));
  });
}

async function runCapture(command, { cwd, env }) {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command[0], command.slice(1), { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; }); child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolvePromise(stdout) : reject(new Error(`cargo metadata exited ${code}: ${stderr.trim()}`)));
  });
}

function offlineEnv(env) {
  return { ...env, CARGO_NET_OFFLINE: "true" };
}

export async function executePackaging(options, actualOS = process.platform, runner = run) {
  const validated = await validateExecution(options, actualOS);
  await runner(validated.command, { cwd: validated.cwd, env: offlineEnv(options.env ?? process.env) });
  return validated;
}

export function isMainModule(metaURL, argvPath) {
  return Boolean(argvPath) && metaURL === pathToFileURL(resolve(argvPath)).href;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.execute) {
    console.log(JSON.stringify({ mode: "plan-only", ...commandFor(options), gate: "--execute requires filesystem-bound v4 acceptance" }, null, 2));
    return;
  }
  const validated = await executePackaging(options);
  console.log(JSON.stringify({
    mode: "executed", platform: validated.platform, phase: validated.phase, cwd: validated.cwd,
    tool: validated.tool, acceptedMacBundleSHA256: validated.macBundle?.sha256 ?? null
  }, null, 2));
}

if (isMainModule(import.meta.url, process.argv[1])) {
  main().catch(error => {
    console.error(`installer packaging refused: ${error.message}`);
    process.exitCode = 1;
  });
}
