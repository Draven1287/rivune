import { cp, lstat, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import {
  artifactPlan,
  assertAbsolute,
  assertIdenticalTrees,
  assertMatchingHost,
  findCommand,
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
  const plan = artifactPlan(platform, options.architecture ?? process.arch);
  return { platform, cwd, plan, command: plan.command };
}

export async function loadAcceptance(path) {
  if (!path) throw new Error("An explicit --receipt is required for execution");
  const receipt = JSON.parse(await readFile(path, "utf8"));
  if (receipt.schema !== "rivune-tauri-installer-input-v2") throw new Error("Unsupported acceptance receipt schema");
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
  const rendererRoot = assertAbsolute(receipt.rendererRoot, "receipt rendererRoot");
  const hostRoot = assertAbsolute(receipt.hostRoot, "receipt hostRoot");
  const [renderer, host] = await Promise.all([hashTree(rendererRoot), hashTree(hostRoot)]);
  if (renderer.sha256 !== receipt.rendererTreeSHA256) throw new Error("Actual renderer tree does not match its accepted SHA-256");
  if (host.sha256 !== receipt.hostTreeSHA256) throw new Error("Actual host tree does not match its accepted SHA-256");
  const cargo = await findCommand("cargo", { platform, env: options.env ?? process.env });
  if (!cargo) throw new Error("cargo was not found on PATH/PATHEXT");
  return { platform, cwd, cargo, receipt, actual: { renderer, host } };
}

export async function stageVerifiedMacBundle(sourceApp, stagingRoot) {
  const source = assertAbsolute(sourceApp, "source app");
  const staging = assertAbsolute(stagingRoot, "staging root");
  if (!source.endsWith(".app")) throw new Error("source app must be a .app bundle");
  for (const required of ["Contents/Info.plist", "Contents/Resources"]) {
    const stat = await lstat(join(source, required)).catch(() => null);
    if (!stat) throw new Error(`Mac bundle is missing ${required}`);
  }
  const staged = join(staging, source.split(/[\\/]/).at(-1));
  await cp(source, staged, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
  await assertIdenticalTrees(source, staged);
  return staged;
}

async function run(command, cwd) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command[0], command.slice(1), { cwd, stdio: "inherit" });
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
  await run([validated.cargo, ...plan.command.slice(1)], validated.cwd);
  console.log(JSON.stringify({
    mode: "executed",
    platform: plan.platform,
    cwd: validated.cwd,
    rendererTreeSHA256: validated.actual.renderer.sha256,
    hostTreeSHA256: validated.actual.host.sha256,
    expectedArtifact: plan.plan.artifact
  }, null, 2));
}

if (isMainModule(import.meta.url, process.argv[1])) {
  main().catch(error => {
    console.error(`installer packaging refused: ${error.message}`);
    process.exitCode = 1;
  });
}
