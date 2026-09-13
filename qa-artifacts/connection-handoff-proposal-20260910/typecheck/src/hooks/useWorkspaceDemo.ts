import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { demoWorkspace } from '../data/demo';
import type { Agent, ChatMessage, DemoExecutionStep, WorkspaceDemoState } from '../types';

const demoChunks = [
  'I split this demo request into a bounded implementation and review. ',
  'The build member prepared the active artifact; the review member checked its visible states. ',
  'The sample result is ready to open from this conversation.',
];

function workingAgents(): Agent[] {
  return demoWorkspace.agents.map((agent) => ({ ...agent, status: 'working', phase: agent.role === 'lead' ? 'planning' : 'drafting' }));
}

function completedAgents(): Agent[] {
  return demoWorkspace.agents.map((agent) => ({ ...agent, status: 'done', phase: 'complete' }));
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  agents: Agent[];
  steps: DemoExecutionStep[];
}

const initialConversation: Conversation = {
  id: 'conversation-initial',
  title: 'A calmer workspace',
  messages: demoWorkspace.messages,
  agents: demoWorkspace.agents,
  steps: demoWorkspace.steps,
};

// Versioned tab-local preview history. Reject invalid data rather than replacing it.
const storageKey = 'rivune-conversations-v1';
const maxStorageLength = 1_000_000;
const maxConversations = 60;
interface StoredConversations {
  version: 1;
  activeConversationId: string;
  conversations: Conversation[];
}
interface RestoredConversations extends StoredConversations {
  persistenceStatus: 'session' | 'memory';
  persistenceNotice: string | null;
}
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isText = (value: unknown, max = 64_000): value is string => typeof value === 'string' && value.length <= max;
const isId = (value: unknown): value is string => isText(value, 128) && /^[a-zA-Z0-9_-]+$/.test(value);
const optionalId = (value: unknown) => value === undefined || isId(value);
const optionalText = (value: unknown) => value === undefined || isText(value);
const inList = (value: unknown, choices: string[]) => typeof value === 'string' && choices.includes(value);
const statuses = ['idle', 'working', 'waiting', 'done', 'failed', 'cancelled'];
const phases = ['idle', 'planning', 'drafting', 'reviewing', 'integrating', 'complete', 'cancelled', 'failed'];
function validList(value: unknown, limit: number, validate: (item: Record<string, unknown>) => boolean): boolean {
  if (!Array.isArray(value) || value.length > limit) return false;
  const ids = new Set<string>();
  return value.every((item: unknown) => {
    if (!isRecord(item) || !isId(item.id) || ids.has(item.id) || !validate(item)) return false;
    ids.add(item.id);
    return true;
  });
}
function validStorage(value: unknown): value is StoredConversations {
  if (!isRecord(value) || value.version !== 1 || !isId(value.activeConversationId)) return false;
  if (!validList(value.conversations, maxConversations, (conversation) =>
    isText(conversation.title, 200) &&
    validList(conversation.messages, 400, (message) =>
      inList(message.role, ['user', 'assistant', 'system']) && isText(message.content) &&
      optionalId(message.agentId) && optionalId(message.artifactId) &&
      (message.streaming === undefined || typeof message.streaming === 'boolean')) &&
    validList(conversation.agents, 24, (agent) =>
      isText(agent.name, 200) && inList(agent.role, ['lead', 'member']) &&
      inList(agent.status, statuses) && inList(agent.phase, phases)) &&
    validList(conversation.steps, 100, (step) =>
      isId(step.agentId) && isText(step.label, 500) && inList(step.status, statuses) &&
      Array.isArray(step.dependsOn) && step.dependsOn.length <= 100 && step.dependsOn.every(isId) &&
      isText(step.inputSummary) && optionalText(step.outputSummary) && optionalId(step.artifactId) && step.source === 'demo')
  )) return false;
  return (value.conversations as Conversation[]).some((conversation) => conversation.id === value.activeConversationId);
}
function cancelRestoredWork(conversation: Conversation): Conversation {
  const interrupted = conversation.messages.some((message) => message.streaming) ||
    conversation.agents.some((agent) => agent.status === 'working') || conversation.steps.some((step) => step.status === 'working');
  if (!interrupted) return conversation;
  return {
    ...conversation,
    messages: conversation.messages.map((message) => message.streaming ? {
      ...message, streaming: false, content: `${message.content}\n\nDemo interrupted by page reload. Send a new message to try again.`,
    } : message),
    agents: conversation.agents.map((agent) => agent.status === 'working' || agent.status === 'waiting' ? { ...agent, status: 'cancelled', phase: 'cancelled' } : agent),
    steps: conversation.steps.map((step) => step.status === 'working' || step.status === 'waiting' ? { ...step, status: 'cancelled', artifactId: undefined, outputSummary: 'Demo interrupted by page reload' } : step),
  };
}
function restoreConversations(): RestoredConversations {
  const restored: RestoredConversations = {
    version: 1, activeConversationId: initialConversation.id, conversations: [initialConversation],
    persistenceStatus: 'session', persistenceNotice: null,
  };
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw !== null) {
      let stored: unknown;
      try { stored = raw.length <= maxStorageLength ? JSON.parse(raw) : null; } catch { stored = null; }
      if (!validStorage(stored)) {
        restored.persistenceStatus = 'memory';
        restored.persistenceNotice = 'Saved preview history could not be read. It remains untouched; this session is using temporary in-memory history.';
      } else {
        restored.activeConversationId = stored.activeConversationId;
        restored.conversations = stored.conversations.map(cancelRestoredWork);
      }
    }
    // Older previews stored drafts independently. Retain their original IDs so
    // ChatPanel can recover the text, without inventing missing chat history.
    const storage = window.sessionStorage;
    for (let index = 0; index < storage.length && restored.conversations.length < maxConversations; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith('rivune-draft-')) continue;
      const id = key.slice('rivune-draft-'.length);
      if (!isId(id) || restored.conversations.some((conversation) => conversation.id === id)) continue;
      const draft = storage.getItem(key);
      if (!draft?.trim() || draft.length > 64_000) continue;
      restored.conversations.push({
        id, title: 'Recovered draft', messages: [], steps: [],
        agents: demoWorkspace.agents.map((agent) => ({ ...agent, status: 'idle', phase: 'idle' })),
      });
    }
  } catch {
    restored.persistenceStatus = 'memory';
    restored.persistenceNotice = 'Browser session storage is unavailable. Preview history will remain in memory until this page closes or reloads.';
  }
  return restored;
}

export function useWorkspaceDemo(): WorkspaceDemoState {
  const [activeFileId, setActiveFileId] = useState(demoWorkspace.files[0]?.id ?? '');
  const [restored] = useState(restoreConversations);
  const [conversationData, setConversationData] = useState<Conversation[]>(restored.conversations);
  const [activeConversationId, setActiveConversationId] = useState(restored.activeConversationId);
  const [persistenceStatus, setPersistenceStatus] = useState(restored.persistenceStatus);
  const [persistenceNotice, setPersistenceNotice] = useState(restored.persistenceNotice);
  useEffect(() => {
    if (persistenceStatus !== 'session') return;
    const snapshot: StoredConversations = { version: 1, activeConversationId, conversations: conversationData };
    try {
      const raw = JSON.stringify(snapshot);
      if (raw.length > maxStorageLength || !validStorage(snapshot)) {
        setPersistenceStatus('memory');
        setPersistenceNotice('Preview history has reached its session storage limit. Further changes stay in memory; the last saved history remains available on reload.');
        return;
      }
      window.sessionStorage.setItem(storageKey, raw);
    } catch {
      setPersistenceStatus('memory');
      setPersistenceNotice('Preview history could not be saved in this browser tab. Further changes stay in memory; any previously saved history remains untouched.');
    }
  }, [activeConversationId, conversationData, persistenceStatus]);
  const conversationSequence = useRef(0);
  const activeConversation = conversationData.find((conversation) => conversation.id === activeConversationId) ?? initialConversation;
  const { agents, messages, steps } = activeConversation;

  const updateConversation = useCallback((update: (current: Conversation) => Conversation) => {
    setConversationData((current) => current.map((conversation) => conversation.id === activeConversationId ? update(conversation) : conversation));
  }, [activeConversationId]);

  const setMessages = useCallback((update: SetStateAction<ChatMessage[]>) => {
    updateConversation((current) => ({ ...current, messages: typeof update === 'function' ? update(current.messages) : update }));
  }, [updateConversation]);
  const setAgents = useCallback((update: SetStateAction<Agent[]>) => {
    updateConversation((current) => ({ ...current, agents: typeof update === 'function' ? update(current.agents) : update }));
  }, [updateConversation]);
  const setSteps = useCallback((update: SetStateAction<DemoExecutionStep[]>) => {
    updateConversation((current) => ({ ...current, steps: typeof update === 'function' ? update(current.steps) : update }));
  }, [updateConversation]);
  const [isStreaming, setIsStreaming] = useState(false);
  const timers = useRef<number[]>([]);
  const requestSequence = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    requestSequence.current += 1;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const selectFile = useCallback((id: string) => {
    if (demoWorkspace.files.some((file) => file.id === id)) setActiveFileId(id);
  }, []);

  const stopDemoStream = useCallback(() => {
    clearTimers();
    if (!isStreaming) return;
    setIsStreaming(false);
    setAgents((current) => current.map((agent) => (agent.status === 'working' || agent.status === 'waiting') ? { ...agent, status: 'cancelled', phase: 'cancelled' } : agent));
    setMessages((current) => current.map((message) => message.streaming ? { ...message, streaming: false, content: `${message.content}\n\nDemo stream stopped locally.` } : message));
    setSteps((current) => current.map((step) => (step.status === 'working' || step.status === 'waiting') ? { ...step, status: 'cancelled', artifactId: undefined, outputSummary: 'Demo step stopped locally' } : step));
  }, [clearTimers, isStreaming, setAgents, setMessages, setSteps]);

  const selectConversation = useCallback((id: string) => {
    if (id === activeConversationId || !conversationData.some((conversation) => conversation.id === id)) return;
    stopDemoStream();
    setActiveConversationId(id);
  }, [activeConversationId, conversationData, stopDemoStream]);

  const newConversation = useCallback(() => {
    stopDemoStream();
    conversationSequence.current += 1;
    const id = `conversation-${Date.now()}-${conversationSequence.current}`;
    setConversationData((current) => [{
      id,
      title: 'New conversation',
      messages: [],
      agents: demoWorkspace.agents.map((agent) => ({ ...agent, status: 'idle', phase: 'idle' })),
      steps: [],
    }, ...current]);
    setActiveConversationId(id);
  }, [stopDemoStream]);

  const sendDemoMessage = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    clearTimers();
    requestSequence.current += 1;
    const sequence = requestSequence.current;
    const requestId = crypto.randomUUID();
    const assistantId = `demo-assistant-${requestId}`;

    updateConversation((current) => current.messages.some((message) => message.role === 'user') ? current : {
      ...current,
      title: text.length > 48 ? `${text.slice(0, 47)}…` : text,
    });
    setAgents(workingAgents());
    setSteps(demoWorkspace.steps.map((step, index) => ({
      ...step,
      status: index === 0 ? 'working' : 'waiting',
      outputSummary: index === 0 ? undefined : step.outputSummary,
    })));
    setIsStreaming(true);
    setMessages((current) => [
      ...current.map((message) => ({ ...message, streaming: false })),
      { id: `demo-user-${requestId}`, role: 'user', content: text },
      { id: assistantId, role: 'assistant', agentId: 'lead', content: '', streaming: true },
    ]);

    demoChunks.forEach((chunk, index) => {
      const timer = window.setTimeout(() => {
        if (sequence !== requestSequence.current) return;
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + chunk } : message));
        if (index === 0) {
          setAgents((current) => current.map((agent) => ({ ...agent, phase: agent.role === 'lead' ? 'integrating' : 'reviewing' })));
          setSteps((current) => current.map((step) => {
            if (step.id === 'scope') return { ...step, status: 'done', outputSummary: 'Two bounded demo assignments' };
            if (step.id === 'implement' || step.id === 'review') return { ...step, status: 'working' };
            return step;
          }));
        }
        if (index === 1) {
          setSteps((current) => current.map((step) => {
            if (step.id === 'implement' || step.id === 'review') return { ...step, status: 'done' };
            if (step.id === 'integrate') return { ...step, status: 'working' };
            return step;
          }));
        }
        if (index === demoChunks.length - 1) {
          setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, streaming: false, artifactId: 'status-code' } : message));
          setAgents(completedAgents());
          setSteps((current) => current.map((step) => ({ ...step, status: 'done' })));
          setIsStreaming(false);
          timers.current = [];
        }
      }, 1_600 * (index + 1));
      timers.current.push(timer);
    });
  }, [clearTimers, setAgents, setMessages, setSteps, updateConversation]);

  const conversations = conversationData.map(({ id, title }) => ({ id, title }));
  return { ...demoWorkspace, agents, messages, steps, activeFileId, isStreaming, persistenceStatus, persistenceNotice, conversations, activeConversationId, newConversation, selectConversation, selectFile, sendDemoMessage, stopDemoStream };
}
