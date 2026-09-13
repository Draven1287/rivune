/** Deterministic scheduling foundation. Does not launch agents or call providers. */
export type TaskState = 'ready' | 'running' | 'review' | 'done' | 'blocked';
export interface QueueAgent { id: string; capabilities: string[] }
export interface TaskDefinition { id: string; dependencies?: string[]; capabilities: string[] }
export interface QueueTask {
  id: string; dependencies: string[]; capabilities: string[]; state: TaskState;
  workerId?: string; reviewerId?: string; blockedReason?: string;
}
export interface TaskAssignment { taskId: string; agentId: string; kind: 'work' | 'review' }

function validId(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= 200; }
function validList(values: string[]): boolean { return Array.isArray(values) && values.length <= 200 && values.every(validId) && new Set(values).size === values.length; }

export class AgentTaskQueue {
  private readonly tasks = new Map<string, QueueTask>();
  private readonly agents = new Map<string, QueueAgent>();
  private readonly busy = new Map<string, string>();
  private readonly holds = new Map<string, string>();

  constructor(definitions: TaskDefinition[], agents: QueueAgent[]) {
    if (definitions.length > 200 || agents.length > 64) throw new Error('Queue limit exceeded');
    for (const agent of agents) {
      if (!validId(agent.id) || this.agents.has(agent.id) || !validList(agent.capabilities)) throw new Error('Invalid or duplicate agent');
      this.agents.set(agent.id, { id: agent.id, capabilities: [...agent.capabilities] });
    }
    for (const definition of definitions) {
      const dependencies = definition.dependencies ?? [];
      if (!validId(definition.id) || this.tasks.has(definition.id) || !validList(dependencies) || !validList(definition.capabilities)) throw new Error('Invalid or duplicate task');
      this.tasks.set(definition.id, { id: definition.id, dependencies: [...dependencies], capabilities: [...definition.capabilities], state: 'blocked' });
    }
    const visited = new Set<string>(); const visiting = new Set<string>();
    const visit = (id: string): void => {
      if (visiting.has(id)) throw new Error('Dependency cycle');
      if (visited.has(id)) return;
      const task = this.tasks.get(id); if (!task) throw new Error('Unknown dependency');
      visiting.add(id); task.dependencies.forEach(visit); visiting.delete(id); visited.add(id);
    };
    this.tasks.forEach(task => visit(task.id));
    this.refresh();
  }

  snapshot(): QueueTask[] { return [...this.tasks.values()].map(task => ({ ...task, dependencies: [...task.dependencies], capabilities: [...task.capabilities] })); }

  /** Claims at most one task. Reviews have priority; agent and task claims are atomic. */
  assignNext(agentId: string): TaskAssignment | null {
    const agent = this.agents.get(agentId); if (!agent) throw new Error('Unknown agent');
    if (this.busy.has(agentId)) return null;
    const eligible = (task: QueueTask) => task.capabilities.every(capability => agent.capabilities.includes(capability));
    const review = [...this.tasks.values()].find(task => task.state === 'review' && !task.reviewerId && task.workerId !== agentId && eligible(task));
    if (review) {
      review.reviewerId = agentId; this.busy.set(agentId, review.id);
      return { taskId: review.id, agentId, kind: 'review' };
    }
    const task = [...this.tasks.values()].find(task => task.state === 'ready' && eligible(task));
    if (!task) return null;
    task.state = 'running'; task.workerId = agentId; delete task.reviewerId;
    this.busy.set(agentId, task.id);
    return { taskId: task.id, agentId, kind: 'work' };
  }

  submitForReview(taskId: string, agentId: string): void {
    const task = this.task(taskId);
    if (task.state !== 'running' || task.workerId !== agentId || this.busy.get(agentId) !== taskId) throw new Error('Only the assigned worker may submit');
    task.state = 'review'; this.busy.delete(agentId);
  }

  review(taskId: string, agentId: string, outcome: 'approve' | 'request-changes'): void {
    const task = this.task(taskId);
    if (task.state !== 'review' || task.reviewerId !== agentId || task.workerId === agentId || this.busy.get(agentId) !== taskId) throw new Error('An assigned independent reviewer is required');
    if (outcome !== 'approve' && outcome !== 'request-changes') throw new Error('Invalid review outcome');
    this.busy.delete(agentId);
    task.state = outcome === 'approve' ? 'done' : 'ready';
    if (outcome === 'request-changes') delete task.reviewerId;
    this.refresh();
  }

  /** Explicit operator action; interrupted workers must be stopped by the caller. */
  block(taskId: string, reason: string): void {
    const task = this.task(taskId);
    if (task.state === 'done' || !validId(reason)) throw new Error('Cannot block task');
    if (task.workerId && this.busy.get(task.workerId) === taskId) this.busy.delete(task.workerId);
    if (task.reviewerId && this.busy.get(task.reviewerId) === taskId) this.busy.delete(task.reviewerId);
    delete task.workerId; delete task.reviewerId;
    this.holds.set(taskId, reason); task.state = 'blocked'; this.refresh();
  }

  unblock(taskId: string): void {
    this.task(taskId);
    if (!this.holds.delete(taskId)) throw new Error('Task has no explicit block');
    this.refresh();
  }

  private task(id: string): QueueTask { const task = this.tasks.get(id); if (!task) throw new Error('Unknown task'); return task; }
  private refresh(): void {
    for (const task of this.tasks.values()) {
      if (task.state !== 'ready' && task.state !== 'blocked') continue;
      const waiting = task.dependencies.some(id => this.tasks.get(id)!.state !== 'done');
      const reason = this.holds.get(task.id) || (waiting ? 'Waiting for reviewed dependencies' : undefined);
      task.state = reason ? 'blocked' : 'ready';
      if (reason) task.blockedReason = reason; else delete task.blockedReason;
    }
  }
}
