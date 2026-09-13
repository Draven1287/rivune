import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";

function inside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function inspectPng(bytes, label, minimumSize = 1) {
  const signature = "89504e470d0a1a0a";
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== signature) throw new Error(`Invalid PNG icon: ${label}`);
  if (bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString("ascii") !== "IHDR") throw new Error(`PNG icon has no valid IHDR: ${label}`);
  const width = bytes.readUInt32BE(16); const height = bytes.readUInt32BE(20);
  if (width !== height || width < minimumSize) throw new Error(`PNG icon has invalid dimensions: ${label}`);
  let offset = 8; let sawIDAT = false; let sawIEND = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset); const end = offset + 12 + length;
    if (end > bytes.length) throw new Error(`PNG icon has a truncated chunk: ${label}`);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT" && length) sawIDAT = true;
    if (type === "IEND") { if (length !== 0 || end !== bytes.length) throw new Error(`PNG icon has an invalid IEND: ${label}`); sawIEND = true; }
    offset = end;
  }
  if (!sawIDAT || !sawIEND) throw new Error(`PNG icon has no complete image payload: ${label}`);
  return { width, height };
}

export async function validateNativeIcon(path) {
  const bytes = await readFile(path);
  const extension = extname(path).toLowerCase();
  if (extension === ".png") {
    const { width, height } = inspectPng(bytes, path, 256);
    return { format: "png", width, height };
  }
  if (extension === ".ico") {
    const count = bytes.length >= 6 ? bytes.readUInt16LE(4) : 0;
    const directoryEnd = 6 + count * 16;
    if (bytes.length < directoryEnd || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1 || count < 1) {
      throw new Error(`Invalid Windows ICO icon: ${path}`);
    }
    for (let index = 0; index < count; index += 1) {
      const entry = 6 + index * 16;
      const payloadBytes = bytes.readUInt32LE(entry + 8); const payloadOffset = bytes.readUInt32LE(entry + 12);
      if (!payloadBytes || payloadOffset < directoryEnd || payloadOffset + payloadBytes > bytes.length) throw new Error(`ICO icon has an invalid image entry: ${path}`);
      const payload = bytes.subarray(payloadOffset, payloadOffset + payloadBytes);
      const png = payload.length >= 8 && payload.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
      const dib = payload.length >= 40 && payload.readUInt32LE(0) >= 40;
      if (!png && !dib) throw new Error(`ICO icon entry has no image payload: ${path}`);
      if (png) inspectPng(payload, `${path} entry ${index + 1}`);
    }
    return { format: "ico", images: count };
  }
  if (extension === ".icns") {
    if (bytes.length < 8 || bytes.subarray(0, 4).toString("ascii") !== "icns" || bytes.readUInt32BE(4) !== bytes.length) {
      throw new Error(`Invalid macOS ICNS icon: ${path}`);
    }
    let offset = 8; let imageChunks = 0;
    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) throw new Error(`ICNS icon has a truncated chunk: ${path}`);
      const type = bytes.subarray(offset, offset + 4).toString("ascii"); const length = bytes.readUInt32BE(offset + 4);
      if (length < 8 || offset + length > bytes.length) throw new Error(`ICNS icon has an invalid chunk: ${path}`);
      if (/^(ic0[4-9]|ic1[0-4]|icp[4-6]|ics[4-8]|is32|il32|ih32|it32)$/.test(type)) imageChunks += 1;
      offset += length;
    }
    if (!imageChunks) throw new Error(`ICNS container has no icon image entries: ${path}`);
    return { format: "icns", bytes: bytes.length };
  }
  throw new Error(`Unsupported native icon format: ${path}`);
}

export async function validateProductIdentity(cwd, tauriConfig, cargoManifestText) {
  if (tauriConfig.productName !== "Rivune") throw new Error("Tauri productName must be Rivune");
  const titles = tauriConfig?.app?.windows?.map(window => window.title) ?? [];
  if (!titles.length || titles.some(title => title !== "Rivune")) throw new Error("Every packaged window title must be Rivune");
  const packageName = cargoManifestText.match(/^name\s*=\s*["']([^"']+)["']/m)?.[1];
  if (packageName !== "rivune") throw new Error("Cargo package/binary name must be rivune");
  const binSections = [...cargoManifestText.matchAll(/^\s*\[\[bin\]\]\s*\n([\s\S]*?)(?=^\s*\[|(?![\s\S]))/gm)];
  const explicitRivuneBinary = binSections.some(section => /^\s*name\s*=\s*["']rivune["']\s*$/m.test(section[1]));
  if (!explicitRivuneBinary) throw new Error("Cargo manifest must contain an explicit [[bin]] named rivune");
  const requiredTargets = new Set(["dmg", "nsis", "appimage", "deb"]);
  const targets = tauriConfig?.bundle?.targets;
  if (!Array.isArray(targets) || targets.length !== requiredTargets.size || targets.some(target => !requiredTargets.delete(target))) {
    throw new Error("Bundle targets must explicitly list dmg, nsis, appimage, and deb once");
  }
  const icons = tauriConfig?.bundle?.icon;
  if (!Array.isArray(icons) || !icons.length) throw new Error("Tauri bundle icons must not be empty");
  const byExtension = new Map();
  for (const configured of icons) {
    const path = resolve(join(cwd, "src-tauri"), configured);
    if (!inside(join(cwd, "src-tauri"), path)) throw new Error("Bundle icon must stay inside src-tauri");
    if (!(await stat(path).catch(() => null))?.isFile()) throw new Error(`Configured bundle icon is missing: ${configured}`);
    byExtension.set(extname(path).toLowerCase(), { path, evidence: await validateNativeIcon(path) });
  }
  for (const extension of [".icns", ".ico", ".png"]) if (!byExtension.has(extension)) throw new Error(`Missing required ${extension} bundle icon`);
  return { productName: "Rivune", packageName, icons: Object.fromEntries(byExtension) };
}
