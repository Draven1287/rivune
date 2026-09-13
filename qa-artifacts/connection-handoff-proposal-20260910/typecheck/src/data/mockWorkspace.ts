import type { WorkspaceState } from '../types';

const original = `type Status = 'idle' | 'running';

export function getStatusLabel(status: Status) {
  return status;
}`;
const content = `type Status = 'idle' | 'running' | 'complete';

export function getStatusLabel(status: Status) {
  const labels: Record<Status, string> = {
    idle: 'Ready to begin',
    running: 'Working on your request',
    complete: 'Ready for review',
  };
  return labels[status];
}`;

export const mockWorkspace: WorkspaceState = {
  project: { id: 'project-orbit', name: 'Orbit Console', branch: 'feature/agent-status' },
  selectedAgentId: 'lead', selectedArtifactId: 'status', selectedStepId: 'review',
  agents: [
    { id: 'lead', name: 'Orion', role: 'lead', model: 'Mock lead', phase: 'reviewing', task: 'Integrate one reviewed result', publicSummary: 'Comparing implementation with the requested behavior.', artifactIds: ['status', 'preview'], color: 'emerald' },
    { id: 'builder', name: 'Nova', role: 'builder', model: 'Mock code model', phase: 'complete', task: 'Build the status component', publicSummary: 'Implementation prepared for review.', artifactIds: ['status'], color: 'sky' },
    { id: 'reviewer', name: 'Atlas', role: 'reviewer', model: 'Mock review model', phase: 'reviewing', task: 'Check states and accessibility', publicSummary: 'Inspecting empty, active, and completed states.', artifactIds: ['preview'], color: 'violet' },
  ],
  artifacts: [
    { id: 'status', name: 'status.ts', path: 'src/components/status.ts', language: 'typescript', kind: 'code', authorId: 'builder', original, content, version: 2 },
    { id: 'preview', name: 'preview.html', path: 'src/preview.html', language: 'html', kind: 'web', authorId: 'lead', original: '<h1>Orbit Console</h1>', version: 1, content: `<!doctype html><html><head><style>
body{margin:0;background:#111419;color:#e9edf1;font:15px system-ui;padding:36px}small{color:#76dfb0;letter-spacing:2px}h1{font-size:36px;letter-spacing:-1.5px;margin-bottom:12px}p{color:#a1a9b5;line-height:1.7}article{border:1px solid #303740;border-radius:16px;padding:24px;margin-top:30px;background:#1b2027}.dot{display:inline-block;background:#70ddb0;width:8px;height:8px;border-radius:50%;margin-right:10px}button{background:#a4edce;border:0;border-radius:8px;padding:12px 16px;color:#123126;font-weight:600}
</style></head><body><small>ORBIT / WORKSPACE</small><h1>A little less busywork.</h1><p>Your agents are working together.<br>One request. One reviewed result.</p><article><span class="dot"></span>Ready for review<p>All contributions stay connected to their source.</p><button>Review changes</button></article></body></html>` },
  ],
  messages: [
    { id: 'intro', role: 'user', content: 'Make agent states easier to understand. Keep the interface quiet, and let me inspect the result.', state: 'complete', artifactIds: [], createdAt: 1 },
    { id: 'reply', role: 'assistant', agentId: 'lead', content: 'I split this into implementation and an independent UI review. Nova prepared the status labels; Atlas is checking the transitions.\n\nThe proposed change is open beside this conversation. You can edit the code, inspect the diff, or open the live HTML canvas.', state: 'complete', artifactIds: ['status', 'preview'], createdAt: 2 },
  ],
  steps: [
    { id: 'plan', agentId: 'lead', title: 'Scope the change', phase: 'complete', durationMs: 320, dependsOn: [], input: { request: 'Improve agent states' }, output: { tasks: 2, strategy: 'Independent implementation + review' } },
    { id: 'build', agentId: 'builder', title: 'Prepare status labels', phase: 'complete', durationMs: 1840, dependsOn: ['plan'], input: { file: 'status.ts' }, output: { artifact: 'status', version: 2 } },
    { id: 'review', agentId: 'reviewer', title: 'Review visible states', phase: 'reviewing', durationMs: 920, dependsOn: ['plan', 'build'], input: { states: 3, artifact: 'status' }, output: { result: 'Review in progress — mock fixture' } },
  ],
  terminals: [
    { id: 'dev', name: 'Dev server', cwd: '~/orbit-console', lines: ['$ npm run dev', 'Mock terminal — no command was executed.', 'Preview fixture ready · no server connection'] },
    { id: 'checks', name: 'Checks', cwd: '~/orbit-console', lines: ['$ npm test', 'Mock transcript: 3 state cases prepared.', 'Connect a host runner to obtain actual test results.'] },
  ],
  environment: [
    { name: 'NODE_ENV', source: 'project', displayValue: 'development', sensitive: false },
    { name: 'AI_API_KEY', source: 'host-secret-store', displayValue: '•••••••• (not connected)', sensitive: true },
  ],
  telemetry: { source: 'mock', outputTokens: 842, tokensPerSecond: 0, elapsedMs: 3080, latencyMs: 240 },
};
