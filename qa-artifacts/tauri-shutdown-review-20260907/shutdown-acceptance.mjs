#!/usr/bin/env node
import assert from "node:assert/strict";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class ShutdownFixture {
  constructor({ persistDraft, cancelAndReap, persistRecovery }) {
    this.persistDraft = persistDraft;
    this.cancelAndReap = cancelAndReap;
    this.persistRecovery = persistRecovery;
    this.latestDraftRevision = 0;
    this.durableDraftRevision = 0;
    this.activeChildren = new Set();
    this.state = "open";
    this.status = "Idle";
    this.appOpen = true;
    this.exitCalls = 0;
    this.startedShutdowns = 0;
    this.shutdownPromise = null;
    this.triggers = [];
  }

  editDraft(revision) {
    assert.ok(Number.isSafeInteger(revision) && revision > this.latestDraftRevision);
    this.latestDraftRevision = revision;
  }

  startChild(id) {
    this.activeChildren.add(id);
  }

  requestShutdown(trigger) {
    this.triggers.push(trigger);
    if (this.shutdownPromise) return { accepted: true, started: false };
    this.state = "requested";
    this.startedShutdowns += 1;
    this.shutdownPromise = Promise.resolve().then(() => this.#drain());
    return { accepted: true, started: true };
  }

  async #persistLatestDraft() {
    while (this.durableDraftRevision < this.latestDraftRevision) {
      const requestedRevision = this.latestDraftRevision;
      const durableRevision = await this.persistDraft(requestedRevision);
      if (durableRevision !== requestedRevision) throw new Error("latest draft revision was not durably acknowledged");
      this.durableDraftRevision = durableRevision;
    }
  }

  async #drain() {
    this.state = "draining";
    try {
      await this.#persistLatestDraft();
      await this.cancelAndReap(this.activeChildren);
      if (this.activeChildren.size !== 0) throw new Error("owned provider children remain active");
      await this.persistRecovery();
      await this.#persistLatestDraft();
      if (this.durableDraftRevision !== this.latestDraftRevision) throw new Error("draft advanced after the final persistence gate");
      this.state = "exited";
      this.appOpen = false;
      this.exitCalls += 1;
    } catch (error) {
      this.state = "failed";
      this.status = "NeedsAttention";
      this.appOpen = true;
      this.failure = error.message;
    }
  }
}

async function testSharedIdempotentPathAndResponsiveRequest() {
  const cleanupGate = deferred();
  const order = [];
  const fixture = new ShutdownFixture({
    persistDraft: async revision => { order.push(`draft:${revision}`); return revision; },
    cancelAndReap: async children => { order.push("cleanup:start"); await cleanupGate.promise; children.clear(); order.push("cleanup:done"); },
    persistRecovery: async () => { order.push("recovery"); }
  });
  fixture.editDraft(1); fixture.startChild("provider-1");
  assert.deepEqual(fixture.requestShutdown("tray-quit"), { accepted: true, started: true });
  assert.deepEqual(fixture.requestShutdown("window-close"), { accepted: true, started: false });
  assert.deepEqual(fixture.requestShutdown("duplicate-exit"), { accepted: true, started: false });
  assert.equal(fixture.state, "requested");
  assert.equal(fixture.appOpen, true);
  await Promise.resolve();
  assert.equal(fixture.state, "draining");
  assert.equal(fixture.appOpen, true);
  while (!order.includes("cleanup:start")) await Promise.resolve();
  fixture.editDraft(2);
  cleanupGate.resolve();
  await fixture.shutdownPromise;
  assert.equal(fixture.startedShutdowns, 1);
  assert.equal(fixture.exitCalls, 1);
  assert.equal(fixture.durableDraftRevision, 2);
  assert.deepEqual(order, ["draft:1", "cleanup:start", "cleanup:done", "recovery", "draft:2"]);
}

async function testCleanupFailureKeepsAppOpen() {
  const fixture = new ShutdownFixture({
    persistDraft: async revision => revision,
    cancelAndReap: async () => { throw new Error("provider cleanup failed"); },
    persistRecovery: async () => {}
  });
  fixture.startChild("provider-1");
  fixture.requestShutdown("window-close");
  await fixture.shutdownPromise;
  assert.equal(fixture.state, "failed");
  assert.equal(fixture.status, "NeedsAttention");
  assert.equal(fixture.appOpen, true);
  assert.equal(fixture.exitCalls, 0);
}

async function testDraftFailureKeepsAppOpen() {
  const fixture = new ShutdownFixture({
    persistDraft: async () => { throw new Error("draft persistence failed"); },
    cancelAndReap: async children => children.clear(),
    persistRecovery: async () => {}
  });
  fixture.editDraft(1);
  fixture.requestShutdown("tray-quit");
  await fixture.shutdownPromise;
  assert.equal(fixture.state, "failed");
  assert.equal(fixture.status, "NeedsAttention");
  assert.equal(fixture.appOpen, true);
  assert.equal(fixture.exitCalls, 0);
}

async function testRecoveryFailureKeepsAppOpenAfterReap() {
  const fixture = new ShutdownFixture({
    persistDraft: async revision => revision,
    cancelAndReap: async children => children.clear(),
    persistRecovery: async () => { throw new Error("terminal recovery persistence failed"); }
  });
  fixture.startChild("provider-1");
  fixture.requestShutdown("duplicate-exit");
  await fixture.shutdownPromise;
  assert.equal(fixture.activeChildren.size, 0);
  assert.equal(fixture.state, "failed");
  assert.equal(fixture.appOpen, true);
  assert.equal(fixture.exitCalls, 0);
}

await testSharedIdempotentPathAndResponsiveRequest();
await testCleanupFailureKeepsAppOpen();
await testDraftFailureKeepsAppOpen();
await testRecoveryFailureKeepsAppOpenAfterReap();
console.log("shutdown model checks: 4 passed, 0 failed (not production acceptance)");
