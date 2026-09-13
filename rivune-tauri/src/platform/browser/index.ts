import { adapter } from '../capabilities.js';
import type { ConnectionStatus } from '../types.js';
export const browserAdapter = (development: boolean, check: () => Promise<ConnectionStatus[]>) => adapter('browser', 'browser', development ? check : undefined);
