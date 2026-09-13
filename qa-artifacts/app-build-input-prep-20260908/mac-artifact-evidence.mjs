import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const MAX_CAPTURE_BYTES = 1024 * 1024;
const POLICY_SCHEMA = "rivune-mac-artifact-validation-v1";
const SIGNATURE_POLICY = "native-review-bundle-seal-v1";
const VERSION = /^[0-9]+(?:\.[0-9]+)*$/;
const COLLECTION_TOOLS = {
  plutil: "/usr/bin/plutil",
  file: "/usr/bin/file",
  vtool: "/usr/bin/vtool",
  codesign: "/usr/bin/codesign",
};

function requiredString(value, label) {
  if (typeof value !== "string" || !value) throw new Error(label + " is required");
  return value;
}

function requiredAbsolute(value, label) {
  requiredString(value, label);
  if (!isAbsolute(value)) throw new Error(label + " must be absolute");
  return resolve(value);
}

function requiredHash(value, label) {
  if (!/^[a-f0-9]{64}$/i.test(value || "")) throw new Error(label + " must be a SHA-256");
  return value.toLowerCase();
}

async function sha256(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

async function requireFresh(path, label) {
  if (await lstat(path).catch(() => null)) throw new Error(label + " must not already exist");
  const parent = await lstat(dirname(path)).catch(() => null);
  if (!parent?.isDirectory() || parent.isSymbolicLink()) throw new Error(label + " parent must be a real directory");
}

async function requireBundleEntry(path, kind, label) {
  const entry = await lstat(path).catch(() => null);
  const valid = kind === "directory" ? entry?.isDirectory() : entry?.isFile();
  if (!valid || entry.isSymbolicLink()) throw new Error(label + " is missing, wrong type, or a symlink");
}

export function deriveMacArtifactPolicy(tauriConfig, productIdentity, receipt) {
  const binding = receipt?.macArtifactValidation;
  if (!binding || binding.schema !== POLICY_SCHEMA) throw new Error("accepted receipt lacks macArtifactValidation v1");
  if (binding.signaturePolicy !== SIGNATURE_POLICY) throw new Error("signature policy is not accepted");
  const configuredMinimum = tauriConfig?.bundle?.macOS?.minimumSystemVersion;
  if (!VERSION.test(configuredMinimum || "")) {
    throw new Error("Tauri config does not bind bundle.macOS.minimumSystemVersion");
  }
  if (configuredMinimum !== binding.minimumMacOS) throw new Error("receipt minimum macOS does not match Tauri config");
  const architecture = requiredString(receipt.architecture, "receipt architecture");
  if (!["arm64", "x86_64"].includes(architecture)) throw new Error("unsupported Mac architecture policy");
  const executableName = requiredString(productIdentity?.binaryName, "product binary name");
  const version = requiredString(tauriConfig?.version, "Tauri version");
  const outputRoot = requiredAbsolute(binding.outputRoot, "artifact evidence output root");
  const evidencePath = requiredAbsolute(binding.evidencePath, "evidence path");
  const reportPath = requiredAbsolute(binding.reportPath, "report path");
  if (dirname(evidencePath) !== outputRoot || dirname(reportPath) !== outputRoot || evidencePath === reportPath) {
    throw new Error("evidence and report must be distinct direct children of outputRoot");
  }
  const toolSHA256 = {};
  for (const name of Object.keys(COLLECTION_TOOLS)) {
    toolSHA256[name] = requiredHash(binding.toolSHA256?.[name], name + " SHA-256");
  }
  return {
    schema: POLICY_SCHEMA,
    signaturePolicy: SIGNATURE_POLICY,
    executableName,
    expected: {
      bundle_identifier: requiredString(tauriConfig?.identifier, "Tauri identifier"),
      short_version: version,
      bundle_version: version,
      minimum_macos: configuredMinimum,
      architectures: [architecture],
    },
    validatorPath: requiredAbsolute(binding.validatorPath, "validator path"),
    validatorSHA256: requiredHash(binding.validatorSHA256, "validator SHA-256"),
    safeHelperPath: requiredAbsolute(binding.safeHelperPath, "safe helper path"),
    safeHelperSHA256: requiredHash(binding.safeHelperSHA256, "safe helper SHA-256"),
    pythonPath: requiredAbsolute(binding.pythonPath, "Python path"),
    pythonSHA256: requiredHash(binding.pythonSHA256, "Python SHA-256"),
    toolSHA256,
    outputRoot,
    evidencePath,
    reportPath,
  };
}

export function artifactCommands(appPath, policy) {
  const app = requiredAbsolute(appPath, "app path");
  if (!app.endsWith(".app")) throw new Error("app path must end in .app");
  const plist = join(app, "Contents", "Info.plist");
  const executable = join(app, "Contents", "MacOS", policy.executableName);
  return {
    app,
    plist,
    executable,
    plutil: [COLLECTION_TOOLS.plutil, "-convert", "json", "-o", "-", plist],
    file: [COLLECTION_TOOLS.file, "--brief", executable],
    vtool: [COLLECTION_TOOLS.vtool, "-show-build", executable],
    codesign_display: [COLLECTION_TOOLS.codesign, "-d", "--verbose=4", app],
    codesign_verify: [COLLECTION_TOOLS.codesign, "--verify", "--deep", "--strict", "--verbose=4", app],
  };
}

export async function runRecord(command, { cwd, env, input } = {}) {
  if (!Array.isArray(command) || !command.length || !command.every(value => typeof value === "string")) {
    throw new Error("command must be an argument vector");
  }
  return await new Promise(resolvePromise => {
    const child = spawn(command[0], command.slice(1), { cwd, env, shell: false, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), truncated = false, settled = false;
    const append = (current, chunk) => {
      const combined = Buffer.concat([current, chunk]);
      if (combined.length <= MAX_CAPTURE_BYTES) return combined;
      truncated = true;
      return combined.subarray(0, MAX_CAPTURE_BYTES);
    };
    child.stdout.on("data", chunk => { stdout = append(stdout, chunk); });
    child.stderr.on("data", chunk => { stderr = append(stderr, chunk); });
    if (input !== undefined) child.stdin.end(input);
    child.once("error", error => {
      if (settled) return;
      settled = true;
      resolvePromise({ status: "unavailable", exit_code: null, stdout: stdout.toString("utf8"), stderr: error.message, truncated });
    });
    child.once("exit", code => {
      if (settled) return;
      settled = true;
      resolvePromise({ status: code === 0 ? "ok" : "error", exit_code: code, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), truncated });
    });
  });
}

export async function collectMacArtifactEvidence({ appPath, policy, runner = runRecord, env = process.env }) {
  const commands = artifactCommands(appPath, policy);
  await requireBundleEntry(commands.app, "directory", "app bundle");
  await requireBundleEntry(commands.plist, "file", "Info.plist");
  await requireBundleEntry(commands.executable, "file", "bundle executable");
  const records = {};
  for (const name of ["plutil", "file", "vtool", "codesign_display", "codesign_verify"]) {
    records[name] = await runner(commands[name], { cwd: dirname(commands.app), env });
  }
  let infoPlist = null;
  if (records.plutil.status === "ok" && records.plutil.exit_code === 0 && records.plutil.truncated !== true) {
    try {
      infoPlist = JSON.parse(records.plutil.stdout);
    } catch {
      infoPlist = null;
    }
  }
  const evidence = {
    artifact: commands.app,
    executable_name: policy.executableName,
    info_plist: infoPlist,
    expected: policy.expected,
    collection: {
      schema: "rivune-mac-artifact-evidence-v1",
      commands,
      signature_policy: policy.signaturePolicy,
    },
    tools: records,
  };
  return evidence;
}

function safeHelperCommand(policy, sourceRoot, checkOnly = false) {
  const command = [
    policy.pythonPath,
    policy.safeHelperPath,
    "--source-root", requiredAbsolute(sourceRoot, "accepted source root"),
    "--output-root", policy.outputRoot,
    "--evidence-name", basename(policy.evidencePath),
    "--report-name", basename(policy.reportPath),
    "--python", policy.pythonPath,
    "--validator", policy.validatorPath,
    "--validator-sha256", policy.validatorSHA256,
  ];
  if (checkOnly) command.push("--check-only");
  return command;
}

export async function preflightMacArtifactValidation(policy, sourceRoot, runner = runRecord, env = process.env) {
  await requireBundleEntry(policy.validatorPath, "file", "validator");
  await requireBundleEntry(policy.safeHelperPath, "file", "safe artifact I/O helper");
  await requireBundleEntry(policy.pythonPath, "file", "Python executable");
  if (await sha256(policy.validatorPath) !== policy.validatorSHA256) throw new Error("validator SHA-256 does not match");
  if (await sha256(policy.safeHelperPath) !== policy.safeHelperSHA256) throw new Error("safe helper SHA-256 does not match");
  if (await sha256(policy.pythonPath) !== policy.pythonSHA256) throw new Error("Python SHA-256 does not match");
  for (const [name, path] of Object.entries(COLLECTION_TOOLS)) {
    await requireBundleEntry(path, "file", name + " tool");
    if (await sha256(path) !== policy.toolSHA256[name]) throw new Error(name + " SHA-256 does not match");
  }
  await requireFresh(policy.evidencePath, "evidence output");
  await requireFresh(policy.reportPath, "validator report output");
  const command = safeHelperCommand(policy, sourceRoot, true);
  const execution = await runner(command, { cwd: dirname(policy.safeHelperPath), env, input: "" });
  if (execution.status !== "ok" || execution.exit_code !== 0 || execution.truncated === true) {
    throw new Error("safe artifact output preflight refused");
  }
  const result = JSON.parse(execution.stdout);
  if (result.status !== "safe" || result.writes !== 0) throw new Error("safe artifact output preflight was not write-free");
  return { validatorPath: policy.validatorPath, validatorSHA256: policy.validatorSHA256, outputRoot: policy.outputRoot, command };
}

export async function validateMacArtifactEvidence({ policy, evidence, sourceRoot, runner = runRecord, env = process.env }) {
  const command = safeHelperCommand(policy, sourceRoot, false);
  const execution = await runner(command, { cwd: dirname(policy.safeHelperPath), env, input: JSON.stringify(evidence) });
  const summary = execution.stdout ? JSON.parse(execution.stdout) : null;
  if (execution.status !== "ok" || execution.exit_code !== 0 || execution.truncated === true) {
    throw new Error("artifact validator did not qualify the bundle");
  }
  const report = summary?.report;
  if (summary?.status !== "qualified" || report?.qualified_for_native_review !== true || report?.distribution_ready !== false) {
    throw new Error("artifact validator report is not a bound native-review qualification");
  }
  return { command, execution, report, evidenceSHA256: summary.evidence_sha256, reportSHA256: summary.report_sha256 };
}

export async function collectAndValidateMacArtifact(options) {
  await preflightMacArtifactValidation(options.policy, options.sourceRoot, options.ioRunner, options.env);
  const evidence = await collectMacArtifactEvidence(options);
  const validation = await validateMacArtifactEvidence({ ...options, evidence, runner: options.ioRunner });
  return { evidence, validation };
}
