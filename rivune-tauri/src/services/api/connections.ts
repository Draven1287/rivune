import { parseConnectionStatuses, UnsupportedPlatformError } from '../../platform/types.js';
export async function browserConnections(development: boolean) {
  if (!development) throw new UnsupportedPlatformError('Connection checks require the local development server or supported desktop app');
  const response = await fetch('/__rivune/connections', { method: 'POST', headers: { 'X-Rivune-Local-Check': '1' } });
  if (!response.ok) throw new Error('Connection check failed');
  return parseConnectionStatuses(await response.json());
}
