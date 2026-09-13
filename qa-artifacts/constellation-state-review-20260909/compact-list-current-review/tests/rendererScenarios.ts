export const teamFormScenarioIDs = ['team-pristine', 'team-dirty', 'team-keep', 'team-save-ack', 'team-save-failed'] as const;
export type TeamFormScenario = typeof teamFormScenarioIDs[number];
export const invocationRetryScenarioIDs = ['retry-pending', 'retry-uncertain', 'retry-rejected'] as const;
export type RendererScenario = 'conversation-list' | 'configuration-recovery' | 'follow-default' | 'conversation-binding' | 'provider-refresh' | 'provider-empty' | 'provider-success' | 'provider-setup' | 'provider-stale' | 'provider-missing' | 'connection-guidance' | TeamFormScenario | typeof invocationRetryScenarioIDs[number];
export function rendererScenarioSelection(search: string): { ids: readonly RendererScenario[] | null; error: string | null } {
  const values = new URLSearchParams(search).getAll('scenario');
  if (!values.length) return { ids: null, error: null };
  const value = values[0];
  if (values.length === 1 && value === 'team-form') return { ids: teamFormScenarioIDs, error: null };
  if (values.length === 1 && value === 'invocation-retry') return { ids: invocationRetryScenarioIDs, error: null };
  if (values.length === 1 && ['conversation-list','configuration-recovery','follow-default','conversation-binding','provider-refresh','provider-empty','provider-success','provider-setup','provider-stale','provider-missing','connection-guidance', ...teamFormScenarioIDs, ...invocationRetryScenarioIDs].some(id => id === value)) return { ids: [value as RendererScenario], error: null };
  return { ids: [], error: 'Unknown or repeated scenario. Use team-form, invocation-retry, or a documented individual scenario. No checks were run.' };
}
