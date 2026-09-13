import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadingPositions, atLatest } from './compiled/features/conversations/readingPosition.js';
test('switching conversations restores independent reading positions', () => {
 const positions = new ReadingPositions();
 positions.capture('a',{scrollTop:240,scrollHeight:1800,clientHeight:500});
 positions.capture('b',{scrollTop:60,scrollHeight:2000,clientHeight:400});
 assert.equal(positions.restore('a',{scrollHeight:1800,clientHeight:500}),240);
 assert.equal(positions.restore('b',{scrollHeight:2000,clientHeight:400}),60);
 assert.equal(positions.restore('new',{scrollHeight:1800,clientHeight:500}),0);
});
test('following the latest reply survives growth; reading older text does not jump', () => {
 const positions = new ReadingPositions();
 positions.capture('latest',{scrollTop:1000,scrollHeight:1500,clientHeight:500});
 positions.capture('reading',{scrollTop:350,scrollHeight:1500,clientHeight:500});
 assert.equal(positions.restore('latest',{scrollHeight:2000,clientHeight:500}),1500);
 assert.equal(positions.restore('reading',{scrollHeight:2000,clientHeight:500}),350);
 assert.equal(atLatest({scrollTop:1400,scrollHeight:2000,clientHeight:500}),false);
});
test('hidden layouts cannot overwrite saved positions and removed content clamps safely', () => {
 const positions = new ReadingPositions();
 positions.capture('a',{scrollTop:400,scrollHeight:1800,clientHeight:500});
 positions.capture('a',{scrollTop:0,scrollHeight:0,clientHeight:0});
 assert.equal(positions.restore('a',{scrollHeight:1800,clientHeight:500}),400);
 assert.equal(positions.restore('a',{scrollHeight:600,clientHeight:500}),100);
 positions.forget('a'); assert.equal(positions.restore('a',{scrollHeight:1800,clientHeight:500}),0);
});
