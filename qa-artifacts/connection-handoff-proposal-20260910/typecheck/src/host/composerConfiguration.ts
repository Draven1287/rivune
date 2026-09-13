import type { ModelCatalog } from '../hooks/workspaceAdapter.ts';
import type { HostSnapshot, HostTeamSelection } from './contracts.ts';

export type ComposerConfiguration = {
  expectedKey: string;
  selection: HostTeamSelection['members'][number] | null;
  team: HostTeamSelection | null;
};
/** Includes identities and availability so an open editor cannot overwrite a changed route. */
export function composerConfigurationKey(snapshot: HostSnapshot, catalog: ModelCatalog | null, conversationID: string) {
  const draft = snapshot.conversations.find(c => c.id === conversationID)?.richDraft;
  return JSON.stringify([draft, snapshot.selectedProviderID, snapshot.providers, snapshot.runtimeCapabilities, catalog]);
}
/** Duplicate display labels retain the stable route ID in every compact choice/summary. */
export function composerProviderLabel(catalog: ModelCatalog | null, id: string | null | undefined) {
  const provider = catalog?.providers.find(p => p.id === id);
  if (!provider) return id ?? 'No connection selected';
  return catalog!.providers.some(p => p.id !== id && p.label.trim().toLocaleLowerCase() === provider.label.trim().toLocaleLowerCase())
    ? `${provider.label} (${provider.id})` : provider.label;
}
export function composerSummary(snapshot: HostSnapshot, catalog: ModelCatalog | null, conversationID: string) {
  const draft = snapshot.conversations.find(c => c.id === conversationID)?.richDraft;
  const name = (id: string | null | undefined) => composerProviderLabel(catalog, id);
  return draft?.team
    ? `Constellation · ${draft.team.members.length} members · Lead: ${name(draft.team.members[draft.team.leadIndex]?.providerID)}`
    : `Single AI · ${name(draft?.selection?.providerID ?? snapshot.selectedProviderID)}`;
}
