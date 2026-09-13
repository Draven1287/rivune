export type AgentStatus = 'idle' | 'working' | 'waiting' | 'done' | 'failed' | 'cancelled';

export type ObservablePhase =
  | 'idle'
  | 'planning'
  | 'drafting'
  | 'reviewing'
  | 'integrating'
  | 'complete'
  | 'cancelled'
  | 'failed';

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  originalContent?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: 'lead' | 'member';
  status: AgentStatus;
  /** Observable demo/runtime phase only. Never private chain of thought. */
  phase: ObservablePhase;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  streaming?: boolean;
  artifactId?: string;
}

export interface Artifact {
  id: string;
  title: string;
  kind: 'code' | 'web' | 'text';
  fileId?: string;
  content: string;
}

export interface TerminalSession {
  id: string;
  title: string;
  lines: string[];
  status: 'idle' | 'running' | 'complete' | 'failed';
}

export interface EnvironmentVariable {
  name: string;
  maskedValue: string;
  synthetic: true;
}

export interface Telemetry {
  source: 'demo' | 'measured' | 'unavailable';
  inputTokens: number | null;
  outputTokens: number | null;
  elapsedMs: number | null;
  tokensPerSecond: number | null;
  costUsd: number | null;
}

export interface DemoExecutionStep {
  id: string;
  agentId: string;
  label: string;
  status: AgentStatus | 'cancelled';
  dependsOn: string[];
  inputSummary: string;
  outputSummary?: string;
  artifactId?: string;
  source: 'demo';
}

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  insertText: string;
}

export interface WorkspaceDemoData {
  files: WorkspaceFile[];
  agents: Agent[];
  messages: ChatMessage[];
  artifacts: Artifact[];
  terminals: TerminalSession[];
  environment: EnvironmentVariable[];
  telemetry: Telemetry;
  steps: DemoExecutionStep[];
  commands: SlashCommand[];
}

export interface ConversationSummary {
  id: string;
  title: string;
}

export interface WorkspaceDemoState extends WorkspaceDemoData {
  /** Preview-only storage for this browser tab; never host history. */
  persistenceStatus: 'session' | 'memory';
  persistenceNotice: string | null;
  conversations: ConversationSummary[];
  activeConversationId: string;
  newConversation: () => void;
  selectConversation: (id: string) => void;
  activeFileId: string;
  isStreaming: boolean;
  selectFile: (id: string) => void;
  sendDemoMessage: (text: string) => void;
  stopDemoStream: () => void;
}

export interface WorkspaceAdapterSnapshot extends WorkspaceDemoData {
  activeFileId: string;
  isStreaming: boolean;
}

export interface WorkspaceAdapter {
  getSnapshot: () => WorkspaceAdapterSnapshot;
  subscribe: (listener: () => void) => () => void;
  selectFile: (id: string) => void;
  sendMessage: (text: string) => void;
  cancel: () => void;
}

/* Compatibility types for the PM's pre-contract, unused mock fixture. */
export type AgentPhase = 'idle' | 'planning' | 'executing' | 'reviewing' | 'complete' | 'cancelled' | 'error';
export type AgentId = string;
export type ArtifactId = string;

interface LegacyAgent {
  id: AgentId;
  name: string;
  role: 'lead' | 'builder' | 'reviewer';
  model: string;
  phase: AgentPhase;
  task: string;
  publicSummary: string;
  artifactIds: ArtifactId[];
  color: 'emerald' | 'sky' | 'violet';
}

interface LegacyArtifact {
  id: ArtifactId;
  name: string;
  path: string;
  language: 'typescript' | 'html';
  authorId: AgentId;
  kind: 'code' | 'web';
  original: string;
  content: string;
  version: number;
}

interface LegacyChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  agentId?: AgentId;
  content: string;
  state: 'complete' | 'streaming' | 'cancelled';
  artifactIds: ArtifactId[];
  createdAt: number;
}

export interface ExecutionStep {
  id: string;
  agentId: AgentId;
  title: string;
  phase: AgentPhase;
  durationMs: number;
  dependsOn: string[];
  input: Record<string, string | number>;
  output: Record<string, string | number>;
}

interface LegacyTerminalSession {
  id: string;
  name: string;
  cwd: string;
  lines: string[];
}

interface LegacyEnvironmentVariable {
  name: string;
  source: 'project' | 'host-secret-store';
  displayValue: string;
  sensitive: boolean;
}

interface LegacyTelemetry {
  source: 'mock';
  outputTokens: number;
  tokensPerSecond: number;
  elapsedMs: number;
  latencyMs: number;
}

export interface WorkspaceState {
  project: { id: string; name: string; branch: string };
  agents: LegacyAgent[];
  artifacts: LegacyArtifact[];
  messages: LegacyChatMessage[];
  steps: ExecutionStep[];
  terminals: LegacyTerminalSession[];
  environment: LegacyEnvironmentVariable[];
  telemetry: LegacyTelemetry;
  selectedAgentId: AgentId;
  selectedArtifactId: ArtifactId;
  selectedStepId: string;
}

export type WorkspaceAction =
  | { type: 'select-agent'; id: AgentId }
  | { type: 'select-artifact'; id: ArtifactId }
  | { type: 'select-step'; id: string }
  | { type: 'edit-artifact'; id: ArtifactId; content: string }
  | { type: 'start'; prompt: string; requestId: string; at: number }
  | { type: 'chunk'; requestId: string; text: string }
  | { type: 'finish'; requestId: string }
  | { type: 'cancel' };
