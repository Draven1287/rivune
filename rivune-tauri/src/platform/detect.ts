import { adapter } from './capabilities.js';
import { browserAdapter } from './browser/index.js';
import { macosAdapter } from './macos/index.js';
import { windowsAdapter } from './windows/index.js';
import { linuxAdapter } from './linux/index.js';
import type { ShellSlots, ConnectionStatus, Platform, PlatformAdapter } from './types.js';

export interface PlatformDependencies {
  isNative(): boolean;
  isSwift?(): boolean;
  swiftInfo?(): Promise<{ runtime: 'swift'; os: 'macos'; protocolVersion: 1 }>; 
  runtimeInfo(): Promise<{ os: string }>;
  nativeConnections(): Promise<ConnectionStatus[]>;
  browserConnections(): Promise<ConnectionStatus[]>;
  development: boolean;
}
export function createPlatform(dependencies: PlatformDependencies): Platform {
  let selected: PlatformAdapter = adapter('unknown', 'browser');
  let initializing: Promise<void> | undefined;
  const initialize = (): Promise<void> => initializing ??= (async () => {
    try {
      if (dependencies.isSwift?.()) {
        selected = adapter('unknown', 'swift');
        const info = await dependencies.swiftInfo?.();
        if (info?.runtime !== 'swift' || info.os !== 'macos' || info.protocolVersion !== 1) throw Error('Incompatible Swift host');
        selected = adapter('macos', 'swift'); return;
      }
      if (!dependencies.isNative()) { selected = browserAdapter(dependencies.development, dependencies.browserConnections); return; }
      selected = adapter('unknown', 'tauri');
      const info = await dependencies.runtimeInfo();
      switch (info.os) {
        case 'macos': selected = macosAdapter(dependencies.nativeConnections); break;
        case 'windows': selected = windowsAdapter(); break;
        case 'linux': selected = linuxAdapter(); break;
        default: selected = adapter('unknown', 'tauri');
      }
    } catch { selected = adapter('unknown', dependencies.isSwift?.() ? 'swift' : 'tauri'); }
  })();
  return Object.freeze({
    get name() { return selected.name; },
    get runtime() { return selected.runtime; },
    get capabilities() { return selected.capabilities; },
    initialize,
    presentShell(slots: ShellSlots) { selected.presentShell(slots); },
    async checkConnections() { await initialize(); return selected.checkConnections(); },
  });
}
