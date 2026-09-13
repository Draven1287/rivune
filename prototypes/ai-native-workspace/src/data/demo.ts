import type { WorkspaceDemoData } from '../types';

const originalStatusCode = `export type AgentStatus = 'idle' | 'working' | 'done';

export function statusLabel(status: AgentStatus) {
  return status;
}`;

const revisedStatusCode = `export type AgentStatus = 'idle' | 'working' | 'waiting' | 'done';

export function statusLabel(status: AgentStatus) {
  const labels: Record<AgentStatus, string> = {
    idle: 'Ready',
    working: 'Working',
    waiting: 'Waiting for a dependency',
    done: 'Ready for review',
  };

  return labels[status];
}`;

const authoredPreview = JSON.stringify({
  schemaVersion: 1,
  title: 'Make space for your next idea.',
  body: 'A calm home for things you want to build.',
  accent: 'emerald',
  layout: 'split',
}, null, 2);

export const demoWorkspace: WorkspaceDemoData = {
  files: [
    { id: 'agent-status', name: 'agentStatus.ts', path: 'src/workspace/agentStatus.ts', language: 'typescript', originalContent: originalStatusCode, content: revisedStatusCode },
    { id: 'workspace-preview', name: 'workspace-preview.json', path: 'artifacts/workspace-preview.json', language: 'json', content: authoredPreview },
    { id: 'readme', name: 'README.md', path: 'README.md', language: 'markdown', content: '# Rivune workspace demo\n\nAll activity and data in this preview are synthetic.' },
  ],
  agents: [
    { id: 'lead', name: 'Rivune Lead', role: 'lead', status: 'working', phase: 'integrating' },
    { id: 'builder', name: 'Build member', role: 'member', status: 'done', phase: 'complete' },
    { id: 'reviewer', name: 'Review member', role: 'member', status: 'working', phase: 'reviewing' },
  ],
  messages: [
    { id: 'welcome-system', role: 'system', content: 'Demo workspace — no provider is connected and no commands are executed.' },
    { id: 'demo-request', role: 'user', content: 'Make agent states easier to understand, then have another member review the change.' },
    { id: 'demo-response', artifactId: 'status-code', role: 'assistant', agentId: 'lead', content: 'The build member prepared clearer labels. The review member is checking waiting, active, and completed states. Open the sample result below to inspect the proposed file and diff.' },
  ],
  artifacts: [
    { id: 'status-code', title: 'Agent status labels', kind: 'code', fileId: 'agent-status', content: revisedStatusCode },
    { id: 'static-preview', title: 'Workspace result preview', kind: 'web', fileId: 'workspace-preview', content: authoredPreview },
  ],
  terminals: [
    { id: 'demo-terminal', title: 'Demo terminal', status: 'complete', lines: ['$ npm run check', 'Synthetic transcript — no command was executed.', '3 demo states prepared for review.'] },
  ],
  environment: [
    { name: 'RIVUNE_MODE', maskedValue: 'demo', synthetic: true },
    { name: 'AI_API_KEY', maskedValue: '•••••••• (not connected)', synthetic: true },
  ],
  telemetry: { source: 'unavailable', inputTokens: null, outputTokens: null, elapsedMs: null, tokensPerSecond: null, costUsd: null },
  steps: [
    { id: 'scope', agentId: 'lead', label: 'Scope the request', status: 'done', dependsOn: [], inputSummary: 'User request', outputSummary: 'Two bounded assignments', source: 'demo' },
    { id: 'implement', agentId: 'builder', label: 'Prepare the change', status: 'done', dependsOn: ['scope'], inputSummary: 'Status labels and visible states', outputSummary: 'Code artifact prepared', artifactId: 'status-code', source: 'demo' },
    { id: 'review', agentId: 'reviewer', label: 'Review the visible states', status: 'working', dependsOn: ['scope', 'implement'], inputSummary: 'Idle, active, waiting, and complete states', outputSummary: 'Demo review in progress', artifactId: 'static-preview', source: 'demo' },
    { id: 'integrate', agentId: 'lead', label: 'Integrate one result', status: 'waiting', dependsOn: ['review'], inputSummary: 'Reviewed member contributions', source: 'demo' },
  ],
  commands: [
    { id: 'council', label: '/council', description: 'Draft and review from multiple demo roles', insertText: '/council ' },
    { id: 'build', label: '/build', description: 'Prepare a bounded implementation plan', insertText: '/build ' },
    { id: 'review', label: '/review', description: 'Inspect the active artifact for gaps', insertText: '/review ' },
    { id: 'explain', label: '/explain', description: 'Explain the selected file', insertText: '/explain ' },
  ],
};
