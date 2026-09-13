import { platform } from '../../platform/index.js';
import { checkSwiftUpdates, swiftHostInfo } from '../native/swiftHost.js';
import { checkTauriUpdates, restartApplication } from '../native/appUpdates.js';
import { UpdateController, type UpdateAdapter } from './controller.js';
import config from '../../../release/config.json';
export async function createAppUpdates(canInstall: () => boolean) {
  let adapter: UpdateAdapter | null = null;
  if (platform.runtime === 'swift') {
    const info = await swiftHostInfo();
    if (info.updates) adapter = { async check() { await checkSwiftUpdates(); return 'native'; } };
  } else if (platform.runtime === 'tauri' && config.tauri.endpoint && config.tauri.publicKey) {
    adapter = { async check() {
      const update = await checkTauriUpdates();
      if (!update) return null;
      return { version:update.version, dispose:()=>update.close(), async install(progress) {
        let downloaded = 0; let total = 0;
        await update.downloadAndInstall(event => {
          if (event.event === 'Started') total = event.data.contentLength || 0;
          if (event.event === 'Progress') { downloaded += event.data.chunkLength; progress(total ? `Downloading… ${Math.min(100,Math.round(downloaded/total*100))}%` : 'Downloading the signed update…'); }
          if (event.event === 'Finished') progress('Verifying and installing…');
        });
        progress('Restarting Rivune…'); await restartApplication();
      } };
    } };
  }
  return new UpdateController(adapter,canInstall);
}
