import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";

function inside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export async function validateNativeIcon(path) {
  const bytes = await readFile(path);
  const extension = extname(path).toLowerCase();
  if (extension === ".png") {
    const signature = "89504e470d0a1a0a";
    if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== signature) throw new Error(`Invalid PNG icon: ${path}`);
    const width = bytes.readUInt32BE(16); const height = bytes.readUInt32BE(20);
    if (width !== height || width < 256) throw new Error(`PNG icon must be square and at least 256px: ${path}`);
    return { format: "png", width, height };
  }
  if (extension === ".ico") {
    if (bytes.length < 6 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1 || bytes.readUInt16LE(4) < 1) {
      throw new Error(`Invalid Windows ICO icon: ${path}`);
    }
    return { format: "ico", images: bytes.readUInt16LE(4) };
  }
  if (extension === ".icns") {
    if (bytes.length < 8 || bytes.subarray(0, 4).toString("ascii") !== "icns" || bytes.readUInt32BE(4) !== bytes.length) {
      throw new Error(`Invalid macOS ICNS icon: ${path}`);
    }
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
