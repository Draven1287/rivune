export type PlatformName = 'browser' | 'macos' | 'windows' | 'linux' | 'unknown';
export type PlatformRuntime = 'browser' | 'tauri' | 'swift';
export interface ConnectionStatus { name: string; state: string; canChat?: boolean }
export interface PlatformCapabilities {
  readonly connectionChecks: boolean;
  readonly liquidGlass: false;
  readonly nativeShare: false;
  readonly nativeNotifications: false;
  readonly nativeMenus: false;
}
export interface ShellSlots {
  readonly navigation: HTMLElement;
  readonly toolbar: HTMLElement;
  readonly content: HTMLElement;
}
export interface PlatformAdapter {
  readonly name: PlatformName;
  readonly runtime: PlatformRuntime;
  readonly capabilities: PlatformCapabilities;
  presentShell(slots: ShellSlots): void;
  checkConnections(): Promise<ConnectionStatus[]>;
}
export interface Platform extends PlatformAdapter { initialize(): Promise<void> }
export class UnsupportedPlatformError extends Error {
  readonly code = 'unsupported';
  constructor(message: string) { super(message); this.name = 'UnsupportedPlatformError'; }
}
export function parseConnectionStatuses(value: unknown): ConnectionStatus[] {
  if (!Array.isArray(value) || value.length > 50 || !value.every(item => item && typeof item.name === 'string' && item.name.length <= 200 && typeof item.state === 'string' && item.state.length <= 2000)) throw new Error('Invalid connection-check response');
  return value.map(item => ({ name: item.name, state: item.state, ...(item.name === 'Claude' && item.canChat === true ? { canChat: true } : {}) }));
}
