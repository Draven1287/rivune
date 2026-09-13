/** Read-only metadata boundary for the existing desktop host. No execution or writes. */
export type Authentication = 'authenticated' | 'authNeeded' | 'unknown';
export type ResponseTest = 'passed' | 'failed' | 'notTested';
export interface CatalogModel {
  id: string; label: string; availability: 'available' | 'unavailable' | 'unknown';
  effortState: 'supported' | 'unsupported' | 'unknown';
  efforts: { id: string; label: string }[]; supportsDefaultEffort: boolean;
}
export interface SelectionCapabilities {
  schemaVersion: 1;
  modelOverride: 'unsupported'; effortOverride: 'unsupported';
  reasonCode: 'ADAPTER_DISCOVERY_UNAVAILABLE' | 'CAPABILITY_NOT_REPORTED';
}
/** Legacy catalog v1 remains readable, but cannot authorize an override. */
export function providerSelectionCapabilities(provider: CatalogProvider): SelectionCapabilities {
  return provider.selectionCapabilities ?? { schemaVersion: 1, modelOverride: 'unsupported', effortOverride: 'unsupported', reasonCode: 'CAPABILITY_NOT_REPORTED' };
}
export interface CatalogProvider {
  id: string; label: string; transport: 'cli' | 'api';
  adapterState: 'supported' | 'unsupported' | 'unavailable';
  installation: 'installed' | 'missing' | 'notApplicable' | 'unknown';
  authentication: Authentication; responseTest: ResponseTest;
  catalogState: 'available' | 'unknown' | 'unavailable' | 'stale';
  models: CatalogModel[]; defaults: { modelID: string | null; effortID: string | null };
  selectionCapabilities?: SelectionCapabilities;
  supportsProviderDefault: boolean; errorCode: string | null;
}
export interface ModelCatalog { schemaVersion: 1; revision: string; providers: CatalogProvider[] }
export interface SetupProvider {
  id: string; label: string; installed: boolean | null; configured: boolean;
  authentication: Authentication; responseTest: ResponseTest;
  readiness: 'hostReportedReady' | 'notReady' | 'unknown'; selected: boolean;
}
export type SetupResult = {
  status: 'available'; providers: SetupProvider[]; selectedProviderID: string | null;
  catalog: ModelCatalog; constellation: 'unavailable';
} | {
  status: 'unavailable' | 'error'; message: string; providers: []; constellation: 'unavailable';
};
export interface SetupAdapter { available: boolean; readSetup: () => Promise<SetupResult> }
interface SetupBridge {
  discoverProviders: () => unknown; getModelCatalog: () => unknown; getSnapshot: () => unknown;
}
type ProviderKind = 'codex' | 'claude' | 'fixture' | 'imported';
interface ProviderConfig { id: string; kind: ProviderKind; executablePath: string; model: string | null; timeoutMs: number }
interface Discovery { id: string; kind: ProviderKind; displayName: string; executablePath: string; installed: boolean; authentication: 'authenticated' | 'not-authenticated' | 'unknown'; tested: boolean }
interface SetupSnapshot { schemaVersion: 1; providers: ProviderConfig[]; selectedProviderID: string | null }

function reject(): never { throw new Error('invalid metadata'); }
function record(value: unknown, keys?: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (keys && Object.keys(value).some((key) => !keys.includes(key)))) reject();
}
function text(value: unknown, max = 128): asserts value is string {
  if (typeof value !== 'string' || !value || new TextEncoder().encode(value).length > max) reject();
}
function choice(value: unknown, options: string[]) { if (typeof value !== 'string' || !options.includes(value)) reject(); }
function boolean(value: unknown) { if (typeof value !== 'boolean') reject(); }
function list(value: unknown, max: number): asserts value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > max) reject();
  const ids = new Set<string>();
  for (const item of value) { record(item); text(item.id); if (ids.has(item.id)) reject(); ids.add(item.id); }
}

// Mirrors candidate4-runtime-r2/web/core.mjs parseModelCatalog, including exact
// enum spellings, unknown-key rejection, duplicate IDs, and default references.
export function parseModelCatalog(value: unknown): ModelCatalog {
  record(value, ['schemaVersion', 'revision', 'providers']);
  if (value.schemaVersion !== 1) reject();
  text(value.revision); list(value.providers, 32);
  for (const provider of value.providers) {
    record(provider, ['id', 'label', 'transport', 'adapterState', 'installation', 'authentication', 'responseTest', 'catalogState', 'models', 'defaults', 'supportsProviderDefault', 'selectionCapabilities', 'errorCode']);
    text(provider.label, 256);
    choice(provider.transport, ['cli', 'api']); choice(provider.adapterState, ['supported', 'unsupported', 'unavailable']);
    choice(provider.installation, ['installed', 'missing', 'notApplicable', 'unknown']);
    choice(provider.authentication, ['authenticated', 'authNeeded', 'unknown']);
    choice(provider.responseTest, ['passed', 'failed', 'notTested']);
    choice(provider.catalogState, ['available', 'unknown', 'unavailable', 'stale']);
    if (Object.prototype.hasOwnProperty.call(provider, 'selectionCapabilities')) {
      const capabilities = provider.selectionCapabilities;
      record(capabilities, ['schemaVersion', 'modelOverride', 'effortOverride', 'reasonCode']);
      if (capabilities.schemaVersion !== 1) reject();
      choice(capabilities.modelOverride, ['unsupported']); choice(capabilities.effortOverride, ['unsupported']);
      choice(capabilities.reasonCode, ['ADAPTER_DISCOVERY_UNAVAILABLE', 'CAPABILITY_NOT_REPORTED']);
    }
    boolean(provider.supportsProviderDefault);
    if (provider.errorCode !== null) text(provider.errorCode);
    list(provider.models, 128);
    for (const model of provider.models) {
      record(model, ['id', 'label', 'availability', 'effortState', 'efforts', 'supportsDefaultEffort']);
      text(model.label, 256); choice(model.availability, ['available', 'unavailable', 'unknown']);
      choice(model.effortState, ['supported', 'unsupported', 'unknown']); boolean(model.supportsDefaultEffort);
      list(model.efforts, 16);
      if (model.effortState !== 'supported' && model.efforts.length) reject();
      for (const effort of model.efforts) { record(effort, ['id', 'label']); text(effort.label, 256); }
    }
    record(provider.defaults, ['modelID', 'effortID']);
    const defaults = provider.defaults;
    if (defaults.modelID !== null) {
      text(defaults.modelID);
      const model = provider.models.find((item) => item.id === defaults.modelID);
      if (!model) reject();
      if (defaults.effortID !== null) {
        text(defaults.effortID);
        if (!(model.efforts as { id: string }[]).some((item) => item.id === defaults.effortID)) reject();
      }
    } else if (defaults.effortID !== null) reject();
  }
  return value as unknown as ModelCatalog;
}
function parseDiscovery(value: unknown): Discovery[] {
  list(value, 128);
  for (const provider of value) {
    record(provider, ['id', 'kind', 'displayName', 'executablePath', 'installed', 'authentication', 'tested']);
    choice(provider.kind, ['codex', 'claude', 'fixture', 'imported']);
    text(provider.displayName, 256); text(provider.executablePath, 4096); boolean(provider.installed);
    choice(provider.authentication, ['authenticated', 'not-authenticated', 'unknown']); boolean(provider.tested);
  }
  return value as unknown as Discovery[];
}
function parseSnapshot(value: unknown): SetupSnapshot {
  // The full snapshot also contains conversations, drafts, attachments and runs.
  // Deliberately inspect and retain only its setup projection.
  record(value);
  if (value.schemaVersion !== 1) reject();
  list(value.providers, 128);
  for (const provider of value.providers) {
    record(provider, ['id', 'kind', 'executablePath', 'model', 'timeoutMs']);
    choice(provider.kind, ['codex', 'claude', 'fixture', 'imported']); text(provider.executablePath, 4096);
    if (provider.model !== null) text(provider.model);
    if (!Number.isSafeInteger(provider.timeoutMs) || (provider.timeoutMs as number) < 0) reject();
  }
  if (value.selectedProviderID !== null) {
    text(value.selectedProviderID);
    if (!value.providers.some((provider) => provider.id === value.selectedProviderID)) reject();
  }
  return { schemaVersion: 1, providers: value.providers as unknown as ProviderConfig[], selectedProviderID: value.selectedProviderID as string | null };
}

function setupRows(discovery: Discovery[], catalog: ModelCatalog, snapshot: SetupSnapshot): SetupProvider[] {
  const matchedDiscovery = new Set<string>();
  const rows: SetupProvider[] = snapshot.providers.map((config) => {
    // An ID match with contradictory executable identity must not transfer state.
    // Path matches require exact strings and a unique route; no basename guesses.
    const sameIdentity = (item: Discovery) => item.kind === config.kind && item.executablePath === config.executablePath;
    const exact = discovery.find((item) => item.id === config.id);
    const candidates = discovery.filter(sameIdentity);
    const routeCount = snapshot.providers.filter((item) => item.kind === config.kind && item.executablePath === config.executablePath).length;
    const discovered = exact ? (sameIdentity(exact) ? exact : undefined) : (candidates.length === 1 && routeCount === 1 ? candidates[0] : undefined);
    if (discovered) matchedDiscovery.add(discovered.id);
    const metadata = catalog.providers.find((item) => item.id === config.id);
    const installed = metadata ? metadata.installation === 'installed' ? true : metadata.installation === 'missing' ? false : null : discovered?.installed ?? null;
    const authentication = discovered?.authentication === 'not-authenticated' ? 'authNeeded' : metadata?.authentication ?? 'unknown';
    const responseTest = metadata?.responseTest ?? 'notTested';
    const identityConflict = !!exact && !sameIdentity(exact);
    const ready = !identityConflict && discovered?.installed !== false && metadata?.adapterState === 'supported' && installed === true && authentication === 'authenticated' && responseTest === 'passed';
    return {
      id: config.id, label: metadata?.label ?? discovered?.displayName ?? ({ codex: 'Codex CLI', claude: 'Claude CLI', fixture: 'Test fixture', imported: 'Imported history' }[config.kind]),
      installed, configured: true, authentication, responseTest, selected: snapshot.selectedProviderID === config.id,
      readiness: ready ? 'hostReportedReady' : identityConflict || installed === false || metadata?.adapterState === 'unsupported' || metadata?.adapterState === 'unavailable' || authentication === 'authNeeded' || responseTest === 'failed' ? 'notReady' : 'unknown',
    };
  });
  for (const item of discovery) {
    if (matchedDiscovery.has(item.id)) continue;
    rows.push({ id: `discovery:${item.id}`, label: item.displayName, installed: item.installed, configured: false, authentication: item.authentication === 'not-authenticated' ? 'authNeeded' : item.authentication, responseTest: 'notTested', readiness: item.installed ? 'unknown' : 'notReady', selected: false });
  }
  for (const item of catalog.providers) {
    if (snapshot.providers.some((config) => config.id === item.id)) continue;
    // Catalog-only IDs cannot establish a configured route or readiness.
    rows.push({ id: `catalog:${item.id}`, label: item.label, installed: item.installation === 'installed' ? true : item.installation === 'missing' ? false : null, configured: false, authentication: item.authentication, responseTest: item.responseTest, readiness: 'unknown', selected: false });
  }
  return rows;
}

export function createSetupAdapter(bridge?: unknown, timeoutMs = 5_000): SetupAdapter {
  let host: SetupBridge | null = null;
  try {
    if (bridge && typeof bridge === 'object') {
      const candidate = bridge as Record<string, unknown>;
      if (typeof candidate.discoverProviders === 'function' && typeof candidate.getModelCatalog === 'function' && typeof candidate.getSnapshot === 'function') host = bridge as SetupBridge;
    }
  } catch { /* Host detection must tolerate inaccessible properties. */ }
  const timeout = Number.isFinite(timeoutMs) ? Math.min(30_000, Math.max(1, timeoutMs)) : 5_000;
  return {
    available: host !== null,
    async readSetup(): Promise<SetupResult> {
      if (!host) return { status: 'unavailable', providers: [], constellation: 'unavailable', message: 'Desktop setup is unavailable in this preview.' };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = Symbol('timeout');
      try {
        const values = await Promise.race([
          Promise.all([Promise.resolve().then(() => host.discoverProviders()), Promise.resolve().then(() => host.getModelCatalog()), Promise.resolve().then(() => host.getSnapshot())]),
          new Promise<never>((_, rejectTimeout) => { timer = setTimeout(() => rejectTimeout(timedOut), timeout); }),
        ]);
        const discovery = parseDiscovery(values[0]);
        const catalog = parseModelCatalog(values[1]);
        const snapshot = parseSnapshot(values[2]);
        return { status: 'available', providers: setupRows(discovery, catalog, snapshot), selectedProviderID: snapshot.selectedProviderID, catalog, constellation: 'unavailable' };
      } catch (error) {
        return { status: 'error', providers: [], constellation: 'unavailable', message: error === timedOut ? 'Desktop setup check timed out. Try again.' : 'Desktop setup could not be read. Try again.' };
      } finally { if (timer !== undefined) clearTimeout(timer); }
    },
  };
}
