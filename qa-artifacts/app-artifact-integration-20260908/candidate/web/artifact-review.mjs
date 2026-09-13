import { mountArtifactViewer } from './artifact-viewer.mjs';
import { mountCapturedDiff } from './diff-viewer.mjs';

// Optional read-only methods must be backed by real host commands before exposure.
export function artifactReads(host) {
  if (!host) return null;
  const catalog = ['listArtifacts', 'readArtifactFile'].every(k => typeof host[k] === 'function');
  const diff = typeof host.readPreparedDiff === 'function';
  if (!catalog && !diff) return null;
  return Object.freeze({
    ...(catalog ? {
      listArtifacts: ({conversationId}) => host.listArtifacts({conversationId}),
      readArtifactFile: ({artifactId, expectedRevisionSha256, path}) => host.readArtifactFile({artifactId, expectedRevisionSha256, path}),
    } : {}),
    ...(diff ? {readPreparedDiff: ({preparedOperationId, expectedCapturedSnapshotSha256, fileIndex, beforeOffset, afterOffset}) => host.readPreparedDiff({preparedOperationId, expectedCapturedSnapshotSha256, fileIndex, beforeOffset, afterOffset})} : {}),
  });
}

export function initializeArtifactReview({host, document: d = document}) {
  const adapter = artifactReads(host);
  if (!adapter) return Object.freeze({update() {}, openPrepared() { return false; }});
  const dialog = d.createElement('dialog');
  dialog.className = 'artifact-review-dialog';
  dialog.setAttribute('aria-label', 'Artifact review');
  const close = d.createElement('button'); close.type = 'button'; close.textContent = 'Close artifact review';
  close.className = 'text-button';
  const body = d.createElement('div'); dialog.append(close, body); d.body.append(dialog);
  const trigger = d.createElement('button'); trigger.type = 'button'; trigger.textContent = 'Artifacts';
  trigger.className = 'text-button'; trigger.hidden = true;
  if (adapter.listArtifacts) d.querySelector('.conversation-header').append(trigger);
  let conversationId = null, viewer = null, returnFocus = null;
  function clear() { viewer?.destroy(); viewer = null; body.replaceChildren(); }
  function end() { clear(); if (returnFocus?.isConnected && !returnFocus.hidden) returnFocus.focus(); returnFocus = null; }
  function dismiss() { clear(); if (dialog.open) dialog.close(); }
  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', () => clear());
  dialog.addEventListener('close', end);
  trigger.addEventListener('click', () => {
    if (!conversationId || !adapter.listArtifacts) return;
    clear(); returnFocus = d.activeElement;
    viewer = mountArtifactViewer({container: body, adapter});
    dialog.showModal(); close.focus(); void viewer.load(conversationId);
  });
  return Object.freeze({
    update(id) {
      if (id !== conversationId) dismiss();
      conversationId = id; trigger.hidden = !id || !adapter.listArtifacts;
    },
    // Future accepted prepared-operation selection calls this directly; no prepare/write action here.
    openPrepared(prepared) {
      if (!adapter.readPreparedDiff || !conversationId || prepared?.ownerConversationId !== conversationId || prepared.state !== 'prepared') return false;
      clear(); returnFocus = d.activeElement;
      viewer = mountCapturedDiff({container: body, adapter});
      if (!dialog.open) dialog.showModal(); close.focus(); void viewer.setPrepared(prepared); return true;
    },
  });
}
