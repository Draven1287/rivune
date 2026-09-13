import { createHash } from "node:crypto";
import { access, lstat, readFile, readdir, readlink } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, isAbsolute, join, relative, resolve, sep } from "node:path";

export const PLATFORM_PLANS = Object.freeze({
  macos: { hostOS: "darwin", artifact: "src-tauri/target/release/bundle/dmg/*.dmg", bundles: "dmg" },
  windows: { hostOS: "win32", artifact: "src-tauri/target/release/bundle/nsis/*-setup.exe", bundles: "nsis" },
  linux: { hostOS: "linux", artifact: "src-tauri/target/release/bundle/{appimage,deb}/*", bundles: "appimage,deb" }
});

export function normalizePlatform(value = process.platform) {
  const platform = { darwin: "macos", macos: "macos", win32: "windows", windows: "windows", linux: "linux" }[value];
  if (!platform) throw new Error(`Unsupported platform: ${value}`);
  return platform;
}

export function artifactPlan(platformValue, architecture = process.arch) {
  const platform = normalizePlatform(platformValue);
  const plan = PLATFORM_PLANS[platform];
  return {
    platform,
    architecture,
    hostOS: plan.hostOS,
    productHost: "Tauri desktop shell",
    artifact: plan.artifact,
    command: ["cargo", "tauri", "build", "--bundles", plan.bundles]
  };
}

export function assertAbsolute(path, label) {
  if (!path || !isAbsolute(path)) throw new Error(`${label} must be an absolute path`);
  return resolve(path);
}

export function assertMatchingHost(platform, actualOS = process.platform) {
  const expectedOS = PLATFORM_PLANS[platform].hostOS;
  if (actualOS !== expectedOS) throw new Error(`Build ${platform} installers on ${expectedOS}, not ${actualOS}`);
}

function pathSettings(platform, env) {
  const windows = normalizePlatform(platform) === "windows";
  return {
    pathDelimiter: windows ? ";" : delimiter,
    extensions: windows
      ? (env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean).map(value => value.startsWith(".") ? value : `.${value}`)
      : [""]
  };
}

export async function findCommand(name, { platform = process.platform, env = process.env } = {}) {
  const normalized = normalizePlatform(platform);
  const { pathDelimiter, extensions } = pathSettings(normalized, env);
  const hasExtension = normalized === "windows" && extensions.some(ext => name.toLowerCase().endsWith(ext.toLowerCase()));
  const candidates = hasExtension ? [name] : extensions.map(ext => `${name}${ext}`);
  for (const directory of (env.PATH || "").split(pathDelimiter).filter(Boolean)) {
    let entries;
    try { entries = await readdir(directory); } catch { continue; }
    for (const candidate of candidates) {
      const match = normalized === "windows"
        ? entries.find(entry => entry.toLowerCase() === candidate.toLowerCase())
        : entries.find(entry => entry === candidate);
      if (!match) continue;
      const located = join(directory, match);
      try {
        const stat = await lstat(located);
        if (!stat.isFile()) continue;
        if (normalized !== "windows") await access(located, constants.X_OK);
        return located;
      } catch {}
    }
  }
  return null;
}

export async function commandExists(name, options) {
  return Boolean(await findCommand(name, options));
}

export async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export async function describeTree(root) {
  const absoluteRoot = assertAbsolute(root, "tree root");
  const records = [];
  async function walk(path) {
    const stat = await lstat(path);
    const relativePath = relative(absoluteRoot, path).split(sep).join("/") || ".";
    if (stat.isSymbolicLink()) {
      records.push({ path: relativePath, type: "symlink", target: await readlink(path) });
      return;
    }
    if (stat.isDirectory()) {
      records.push({ path: relativePath, type: "directory" });
      for (const name of (await readdir(path)).sort()) await walk(join(path, name));
      return;
    }
    if (stat.isFile()) {
      records.push({ path: relativePath, type: "file", size: stat.size, sha256: await sha256File(path) });
      return;
    }
    throw new Error(`Unsupported filesystem entry in accepted tree: ${relativePath}`);
  }
  await walk(absoluteRoot);
  return records;
}

export async function hashTree(root) {
  const records = await describeTree(root);
  const sha256 = createHash("sha256").update(`${JSON.stringify(records)}\n`).digest("hex");
  return { root: resolve(root), sha256, records };
}

export async function assertIdenticalTrees(source, staged) {
  const [sourceTree, stagedTree] = await Promise.all([describeTree(source), describeTree(staged)]);
  if (JSON.stringify(sourceTree) !== JSON.stringify(stagedTree)) {
    throw new Error("Staged bundle does not exactly match the accepted source bundle");
  }
  return sourceTree;
}
