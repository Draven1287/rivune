import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
export type { Update, DownloadEvent };
export const checkTauriUpdates = () => check({ timeout: 15000 });
export const restartApplication = () => relaunch();
