import { readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { builtinModules } from 'node:module';

const base = dirname(fileURLToPath(import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw Error(message); };
const forbidden = new Set(['node_modules', 'dist', 'dist-desktop', 'target', '.git', '.toolchains', 'profiles', 'npm-cache']);
const safePath = name => typeof name === 'string' && name.length > 0 && !name.includes('\\') && !name.startsWith('/') && name.split('/').every(p => p && p !== '.' && p !== '..' && !forbidden.has(p));

export async function validate({ tree = resolve(base, 'tree'), manifestPath = resolve(base, 'SOURCE_MANIFEST.json'), allowlistPath = resolve(base, 'ALLOWLIST.txt'), source } = {}) {
  tree = resolve(tree);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const files = manifest.files;
  check(Array.isArray(files), 'Manifest files missing');
  const names = files.map(f => f.path);
  check(names.every(safePath) && new Set(names).size === names.length, 'Unsafe or duplicate manifest path');
  check(JSON.stringify(names) === JSON.stringify([...names].sort()), 'Manifest paths must be sorted');
  check((await readFile(allowlistPath, 'utf8')) === names.join('\n') + '\n', 'Allowlist differs from manifest');
  const actual = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      check(!entry.isSymbolicLink(), `Symlink refused: ${relative(tree, path)}`);
      if (entry.isDirectory()) await walk(path);
      else { check(entry.isFile(), 'Nonregular file'); actual.push(relative(tree, path).split(sep).join('/')); }
    }
  }
  check(!(await lstat(tree)).isSymbolicLink(), 'Tree symlink refused');
  await walk(tree);
  check(JSON.stringify(actual.sort()) === JSON.stringify(names), 'Tree has missing or extra files');
  const content = new Map();
  for (const file of files) {
    const bytes = await readFile(resolve(tree, file.path));
    check(bytes.length === file.bytes && digest(bytes) === file.sha256, `Content drift: ${file.path}`);
    if (source) {
      const p = resolve(source, file.path);
      check(!(await lstat(p)).isSymbolicLink(), `Source symlink: ${file.path}`);
      check(digest(await readFile(p)) === file.sha256, `Authoritative source drift: ${file.path}`);
    }
    content.set(file.path, bytes.toString('utf8'));
  }
  check(files.length === manifest.fileCount && files.reduce((n, f) => n + f.bytes, 0) === manifest.totalBytes, 'Count/size drift');
  check(digest(files.map(f => f.path + '\0' + f.sha256 + '\n').join('')) === manifest.treeSHA256, 'Tree hash drift');
  let references = 0;
  function dependency(from, spec, extensions = ['']) {
    const target = relative(tree, resolve(tree, dirname(from), spec)).split(sep).join('/');
    check(extensions.some(ext => content.has(target + ext)), `Missing dependency: ${from} -> ${spec}`);
    references++;
  }
  const frontend = 'prototypes/ai-native-workspace/';
  const pkg = JSON.parse(content.get(frontend + 'package.json'));
  const lock = JSON.parse(content.get(frontend + 'package-lock.json'));
  for (const field of ['dependencies', 'devDependencies']) {
    check(JSON.stringify(pkg[field]) === JSON.stringify(lock.packages[''][field]), `Lock root mismatch: ${field}`);
    for (const [name, version] of Object.entries(pkg[field])) check(lock.packages['node_modules/' + name]?.version === version, `Direct lock version mismatch: ${name}`);
  }
  for (const [name, record] of Object.entries(lock.packages)) if (name) {
    check(/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(record.integrity || '') && /^https:\/\/registry\.npmjs\.org\//.test(record.resolved || ''), `Registry integrity/resolution missing: ${name}`);
  }
  for (const [name, text] of content) {
    if (/\.(?:mjs|ts|tsx)$/.test(name)) {
      const imports = [...text.matchAll(/^[ \t]*import(?:[^;\n]*?\bfrom\s*|\s*)['"]([^'"]+)['"]/gm)];
      for (const [, spec] of imports) {
        if (spec.startsWith('.')) dependency(name, spec, ['', '.ts', '.tsx', '.mjs', '/index.ts', '/index.tsx']);
        else if (!spec.startsWith('node:') && !builtinModules.includes(spec)) {
          const packageName = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
          check(pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName], `Undeclared JS package: ${spec}`);
        }
      }
      for (const [, spec] of text.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g)) {
        // Directory/output URLs in build scripts are checked by output wiring below.
        if (spec.endsWith('/') || spec.includes('dist-desktop')) continue;
        dependency(name, spec);
      }
    }
    if (name.endsWith('.css')) for (const [, spec] of text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
      if (!spec.startsWith('data:') && !spec.startsWith('#')) dependency(name, spec);
    }
    if (name.endsWith('.html')) for (const [, spec] of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      if (spec.startsWith('/src/')) dependency(name, './' + spec.slice(1));
      else if (spec.startsWith('.')) dependency(name, spec);
      else check(!/^https?:/.test(spec), `External HTML dependency: ${name}`);
    }
    if (name.endsWith('.rs')) for (const [, spec] of text.matchAll(/include(?:_str|_bytes)?!\("([^"]+)"\)/g)) dependency(name, spec);
    if (name.endsWith('Cargo.toml')) {
      for (const [, spec] of text.matchAll(/\{[^\n}]*\bpath\s*=\s*"([^"]+)"/g)) dependency(name, spec + '/Cargo.toml');
      for (const [, spec] of text.matchAll(/^path\s*=\s*"([^"]+)"/gm)) dependency(name, spec);
    }
  }
  const noticeRoot = 'third-party-notices/rivune-desktop/';
  const inventory = JSON.parse(content.get(noticeRoot + 'NOTICE_INPUTS.json'));
  for (const record of inventory.packages) for (const notice of [...(record.notices || []), ...(record.supplementalNotices || [])]) {
    if (notice.file.startsWith('upstream-notices/')) {
      const text = content.get(noticeRoot + notice.file);
      check(text !== undefined && digest(Buffer.from(text)) === notice.sha256 && Buffer.byteLength(text) === notice.bytes, `Notice resource missing or changed: ${notice.file}`);
      check(content.get(noticeRoot + 'CANDIDATE_RUNTIME_NOTICES.txt').includes(text), `Notice text absent from runtime inputs: ${notice.file}`);
    }
  }
  const native = 'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/';
  const config = JSON.parse(content.get(native + 'tauri.conf.json'));
  check(resolve(tree, native, config.build.frontendDist) === resolve(tree, frontend, 'dist-desktop'), 'Native output drift');
  for (const icon of config.bundle.icon) dependency(native + 'tauri.conf.json', icon);
  check(content.has(frontend + 'scripts/build-desktop.mjs') && pkg.scripts['build:desktop'] === 'node scripts/build-desktop.mjs', 'Desktop build entry missing');
  return { sourceTreeSHA256: manifest.treeSHA256, filesByteIdentical: files.length, totalBytes: manifest.totalBytes, exactAllowlist: true, dependencyReferencesChecked: references, lockDirectDependenciesMatch: true, registryIntegrityComplete: true, nativeOutputWiring: true, authoritativeSourceCompared: !!source, limitations: 'Static literal dependency checks; not compilation, secret audit, asset rights or cross-platform runtime proof.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = { '--tree': 'tree', '--manifest': 'manifestPath', '--allowlist': 'allowlistPath', '--source': 'source' }[args[i]];
    check(key && args[i + 1], 'Expected --tree/--manifest/--allowlist/--source PATH'); options[key] = resolve(args[i + 1]);
  }
  console.log(JSON.stringify(await validate(options), null, 2));
}
