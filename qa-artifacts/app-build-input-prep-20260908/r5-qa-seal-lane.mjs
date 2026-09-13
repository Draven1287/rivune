import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { hashTree } from "../tauri-r2-integration-review-20260907/r3-integration/executor-v2-workspace/scripts/packaging-core.mjs";
import { stageVerifiedMacBundle } from "./next-executor-proposal/scripts/package-local.mjs";
import { collectAndValidateMacArtifact, deriveMacArtifactPolicy } from "./next-executor-proposal/scripts/mac-artifact-evidence.mjs";

const SCHEMA = "rivune-r5-staged-qa-seal-v1";

function parseArgs(argv) {
  const options = { execute: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--execute") options.execute = true;
    else if (token.startsWith("--")) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
      options[token.slice(2)] = value;
    } else throw new Error(`Unexpected argument: ${token}`);
  }
  return options;
}

async function loadPlan(path) {
  if (!path) throw new Error("--plan is required");
  const plan = JSON.parse(await readFile(resolve(path), "utf8"));
  if (plan.schema !== SCHEMA) throw new Error("Unsupported staged QA seal schema");
  return plan;
}

function requireStatus(plan, expected) {
  if (plan.status !== expected) throw new Error(`Plan status must be ${expected}`);
}

export async function stageAcceptedCopy(plan) {
  requireStatus(plan, "central-accepted-stage-release");
  const staged = await stageVerifiedMacBundle(plan.sourceApp, plan.stagingRoot, plan.sourceTreeSHA256);
  if (staged.staged !== resolve(plan.stagedApp)) throw new Error("Staged app path does not match the accepted plan");
  return staged;
}

export async function qualifySealedCopy(plan) {
  requireStatus(plan, "central-accepted-qualification-release");
  if (!/^[a-f0-9]{64}$/i.test(plan.sealedTreeSHA256 || "")) throw new Error("Accepted sealed tree SHA-256 is required");
  const actual = await hashTree(resolve(plan.stagedApp));
  if (actual.sha256 !== plan.sealedTreeSHA256) throw new Error("Staged sealed app tree does not match acceptance");
  const tauriConfig = JSON.parse(await readFile(resolve(plan.tauriConfigPath), "utf8"));
  const policy = deriveMacArtifactPolicy(tauriConfig, { binaryName: plan.executableName }, plan);
  const qualification = await collectAndValidateMacArtifact({
    appPath: resolve(plan.stagedApp),
    sourceRoot: resolve(plan.sourceRoot),
    policy
  });
  return { actual, qualification };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plan = await loadPlan(options.plan);
  if (!options.execute) {
    console.log(JSON.stringify({ status: "review-only", phase: options.phase, planStatus: plan.status }, null, 2));
    return;
  }
  if (options.phase === "stage") console.log(JSON.stringify(await stageAcceptedCopy(plan), null, 2));
  else if (options.phase === "qualify") console.log(JSON.stringify(await qualifySealedCopy(plan), null, 2));
  else throw new Error("--phase must be stage or qualify");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
