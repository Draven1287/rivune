import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validate } from './validate.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
test('source validator rejects content, extra file, symlink, metadata and coherent missing dependency drift', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'rivune-stage-validator-'));
  const tree = join(temp, 'tree'), manifestPath = join(temp, 'manifest.json'), allowlistPath = join(temp, 'allowlist.txt');
  await cp(new URL('./tree', import.meta.url), tree, { recursive: true });
  const original = JSON.parse(await readFile(new URL('./SOURCE_MANIFEST.json', import.meta.url), 'utf8'));
  async function metadata(m) { await writeFile(manifestPath, JSON.stringify(m)); await writeFile(allowlistPath, m.files.map(f => f.path).join('\n') + '\n'); }
  await metadata(original);
  const options = { tree, manifestPath, allowlistPath };
  try {
    await t.test('baseline', async () => assert.equal((await validate(options)).filesByteIdentical, original.fileCount));
    await t.test('content drift', async () => {
      const p = join(tree, 'LICENSE'), bytes = await readFile(p); await writeFile(p, 'changed');
      await assert.rejects(validate(options), /Content drift/); await writeFile(p, bytes);
    });
    await t.test('extra file', async () => { const p = join(tree, 'private-report.txt'); await writeFile(p, 'synthetic'); await assert.rejects(validate(options), /extra files/); await rm(p); });
    await t.test('symlink', async () => { const p = join(tree, 'linked'); await symlink('/private/tmp', p); await assert.rejects(validate(options), /Symlink/); await rm(p); });
    await t.test('stale count', async () => { await metadata({ ...original, fileCount: original.fileCount - 4 }); await assert.rejects(validate(options), /Count\/size/); await metadata(original); });
    await t.test('missing integrity with coherent source hashes', async () => {
      const name = 'prototypes/ai-native-workspace/package-lock.json', path = join(tree, name);
      const bytes = await readFile(path), lock = JSON.parse(bytes); delete lock.packages['node_modules/react'].integrity;
      const modified = JSON.stringify(lock); await writeFile(path, modified);
      const files = original.files.map(f => f.path === name ? { ...f, bytes: Buffer.byteLength(modified), sha256: hash(modified) } : f);
      await metadata({ ...original, files, totalBytes: files.reduce((n, f) => n + f.bytes, 0), treeSHA256: hash(files.map(f => f.path + '\0' + f.sha256 + '\n').join('')) });
      await assert.rejects(validate(options), /Registry integrity/); await writeFile(path, bytes); await metadata(original);
    });
    await t.test('removed notice resource with coherent hashes', async () => {
      const name = original.files.find(f => f.path.includes('/upstream-notices/')).path, path = join(tree, name), bytes = await readFile(path);
      await rm(path); const files = original.files.filter(f => f.path !== name);
      await metadata({ ...original, files, fileCount: files.length, totalBytes: files.reduce((n, f) => n + f.bytes, 0), treeSHA256: hash(files.map(f => f.path + '\0' + f.sha256 + '\n').join('')) });
      await assert.rejects(validate(options), /Notice resource/); await writeFile(path, bytes); await metadata(original);
    });
    await t.test('removed referenced fixture with coherent hashes', async () => {
      const name = 'qa-artifacts/tauri-migration-audit-20260907/fixtures/conversation-project-reference.json';
      await rm(join(tree, name)); const files = original.files.filter(f => f.path !== name);
      const m = { ...original, files, fileCount: files.length, totalBytes: files.reduce((n, f) => n + f.bytes, 0), treeSHA256: hash(files.map(f => f.path + '\0' + f.sha256 + '\n').join('')) };
      await metadata(m); await assert.rejects(validate(options), /Missing dependency/);
    });
  } finally { await rm(temp, { recursive: true, force: true }); }
});
