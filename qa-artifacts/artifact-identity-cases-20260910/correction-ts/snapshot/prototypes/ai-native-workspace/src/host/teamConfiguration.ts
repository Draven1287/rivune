import { providerSelectionCapabilities, type ModelCatalog } from '../hooks/workspaceAdapter.ts';
import type { HostSnapshot, HostTeamSelection } from './contracts.ts';

export function teamRoutes(snapshot: HostSnapshot | null, catalog: ModelCatalog | null) {
  return catalog?.providers.filter(p => snapshot?.providers.some(route => route.id === p.id && ['codex', 'claude', 'fixture'].includes(route.kind)) && p.adapterState === 'supported' && p.installation === 'installed' && p.supportsProviderDefault && p.authentication !== 'authNeeded' && p.responseTest !== 'failed') ?? [];
}
export function constellationUnavailable(snapshot: HostSnapshot | null, catalog: ModelCatalog | null): string | null {
  if (!snapshot?.runtimeCapabilities) return 'This host has not reported Constellation support.';
  if (snapshot.runtimeCapabilities.constellation !== 'available') return 'Constellation is unavailable on this host. It needs at least two supported provider connections.';
  if (teamRoutes(snapshot, catalog).length < 2) return 'At least two available provider connections are needed. Review their connection settings.';
  return null;
}
export function configuredTeam(snapshot: HostSnapshot | null, catalog: ModelCatalog | null, providerIDs: string[], leadID: string): HostTeamSelection {
  const unavailable = constellationUnavailable(snapshot, catalog);
  if (unavailable) throw new Error(unavailable);
  const routes = teamRoutes(snapshot, catalog);
  if (providerIDs.length < 2 || providerIDs.length > 6 || new Set(providerIDs).size !== providerIDs.length || !providerIDs.includes(leadID) || providerIDs.some(id => !routes.some(p => p.id === id))) throw new Error('Choose two to six distinct available providers and one lead.');
  return { schemaVersion: 1, leadIndex: providerIDs.indexOf(leadID), members: providerIDs.map(providerID => ({ schemaVersion: 1, providerID, modelID: null, effortID: null, catalogRevision: catalog!.revision })) };
}
export function validateSavedTeam(snapshot: HostSnapshot | null, catalog: ModelCatalog | null, team: HostTeamSelection) {
  const rebuilt = configuredTeam(snapshot, catalog, team.members.map(m => m.providerID), team.members[team.leadIndex].providerID);
  if (team.members.some((m, i) => {
    const provider = catalog!.providers.find(p => p.id === m.providerID)!;
    const capabilities = providerSelectionCapabilities(provider);
    return (capabilities.modelOverride === 'unsupported' && m.modelID !== null)
      || (capabilities.effortOverride === 'unsupported' && m.effortID !== null)
      || m.catalogRevision !== rebuilt.members[i].catalogRevision;
  })) throw new Error('The saved team needs review. Apply current provider defaults before sending.');
}
