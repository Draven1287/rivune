import test from 'node:test';
import assert from 'node:assert/strict';
import { arrivalPresentation, arrivalDurationMs } from '../app/workspace/arrival-contract.ts';

test('a cached ready connection cannot skip the twelve-second preparation', () => {
  for (const elapsed of [0, 500, 2_700, 8_000, arrivalDurationMs - 1]) {
    const result = arrivalPresentation(elapsed, 'ready', true);
    assert.equal(result.ready, false);
    assert.equal(result.destination, null);
    assert.ok(result.percentage < 100);
  }
  const complete = arrivalPresentation(arrivalDurationMs, 'ready', true);
  assert.equal(complete.percentage, 100);
  assert.equal(complete.destination, 'workspace');
});
test('missing or checking connections finish the reveal and go to setup, never chat', () => {
  for (const phase of ['checking', 'needsConnection']) {
    const result = arrivalPresentation(arrivalDurationMs, phase, true);
    assert.equal(result.ready, false);
    assert.equal(result.percentage, 100);
    assert.equal(result.finished, true);
    assert.equal(result.destination, 'setup');
  }
  const halfway = arrivalPresentation(arrivalDurationMs / 2, 'needsConnection', true);
  assert.equal(halfway.percentage, 50);
  assert.equal(halfway.destination, null);
});
test('artwork must finish preparing and malformed elapsed time cannot skip the reveal', () => {
  const waitingForArt = arrivalPresentation(20_000, 'ready', false);
  assert.equal(waitingForArt.ready, false);
  assert.equal(waitingForArt.finished, false);
  assert.equal(waitingForArt.destination, null);
  assert.equal(waitingForArt.percentage, 99);
  for (const elapsed of [NaN, Infinity, -1]) {
    const result = arrivalPresentation(elapsed, 'ready', true);
    assert.equal(result.percentage, 0);
    assert.equal(result.destination, null);
  }
});
test('destination follows current readiness even after the reveal has finished', () => {
  assert.equal(arrivalPresentation(40_000, 'ready', true).destination, 'workspace');
  assert.equal(arrivalPresentation(40_000, 'needsConnection', true).destination, 'setup');
  assert.equal(arrivalPresentation(40_000, 'checking', true).destination, 'setup');
});
