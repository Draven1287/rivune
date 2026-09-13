import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function inventory(directory) {
  const result = {};
  async function visit(path) {
    for (const name of (await readdir(path)).sort()) {
      const file = join(path, name); const stat = await lstat(file);
      if (stat.isSymbolicLink()) throw Error(`Symlink is not a bundle asset: ${file}`);
      if (stat.isDirectory()) await visit(file);
      else result[relative(directory, file).split('\\').join('/')] = hash(await readFile(file));
    }
  }
  await visit(directory); return result;
}
export async function sourceDigest() {
  const entries = {};
  for (const dir of ['src','public']) for (const [file, digest] of Object.entries(await inventory(join(root, dir)))) entries[`${dir}/${file}`] = digest;
  for (const file of ['package.json','package-lock.json','vite.config.mjs','tsconfig.json','release/config.json']) entries[file] = hash(await readFile(join(root,file)));
  return hash(JSON.stringify(entries));
}
export async function createManifest() {
  const assets = await inventory(join(root,'dist')); delete assets['bundle-manifest.json'];
  const {version} = JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  const manifest = {schema:1, version, sourceDigest:await sourceDigest(), assets};
  await writeFile(join(root,'dist/bundle-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
export async function verifyBundle(directory = join(root,'dist'), checkSource = true) {
  const manifest = JSON.parse(await readFile(join(directory,'bundle-manifest.json'),'utf8'));
  if (manifest.schema !== 1 || !manifest.assets?.['index.html']) throw Error('Invalid shared bundle manifest');
  const actual = await inventory(directory); delete actual['bundle-manifest.json'];
  if (JSON.stringify(actual) !== JSON.stringify(manifest.assets)) throw Error('Shared bundle is missing, modified, or contains stale assets');
  if (checkSource && manifest.sourceDigest !== await sourceDigest()) throw Error('Shared bundle is stale. Run npm run build.');
  return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = process.argv[2] === 'create' ? await createManifest() : await verifyBundle(process.argv[3]);
  console.log(`Shared UI ${result.version} verified · ${Object.keys(result.assets).length} assets · ${result.sourceDigest.slice(0,12)}`);
}
