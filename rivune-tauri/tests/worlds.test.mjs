import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSessionWorld, normalizeEnvironment, environmentName } from './compiled/features/worlds/catalog.js';
test('saved Ocean, Cloud, Orbital and Plain selections map to the curated environments', () => {
 for (const value of ['plain','auto','ocean','orbital','cloud']) assert.equal(normalizeEnvironment(value),value);
 for (const value of ['missing','glass','network','aurora','galaxy']) assert.equal(normalizeEnvironment(value),'ocean');
 assert.equal(environmentName('ocean'),'Stillwater'); assert.equal(environmentName('plain'),'Focus');
});
test('session rotation advances once from the previous place, wraps and recovers invalid storage', () => {
 assert.equal(nextSessionWorld(null),'ocean'); assert.equal(nextSessionWorld('ocean'),'cloud');
 assert.equal(nextSessionWorld('cloud'),'orbital'); assert.equal(nextSessionWorld('orbital'),'ocean');
 assert.equal(nextSessionWorld('bad'),'ocean');
});
