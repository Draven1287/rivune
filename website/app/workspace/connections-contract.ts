export type ConnectionMethod = "cli" | "api";
export type APIProvider = "openai" | "anthropic";
export type CLIEntry = { id: string; title: string; command: string; isDefault: boolean; installed: boolean; supported: boolean; custom: boolean };
export type APIEntry = { provider: APIProvider; title: string; hasKey: boolean; modelID?: string | null };
export type ConnectionSettings = { cli: CLIEntry[]; api: APIEntry[]; message?: string | null };
export type ConnectionAction = "/v1/connections" | "/v1/connections/scan" | "/v1/connections/cli" | "/v1/connections/api";
export type ConnectionSettingsRequest = (path: ConnectionAction, body?: Record<string, string>) => Promise<ConnectionSettings>;

export function parseConnectionSettings(value: unknown): ConnectionSettings {
  const object = (item: unknown): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item);
  if (!object(value) || !Array.isArray(value.cli) || value.cli.length > 50 || !Array.isArray(value.api) || value.api.length > 20
    || !value.cli.every(item => object(item) && [item.id, item.title, item.command].every(text => typeof text === "string" && text.length <= 128)
      && [item.isDefault, item.installed, item.supported, item.custom].every(flag => typeof flag === "boolean"))
    || !value.api.every(item => object(item) && ["openai", "anthropic"].includes(String(item.provider)) && typeof item.title === "string" && typeof item.hasKey === "boolean"
      && (item.modelID == null || typeof item.modelID === "string") && !("apiKey" in item) && !("key" in item))
    || new Set(value.cli.map(item => item.id)).size !== value.cli.length || new Set(value.api.map(item => item.provider)).size !== value.api.length
    || (value.message != null && typeof value.message !== "string")) throw new Error("Could not read this Mac’s connection settings. Update Rivune and reconnect.");
  // Project only public fields. Secret-bearing or arbitrary future fields are
  // never retained in component state.
  return { cli: value.cli.map(({id,title,command,isDefault,installed,supported,custom}) => ({id,title,command,isDefault,installed,supported,custom})),
    api: value.api.map(({provider,title,hasKey,modelID}) => ({provider,title,hasKey,modelID})), message: value.message as string | null | undefined };
}

export function validateAPIFields(apiKey: string, modelID: string, hasSavedKey: boolean): string | null {
  if (!/^[A-Za-z0-9_.:-]{1,256}$/.test(modelID) || modelID === "." || modelID === "..") return "Enter the exact model ID from your provider.";
  if (!apiKey && !hasSavedKey) return "Enter your provider’s API key.";
  if (apiKey && !/^[\x21-\x7e]{1,4096}$/.test(apiKey)) return "The API key must not contain spaces or line breaks.";
  return null;
}
