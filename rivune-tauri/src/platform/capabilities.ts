import { UnsupportedPlatformError, type ConnectionStatus, type PlatformAdapter, type PlatformCapabilities, type PlatformName, type PlatformRuntime } from './types.js';
export function capabilities(connectionChecks = false): PlatformCapabilities {
  return Object.freeze({ connectionChecks, liquidGlass: false, nativeShare: false, nativeNotifications: false, nativeMenus: false });
}
export function adapter(name: PlatformName, runtime: PlatformRuntime, check?: () => Promise<ConnectionStatus[]>): PlatformAdapter {
  return Object.freeze({ name, runtime, capabilities: capabilities(Boolean(check)), presentShell() {}, async checkConnections() {
    if (!check) throw new UnsupportedPlatformError(`Connection checks are unavailable on ${name} in this build`);
    return check();
  } });
}
