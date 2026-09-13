import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  artifactCommands,
  collectAndValidateMacArtifact,
  deriveMacArtifactPolicy,
  runRecord,
} from "./mac-artifact-evidence.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const VALIDATOR = join(ROOT, "mac-artifact-metadata-validator-20260908", "validate_mac_artifact.py");
const SAFE_HELPER = join(import.meta.dirname, "safe-artifact-io.py");
const PYTHON = "/usr/bin/python3";

async function digest(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function fixture(options = {}) {
  const root = await mkdtemp(join(tmpdir(), "rivune-artifact-input-"));
  const sourceRoot = join(root, "source");
  const outputRoot = join(root, "receipts");
  const app = join(sourceRoot, "Rivune.app");
  await mkdir(join(app, "Contents", "MacOS"), { recursive: true });
  await mkdir(outputRoot);
  await writeFile(join(app, "Contents", "Info.plist"), "recorded by plutil stub");
  if (!options.missingExecutable) await writeFile(join(app, "Contents", "MacOS", "rivune"), "not executed");
  const evidencePath = join(outputRoot, "evidence.json");
  const reportPath = join(outputRoot, "report.json");
  const config = {
    productName: "Rivune",
    version: "0.0.1",
    identifier: "com.rivune.desktop.development",
    bundle: { macOS: { minimumSystemVersion: "11.0" } },
  };
  const receipt = {
    architecture: "arm64",
    macArtifactValidation: {
      schema: "rivune-mac-artifact-validation-v1",
      signaturePolicy: "native-review-bundle-seal-v1",
      minimumMacOS: "11.0",
      validatorPath: VALIDATOR,
      validatorSHA256: await digest(VALIDATOR),
      safeHelperPath: SAFE_HELPER,
      safeHelperSHA256: await digest(SAFE_HELPER),
      pythonPath: PYTHON,
      pythonSHA256: await digest(PYTHON),
      toolSHA256: {
        plutil: await digest("/usr/bin/plutil"),
        file: await digest("/usr/bin/file"),
        vtool: await digest("/usr/bin/vtool"),
        codesign: await digest("/usr/bin/codesign"),
      },
      outputRoot,
      evidencePath,
      reportPath,
    },
  };
  const policy = deriveMacArtifactPolicy(config, { binaryName: "rivune" }, receipt);
  return { root, sourceRoot, outputRoot, app, config, receipt, policy };
}

function validRecord(stdout = "", stderr = "") {
  return { status: "ok", exit_code: 0, stdout, stderr, truncated: false };
}

function stubRunner(policy, overrides = {}, commands = []) {
  return async (command, context) => {
    commands.push(command);
    if (command[0] === policy.pythonPath) {
      if (overrides.validatorFailure) return { status: "error", exit_code: 70, stdout: "", stderr: "validator unavailable", truncated: false };
      return runRecord(command, context);
    }
    const name = command[0].split("/").at(-1);
    if (overrides[name]) return overrides[name];
    if (name === "plutil") return validRecord(JSON.stringify({
      CFBundleExecutable: overrides.plistExecutable || "rivune",
      CFBundleIdentifier: "com.rivune.desktop.development",
      CFBundleShortVersionString: "0.0.1",
      CFBundleVersion: "0.0.1",
      LSMinimumSystemVersion: "11.0",
      LSRequiresCarbon: false,
    }));
    if (name === "file") return validRecord("Mach-O 64-bit executable arm64\n");
    if (name === "vtool") return validRecord("Load command 9\n      cmd LC_BUILD_VERSION\n platform MACOS\n    minos 11.0\n      sdk 27.0\n");
    if (name === "codesign" && command.includes("-d")) return validRecord("", "Executable=/fixture/rivune\nIdentifier=com.rivune.desktop.development\nFormat=app bundle with Mach-O thin (arm64)\nCodeDirectory flags=0x2(adhoc)\nTeamIdentifier=not set\nSealed Resources version=2 rules=13 files=8\nInfo.plist entries=24\n");
    if (name === "codesign") return validRecord();
    throw new Error("unexpected command");
  };
}

test("current source config and proposed receipt bind the selected development floor", async () => {
  const current = JSON.parse(await readFile(join(ROOT, "cross-platform-shell-20260907", "candidate4-runtime-r2", "src-tauri", "tauri.conf.json")));
  const sample = await fixture();
  const policy = deriveMacArtifactPolicy(current, { binaryName: "rivune" }, sample.receipt);
  assert.equal(policy.expected.minimum_macos, "11.0");
  assert.deepEqual(policy.expected.architectures, ["arm64"]);
});

test("argument plan is fixed and contains no shell fragments", async () => {
  const sample = await fixture();
  const commands = artifactCommands(sample.app, sample.policy);
  assert.deepEqual(commands.plutil.slice(0, 5), ["/usr/bin/plutil", "-convert", "json", "-o", "-"]);
  assert.deepEqual(commands.file.slice(0, 2), ["/usr/bin/file", "--brief"]);
  assert.deepEqual(commands.vtool.slice(0, 2), ["/usr/bin/vtool", "-show-build"]);
  assert.deepEqual(commands.codesign_display.slice(0, 3), ["/usr/bin/codesign", "-d", "--verbose=4"]);
  for (const command of Object.values(commands).filter(Array.isArray)) {
    assert(command.every(value => typeof value === "string"));
    assert(!command.includes("sh") && !command.includes("-c"));
  }
});

test("complete matching stub evidence qualifies for native review only", async () => {
  const sample = await fixture();
  const commands = [];
  const result = await collectAndValidateMacArtifact({
    appPath: sample.app,
    sourceRoot: sample.sourceRoot,
    policy: sample.policy,
    runner: stubRunner(sample.policy, {}, commands),
  });
  assert.equal(result.validation.report.qualified_for_native_review, true);
  assert.equal(result.validation.report.distribution_ready, false);
  assert(result.validation.report.findings.some(finding => finding.code === "plist.legacy_carbon_present" && finding.severity === "warning"));
  assert.equal(commands.at(-1)[0], "/usr/bin/codesign");
});

test("missing executable blocks before collector commands", async () => {
  const sample = await fixture({ missingExecutable: true });
  let calls = 0;
  await assert.rejects(
    collectAndValidateMacArtifact({ appPath: sample.app, sourceRoot: sample.sourceRoot, policy: sample.policy, runner: async () => { calls += 1; } }),
    /bundle executable is missing/,
  );
  assert.equal(calls, 0);
});

test("mismatched file architecture cannot qualify", async () => {
  const sample = await fixture();
  await assert.rejects(
    collectAndValidateMacArtifact({
      appPath: sample.app,
      sourceRoot: sample.sourceRoot,
      policy: sample.policy,
      runner: stubRunner(sample.policy, { file: validRecord("Mach-O 64-bit executable x86_64\n") }),
    }),
    /did not qualify/,
  );
});

test("collector failure or truncation cannot qualify", async () => {
  for (const file of [
    { status: "error", exit_code: 1, stdout: "", stderr: "file failed", truncated: false },
    { status: "ok", exit_code: 0, stdout: "Mach-O 64-bit executable arm64", stderr: "", truncated: true },
  ]) {
    const sample = await fixture();
    await assert.rejects(
      collectAndValidateMacArtifact({
        appPath: sample.app,
        sourceRoot: sample.sourceRoot,
        policy: sample.policy,
        runner: stubRunner(sample.policy, { file }),
      }),
      /did not qualify/,
    );
  }
});

test("plist executable identity mismatch cannot qualify", async () => {
  const sample = await fixture();
  await assert.rejects(
    collectAndValidateMacArtifact({
      appPath: sample.app,
      sourceRoot: sample.sourceRoot,
      policy: sample.policy,
      runner: stubRunner(sample.policy, { plistExecutable: "other" }),
    }),
    /did not qualify/,
  );
});

test("validator execution failure cannot create qualification", async () => {
  const sample = await fixture();
  let ioCalls = 0;
  await assert.rejects(
    collectAndValidateMacArtifact({
      appPath: sample.app,
      sourceRoot: sample.sourceRoot,
      policy: sample.policy,
      runner: stubRunner(sample.policy),
      ioRunner: async (command, context) => {
        ioCalls += 1;
        if (ioCalls === 1) return runRecord(command, context);
        return { status: "error", exit_code: 70, stdout: "", stderr: "validator unavailable", truncated: false };
      },
    }),
    /did not qualify/,
  );
});

test("physical output alias into accepted source refuses before tool runner or write", async () => {
  const sample = await fixture();
  const physicalOutput = join(sample.sourceRoot, "aliased-output");
  const aliasRoot = join(sample.root, "source-alias");
  await mkdir(physicalOutput);
  await symlink(sample.sourceRoot, aliasRoot, "dir");
  const binding = sample.receipt.macArtifactValidation;
  binding.outputRoot = join(aliasRoot, "aliased-output");
  binding.evidencePath = join(binding.outputRoot, "evidence.json");
  binding.reportPath = join(binding.outputRoot, "report.json");
  const policy = deriveMacArtifactPolicy(sample.config, { binaryName: "rivune" }, sample.receipt);
  let toolCalls = 0;
  await assert.rejects(
    collectAndValidateMacArtifact({
      appPath: sample.app,
      sourceRoot: sample.sourceRoot,
      policy,
      runner: async () => { toolCalls += 1; return validRecord(); },
    }),
    /safe artifact output preflight refused/,
  );
  assert.equal(toolCalls, 0);
  await assert.rejects(readFile(join(physicalOutput, "evidence.json")), /ENOENT/);
  await assert.rejects(readFile(join(physicalOutput, "report.json")), /ENOENT/);
});

test("symlinked output root refuses before tool runner or write", async () => {
  const sample = await fixture();
  const physicalOutput = join(sample.root, "physical-receipts");
  const linkedOutput = join(sample.root, "linked-receipts");
  await mkdir(physicalOutput);
  await symlink(physicalOutput, linkedOutput, "dir");
  const binding = sample.receipt.macArtifactValidation;
  binding.outputRoot = linkedOutput;
  binding.evidencePath = join(linkedOutput, "evidence.json");
  binding.reportPath = join(linkedOutput, "report.json");
  const policy = deriveMacArtifactPolicy(sample.config, { binaryName: "rivune" }, sample.receipt);
  let toolCalls = 0;
  await assert.rejects(
    collectAndValidateMacArtifact({
      appPath: sample.app,
      sourceRoot: sample.sourceRoot,
      policy,
      runner: async () => { toolCalls += 1; return validRecord(); },
    }),
    /(safe artifact output preflight refused|parent must be a real directory)/,
  );
  assert.equal(toolCalls, 0);
  await assert.rejects(readFile(join(physicalOutput, "evidence.json")), /ENOENT/);
  await assert.rejects(readFile(join(physicalOutput, "report.json")), /ENOENT/);
});

test("ancestor replacement after preflight refuses before evidence write", async () => {
  const sample = await fixture();
  const redirected = join(sample.sourceRoot, "redirected-output");
  await mkdir(redirected);
  const baseRunner = stubRunner(sample.policy);
  let replaced = false;
  const runner = async (command, context) => {
    const result = await baseRunner(command, context);
    if (!replaced && command[0] === "/usr/bin/codesign" && !command.includes("-d")) {
      replaced = true;
      await rename(sample.outputRoot, sample.outputRoot + "-original");
      await symlink(redirected, sample.outputRoot, "dir");
    }
    return result;
  };
  await assert.rejects(
    collectAndValidateMacArtifact({
      appPath: sample.app,
      sourceRoot: sample.sourceRoot,
      policy: sample.policy,
      runner,
    }),
    /did not qualify/,
  );
  assert.equal(replaced, true);
  await assert.rejects(readFile(join(redirected, "evidence.json")), /ENOENT/);
  await assert.rejects(readFile(join(redirected, "report.json")), /ENOENT/);
});
