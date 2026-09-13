import { invoke, isTauri } from '@tauri-apps/api/core';
import { parseConnectionStatuses } from '../../platform/types.js';
export const isNativeRuntime = (): boolean => isTauri();
export async function nativeRuntimeInfo(): Promise<{ os: string }> {
  const value = await invoke<unknown>('runtime_info');
  if (!value || typeof value !== 'object' || !('os' in value) || typeof value.os !== 'string') throw new Error('Invalid native runtime information');
  return { os: value.os };
}
export async function nativeConnections() { return parseConnectionStatuses(await invoke<unknown>('check_connections')); }
