import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore } from '../src/hooks/draftStore.ts';

function storageFixture() {
  const values = new Map();
  let reads = 0;
  let writes = 0;
  return {
    values,
    get reads() { return reads; },
    get writes() { return writes; },
    storage: {
      getItem(key) { reads++; return values.get(key) ?? null; },
      setItem(key, value) { writes++; values.set(key, value); },
    },
  };
}

test('reads once per ID and uses the existing session key', () => {
  const f = storageFixture(); f.values.set('rivune-draft-a', 'Saved draft');
  const store = createDraftStore(() => f.storage);
  assert.equal(f.reads, 0);
  assert.equal(store.getDraft('a'), 'Saved draft');
  f.values.set('rivune-draft-a', 'External stale value');
  assert.equal(store.getDraft('a'), 'Saved draft'); assert.equal(f.reads, 1);
  store.setDraft('a', 'New draft');
  assert.equal(f.values.get('rivune-draft-a'), 'New draft'); assert.equal(store.getNotice(), null);
});

test('failed read is cached, reported and never automatically overwritten by empty fallback', () => {
  let reads = 0; let writes = 0;
  const store = createDraftStore(() => ({ getItem() { reads++; throw Error('secret storage path'); }, setItem() { writes++; } }));
  assert.equal(store.getDraft('a'), '');
  const notice = store.getNotice(); assert.equal(typeof notice, 'string'); assert(!notice.includes('secret'));
  store.setDraft('a', '');
  assert.equal(store.getDraft('a'), ''); assert.equal(reads, 1); assert.equal(writes, 0);
  assert.equal(store.getNotice(), notice);
});

test('write failure preserves edited text through unsubscribe, remount and conversation switches', () => {
  const f = storageFixture(); f.values.set('rivune-draft-a', 'Old saved draft');
  f.storage.setItem = () => { throw Error('storage denied'); };
  const store = createDraftStore(() => f.storage);
  const unsubscribe = store.subscribe(() => {});
  store.setDraft('a', 'Latest unsaved draft'); unsubscribe();
  store.setDraft('b', 'Independent draft');
  const unsubscribeAgain = store.subscribe(() => {});
  assert.equal(store.getDraft('a'), 'Latest unsaved draft'); assert.equal(store.getDraft('b'), 'Independent draft');
  assert.equal(f.values.get('rivune-draft-a'), 'Old saved draft'); assert.notEqual(store.getNotice(), null);
  unsubscribeAgain();
});

test('quota failure retains nonempty edits and intentional clearing in authoritative memory', () => {
  const f = storageFixture();
  f.storage.setItem = () => { const error = Error('quota'); error.name = 'QuotaExceededError'; throw error; };
  const store = createDraftStore(() => f.storage);
  store.setDraft('a', 'Text exceeding available quota'); assert.equal(store.getDraft('a'), 'Text exceeding available quota');
  store.setDraft('a', ''); assert.equal(store.getDraft('a'), ''); assert.notEqual(store.getNotice(), null);
});

test('unavailable storage getter cannot destroy in-memory drafts or expose its error', () => {
  const store = createDraftStore(() => { throw Error('/private/secret token'); });
  store.setDraft('a', 'Retained'); assert.equal(store.getDraft('a'), 'Retained');
  assert(!store.getNotice().includes('/private')); assert(!store.getNotice().includes('token'));
});

test('IDs are isolated and subscriptions notify only changes and stop after unsubscribe', () => {
  const f = storageFixture(); const store = createDraftStore(() => f.storage);
  let notifications = 0; const unsubscribe = store.subscribe(() => { notifications++; });
  store.setDraft('a', 'Alpha'); store.setDraft('b', 'Beta'); store.setDraft('a', 'Alpha');
  assert.equal(notifications, 2); assert.equal(store.getDraft('a'), 'Alpha'); assert.equal(store.getDraft('b'), 'Beta');
  unsubscribe(); store.setDraft('a', 'Gamma'); assert.equal(notifications, 2);
});

test('failure notice is stable and notifies after the snapshot read returns', async () => {
  const store = createDraftStore(() => { throw Error('denied'); });
  let notifications = 0; store.subscribe(() => { notifications++; });
  store.getDraft('a'); const notice = store.getNotice();
  store.getDraft('a'); store.getDraft('b');
  assert.equal(notifications, 0);
  await Promise.resolve();
  assert.equal(notifications, 1); assert.equal(store.getNotice(), notice);
});
