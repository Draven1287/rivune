import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const lockURL = new URL('../../prototypes/ai-native-workspace/package-lock.json', import.meta.url);
const original = await readFile(lockURL, 'utf8');
const lock = JSON.parse(original);
const missing = Object.entries(lock.packages).filter(([path, p]) => path && !p.integrity);
const records = [];
async function fetchExact(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'registry.npmjs.org' || parsed.username || parsed.password) throw Error('Non-registry URL rejected');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Registry HTTP ${response.status}`);
  return response;
}
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < missing.length) {
    const [path, pkg] = missing[cursor++];
    const name = path.split('node_modules/').at(-1);
    const metadataURL = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(pkg.version)}`;
    try {
      const metadata = await (await fetchExact(metadataURL)).json();
      if (metadata.name !== name || metadata.version !== pkg.version) throw Error('Exact package identity mismatch');
      const { integrity, tarball, shasum } = metadata.dist;
      if (!integrity || !tarball) throw Error('Registry integrity/tarball missing');
      if (pkg.resolved && pkg.resolved !== tarball) throw Error('Existing resolved URL differs');
      const sri = integrity.split(/\s+/).find(value => value.startsWith('sha512-'));
      if (!sri) throw Error('Registry has no SHA-512 integrity');
      const bytes = Buffer.from(await (await fetchExact(tarball)).arrayBuffer());
      if (`sha512-${createHash('sha512').update(bytes).digest('base64')}` !== sri) throw Error('Tarball SHA-512 mismatch');
      if (shasum && createHash('sha1').update(bytes).digest('hex') !== shasum) throw Error('Tarball SHA-1 mismatch');
      pkg.resolved = tarball; pkg.integrity = integrity;
      records.push({ path, name, version: pkg.version, metadataURL, resolved: tarball, integrity, registryShasum: shasum, bytes: bytes.length, sha512Verified: true, sha1Verified: !!shasum });
    } catch (error) { records.push({ path, name, version: pkg.version, metadataURL, error: error.message }); }
  }
}));
records.sort((a,b) => a.path.localeCompare(b.path));
const report = { capturedAtUTC: new Date().toISOString(), originalLockSHA256: createHash('sha256').update(original).digest('hex'), requested: missing.length, verified: records.filter(r => r.sha512Verified).length, unavailable: records.filter(r => r.error), records, tarballsStored: false, packageCodeExecuted: false };
await writeFile(new URL('./registry-verification.json', import.meta.url), JSON.stringify(report, null, 2)+'\n');
if (report.unavailable.length) throw Error(`Unavailable entries: ${report.unavailable.length}; original lock unchanged`);
await writeFile(new URL('./package-lock.proposed.json', import.meta.url), JSON.stringify(lock, null, 2)+'\n');
console.log(JSON.stringify({ requested: report.requested, verified: report.verified, unavailable: report.unavailable.length }));
