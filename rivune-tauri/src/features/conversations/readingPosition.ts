export type ScrollMetrics = { scrollTop: number; scrollHeight: number; clientHeight: number };
export function atLatest(metrics: ScrollMetrics): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight < 90;
}
/** Session-only reading positions. Never write chat content or view state to storage. */
export class ReadingPositions {
  private positions = new Map<string, { top: number; latest: boolean }>();
  capture(id: string, metrics: ScrollMetrics): void {
    if (metrics.clientHeight <= 0) return;
    this.positions.delete(id);
    this.positions.set(id, { top: Math.max(0, metrics.scrollTop), latest: atLatest(metrics) });
    if (this.positions.size > 50) this.positions.delete(this.positions.keys().next().value!);
  }
  restore(id: string, metrics: Pick<ScrollMetrics, 'scrollHeight' | 'clientHeight'>): number {
    const saved = this.positions.get(id);
    const maximum = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
    return saved ? saved.latest ? maximum : Math.min(saved.top, maximum) : 0;
  }
  forget(id: string): void { this.positions.delete(id); }
}
