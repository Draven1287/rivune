import { createHash } from "node:crypto";
import { access, lstat, readFile, readdir, readlink, realpath, stat } from "node:fs/promises";
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

export function artifactPlan(platformValue, { architecture = process.arch, cwd, env = process.env } = {}) {
  const platform = normalizePlatform(platformValue);
  const plan = PLATFORM_PLANS[platform];
  const project = assertAbsolute(cwd, "packaging cwd");
  const targetRoot = resolve(project, env.CARGO_TARGET_DIR || "src-tauri/target");
  const bundleRoot = join(targetRoot, "release", "bundle");
  const artifact = platform === "macos"
    ? join(bundleRoot, "dmg", "*.dmg")
    : platform === "windows"
      ? join(bundleRoot, "nsis", "*-setup.exe")
      : join(bundleRoot, "{appimage,deb}", "*");
  return {
    platform,
    architecture,
    hostOS: plan.hostOS,
    productHost: "Tauri desktop shell",
    targetRoot,
    artifact,
    command: ["cargo", "tauri", "build", "--bundles", plan.bundles, "--", "--locked", "--offline"]
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

export async function findCommandEvidence(name, { platform = process.platform, env = process.env } = {}) {
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
        const entry = await lstat(located);
        if (!entry.isFile() && !entry.isSymbolicLink()) continue;
        const resolved = await realpath(located);
        if (!(await stat(resolved)).isFile()) continue;
        if (normalized !== "windows") await access(located, constants.X_OK);
        return { invocationPath: located, resolvedPath: resolved };
      } catch {}
    }
  }
  return null;
}

export async function findCommand(name, options) {
  return (await findCommandEvidence(name, options))?.invocationPath ?? null;
}

export async function commandExists(name, options) {
  return Boolean(await findCommand(name, options));
}

export async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export async function describeTree(root) {
  const absoluteRoot = assertAbsolute(root, "tree root");
  const rootEntry = await lstat(absoluteRoot);
  if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) throw new Error("Accepted tree root must be a real directory");
  const physicalRoot = await realpath(absoluteRoot);
  const records = [];
  async function walk(path) {
    const stat = await lstat(path);
    const relativePath = relative(absoluteRoot, path).split(sep).join("/") || ".";
    if (stat.isSymbolicLink()) {
      const target = await readlink(path);
      let resolvedTarget;
      try { resolvedTarget = await realpath(path); } catch { throw new Error(`Broken symlink in accepted tree: ${relativePath}`); }
      if (!inside(physicalRoot, resolvedTarget)) throw new Error(`External symlink in accepted tree: ${relativePath}`);
      records.push({ path: relativePath, type: "symlink", target });
      return;
    }
    if (stat.isDirectory()) {
      records.push({ path: relativePath, type: "directory", mode: stat.mode & 0o777 });
      for (const name of (await readdir(path)).sort()) await walk(join(path, name));
      return;
    }
    if (stat.isFile()) {
      records.push({ path: relativePath, type: "file", mode: stat.mode & 0o777, size: stat.size, sha256: await sha256File(path) });
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

export async function hashFileSet(paths) {
  const records = [];
  for (const path of [...new Set(paths)].sort()) {
    const entry = await lstat(path);
    if (!entry.isFile() && !entry.isSymbolicLink()) throw new Error(`Accepted config is not a file: ${path}`);
    const resolved = await realpath(path);
    const resolvedEntry = await stat(resolved);
    if (!resolvedEntry.isFile()) throw new Error(`Accepted config does not resolve to a file: ${path}`);
    records.push({ path: resolve(path), resolved, mode: resolvedEntry.mode & 0o777, size: resolvedEntry.size, sha256: await sha256File(resolved) });
  }
  return { sha256: createHash("sha256").update(`${JSON.stringify(records)}\n`).digest("hex"), records };
}

export async function assertIdenticalTrees(source, staged) {
  const [sourceTree, stagedTree] = await Promise.all([describeTree(source), describeTree(staged)]);
  if (JSON.stringify(sourceTree) !== JSON.stringify(stagedTree)) {
    throw new Error("Staged bundle does not exactly match the accepted source bundle");
  }
  return sourceTree;
}
