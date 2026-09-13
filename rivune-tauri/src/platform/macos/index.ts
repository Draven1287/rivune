import { adapter } from '../capabilities.js';
import type { ConnectionStatus } from '../types.js';
export const macosAdapter = (check: () => Promise<ConnectionStatus[]>) => adapter('macos', 'tauri', check);
