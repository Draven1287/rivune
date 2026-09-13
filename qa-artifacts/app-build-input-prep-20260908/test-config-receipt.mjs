import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import test from "node:test";

const REPO = resolve(import.meta.dirname, "../..");
const CONFIG_PATH = join(REPO, "qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/tauri.conf.json");
const INFO_PLIST_PATH = join(REPO, "qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/Info.plist");
const RECEIPT_PATH = join(import.meta.dirname, "PROPOSED_RECEIPT_FRAGMENT.json");
const SCHEMA_PATH = join(REPO, ".toolchains/tauri-cli/node_modules/@tauri-apps/cli/config.schema.json");
const CLI_NATIVE_PATH = join(REPO, ".toolchains/tauri-cli/node_modules/@tauri-apps/cli-darwin-arm64/cli.darwin-arm64.node");

test("canonical development config changes only the selected macOS floor", async () => {
  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  assert.deepEqual(config, {
    $schema: "https://schema.tauri.app/config/2",
    productName: "Rivune",
    version: "0.0.1",
    identifier: "com.rivune.desktop.development",
    build: { frontendDist: "../web" },
    app: {
      withGlobalTauri: true,
      security: {
        csp: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      },
      windows: [{ title: "Rivune", width: 1120, height: 760, minWidth: 760, minHeight: 560, resizable: true }],
    },
    bundle: {
      active: true,
      macOS: { minimumSystemVersion: "11.0" },
      icon: ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"],
      targets: ["dmg", "nsis", "appimage", "deb"],
      shortDescription: "A local multi-AI workspace",
    },
  });
});

test("pinned Tauri schema and proposed receipt agree on development candidate policy", async () => {
  const [config, receipt, schema] = await Promise.all([
    readFile(CONFIG_PATH, "utf8").then(JSON.parse),
    readFile(RECEIPT_PATH, "utf8").then(JSON.parse),
    readFile(SCHEMA_PATH, "utf8").then(JSON.parse),
  ]);
  const minimumSchema = schema.definitions.MacConfig.properties.minimumSystemVersion;
  assert.deepEqual(minimumSchema.type, ["string", "null"]);
  assert.match(minimumSchema.description, /LSMinimumSystemVersion/);
  assert.equal(receipt.receiptContext.platform, "macos");
  assert.equal(receipt.receiptContext.architecture, "arm64");
  assert.equal(receipt.receiptContext.productName, config.productName);
  assert.equal(receipt.receiptContext.identifier, config.identifier);
  assert.equal(receipt.receiptContext.version, config.version);
  assert.equal(receipt.macArtifactValidation.minimumMacOS, config.bundle.macOS.minimumSystemVersion);
  assert.equal(receipt.macArtifactValidation.outputRoot, null);
  assert.equal(receipt.macArtifactValidation.evidencePath, null);
  assert.equal(receipt.macArtifactValidation.reportPath, null);
  assert.equal(receipt.receiptContext.compatibilityClaim, false);
});

test("conventional Info.plist merge overrides LSRequiresCarbon without another config key", async () => {
  const [configText, infoBytes, cliBytes, receipt, schema] = await Promise.all([
    readFile(CONFIG_PATH, "utf8"),
    readFile(INFO_PLIST_PATH),
    readFile(CLI_NATIVE_PATH),
    readFile(RECEIPT_PATH, "utf8").then(JSON.parse),
    readFile(SCHEMA_PATH, "utf8").then(JSON.parse),
  ]);
  const infoText = infoBytes.toString("utf8");
  assert.equal(configText.includes("LSRequiresCarbon"), false);
  assert.notEqual(cliBytes.indexOf(Buffer.from("LSRequiresCarbon")), -1);
  await access(INFO_PLIST_PATH);
  assert.equal((infoText.match(/<key>/g) || []).length, 1);
  assert.match(infoText, /<key>LSRequiresCarbon<\/key>\s*<false\/>/);
  assert.match(schema.definitions.MacConfig.properties.infoPlist.description, /also looks for a `Info\.plist` file/);
  assert.equal(receipt.receiptContext.infoPlistPath, INFO_PLIST_PATH);
  assert.equal(receipt.receiptContext.infoPlistSHA256AtPreparation, createHash("sha256").update(infoBytes).digest("hex"));
  assert.deepEqual(receipt.receiptContext.expectedMergedInfoPlist, { LSRequiresCarbon: false });
});
