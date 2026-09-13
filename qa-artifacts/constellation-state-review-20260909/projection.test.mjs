import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prototypes/ai-native-workspace');
const filename = path.join(root, 'src/host/Constellation.tsx');
const require = createRequire(path.join(root, 'package.json'));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
// Compile only the current production component in memory; no generated app files.
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
const originalRequire = loaded.require.bind(loaded);
loaded.require = name => originalRequire(name === './teamConfiguration' ? './teamConfiguration.ts' : name);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { ConstellationRun } = loaded.exports;
const { parseHostSnapshot } = require(path.join(root, 'src/host/contracts.ts'));

function fixture(status = 'cancelled') {
  const members = ['route-A', 'route-B'].map((providerID, i) => ({ schemaVersion: 1, providerID, modelID: `model-${i}`, effortID: i ? null : 'high', catalogRevision: 'saved-revision' }));
  const provider = { id: 'route-A', kind: 'fixture', executablePath: '/synthetic/nonexecuted', model: null, timeoutMs: 1000 };
  const team = { schemaVersion: 1, leadIndex: 1, members };
  return { schemaVersion: 1, activeConversationID: 'c', selectedProviderID: provider.id, providers: [provider], conversations: [{ id: 'c', title: 'Synthetic', readOnly: false, draft: '', richDraft: { schemaVersion: 1, revision: 1, selection: members[1], team, attachmentIDs: [] } }], runs: [{
    id: 'r', conversationID: 'c', status, updatedAt: 'synthetic', answer: null, error: null,
    admitted: { requestID: 'r', conversationID: 'c', prompt: 'Synthetic', mode: 'constellation', provider, retryOf: null, team },
    activity: { schemaVersion: 1, baseSequence: 7, entries: [{ schemaVersion: 1, eventID: 'r:7', requestID: 'r', conversationID: 'c', sequence: 7, kind: 'memberStarted', phase: 'contribute', state: 'running', memberID: 'member-1', providerID: 'route-A', role: 'independentAnswer', summary: 'Member started', textDelta: null, error: null }] },
    memberResults: [{ schemaVersion: 1, memberID: 'member-1', providerID: 'route-A', role: 'independentAnswer', text: 'Retained partial contribution', truncated: false }], resolution: null,
  }] };
}
const render = f => renderToStaticMarkup(React.createElement(ConstellationRun, { run: parseHostSnapshot(f).runs[0] }));
for (const status of ['cancelled', 'failed', 'preserved']) test(`${status}: retained running event is explicitly historical`, () => {
  const html = render(fixture(status));
  assert.match(html, new RegExp(`Constellation · ${status}`));
  assert.match(html, /Last recorded progress: contribute · running/);
  assert.match(html, /Retained partial contribution/);
  assert.doesNotMatch(html, /Host reports a reviewed delivery/);
  if (status !== 'preserved') assert.match(html, /No final answer was saved/);
});
test('saved answer carries exact member provider, model and effort; lead role remains distinct', () => {
  const html = render(fixture());
  assert.match(html, /<summary>Member · route-A · independent answer<\/summary><p>Saved model: model-0 · effort: high<\/p>/);
  assert.match(html, /Lead · route-B/);
  assert.match(html, /Saved model: model-1/);
});
test('managed default never invents a resolved model', () => {
  const f = fixture(); f.runs[0].admitted.team.members[0].modelID = null; f.runs[0].admitted.team.members[0].effortID = null;
  assert.match(render(f), /Provider-managed default · resolved model unknown/);
});
test('partial failure retains contribution and reports saved member issue', () => {
  const f = fixture('failed'); Object.assign(f.runs[0].activity.entries[0], { kind: 'failed', state: 'failed', error: 'Synthetic provider failure' });
  const html = render(f);
  assert.match(html, /Saved member issue: Synthetic provider failure/);
  assert.match(html, /Retained partial contribution/);
  assert.match(html, /No final answer was saved/);
});
