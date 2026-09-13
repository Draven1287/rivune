export type UpdateState = { phase: 'unconfigured' | 'idle' | 'checking' | 'available' | 'installing' | 'current' | 'error' | 'native'; message: string; version?: string };
export interface AvailableUpdate { version: string; install(progress: (message: string) => void): Promise<void>; dispose(): Promise<void> }
export interface UpdateAdapter { check(): Promise<AvailableUpdate | null | 'native'> }
export class UpdateController {
  state: UpdateState;
  private pending?: AvailableUpdate;
  private listeners = new Set<(state: UpdateState) => void>();
  constructor(private adapter: UpdateAdapter | null, private canInstall: () => boolean) {
    this.state = adapter ? { phase: 'idle', message: 'Check when you’re ready.' } : { phase: 'unconfigured', message: 'Updates are not configured for this development build.' };
  }
  subscribe(listener: (state: UpdateState) => void) { this.listeners.add(listener); listener(this.state); return () => this.listeners.delete(listener); }
  private set(state: UpdateState) { this.state = state; for (const listener of this.listeners) listener(state); }
  async check() {
    if (!this.adapter || ['checking','installing'].includes(this.state.phase)) return;
    this.set({phase:'checking',message:'Checking for updates…'});
    try {
      await this.pending?.dispose(); this.pending = undefined;
      const result = await this.adapter.check();
      if (result === 'native') this.set({phase:'native',message:'Continue in the macOS update window.'});
      else if (result) { this.pending = result; this.set({phase:'available',version:result.version,message:`Rivune ${result.version} is available.`}); }
      else this.set({phase:'current',message:'You’re using the latest available version.'});
    } catch { this.set({phase:'error',message:'Could not check for updates. Try again when you’re online.'}); }
  }
  async install() {
    if (!this.pending || this.state.phase !== 'available') return;
    if (!this.canInstall()) { this.set({...this.state,message:'Save your chats and drafts, and finish or stop active replies before installing.'}); return; }
    this.set({phase:'installing',message:'Downloading the signed update…',version:this.pending.version});
    try {
      await this.pending.install(message => this.set({...this.state,message}));
    } catch {
      // Re-check before retrying; never reuse a partially installed artifact.
      try { await this.pending.dispose(); } catch { /* Native resource may already be closed. */ }
      this.pending = undefined;
      this.set({phase:'error',message:'The update could not finish. Check again before retrying.'});
    }
  }
}
