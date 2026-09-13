import { isSwiftHost, swiftHostInfo } from '../services/native/swiftHost.js';
import { createPlatform } from './detect.js';
import { isNativeRuntime, nativeRuntimeInfo, nativeConnections } from '../services/native/runtime.js';
import { browserConnections } from '../services/api/connections.js';
const development = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;
export const platform = createPlatform({ isSwift: isSwiftHost, swiftInfo: swiftHostInfo, isNative: isNativeRuntime, runtimeInfo: nativeRuntimeInfo, nativeConnections, browserConnections: () => browserConnections(development), development });
export type { Platform, PlatformCapabilities, PlatformName, PlatformRuntime, ConnectionStatus } from './types.js';
