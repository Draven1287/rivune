export interface SwiftHostInfo { protocolVersion: 1; runtime: 'swift'; os: 'macos'; version: string; sourceDigest: string; updates: boolean }
interface HostWindow extends Window { webkit?: { messageHandlers?: { rivuneHost?: { postMessage(value: unknown): Promise<unknown> } } } }
function handler() { return (window as HostWindow).webkit?.messageHandlers?.rivuneHost; }
export function isSwiftHost(): boolean { return !!handler(); }
async function request(method: 'host.info' | 'updates.check'): Promise<unknown> {
  const bridge = handler();
  if (!bridge) throw Error('Swift host is unavailable');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([bridge.postMessage({ protocolVersion: 1, method }), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Swift host did not respond')), 5000); })]);
  } finally { if (timer) clearTimeout(timer); }
}
export function parseSwiftHostInfo(value: unknown): SwiftHostInfo {
  const info = value as Partial<SwiftHostInfo> | null;
  if (!info || info.protocolVersion !== 1 || info.runtime !== 'swift' || info.os !== 'macos' || typeof info.version !== 'string' || typeof info.sourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(info.sourceDigest) || typeof info.updates !== 'boolean') throw Error('Incompatible Swift host');
  return info as SwiftHostInfo;
}
export async function swiftHostInfo() { return parseSwiftHostInfo(await request('host.info')); }
export async function checkSwiftUpdates() { await request('updates.check'); }
