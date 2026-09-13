export const arrivalDurationMs = 12_000;
export const arrivalHandoffDelayMs = 900;

// Percentage describes loading the interface. Connection readiness determines
// the next screen independently, so a missing provider cannot stall the reveal.
export function arrivalPresentation(elapsedMs: number, phase: "checking" | "ready" | "needsConnection", assetsLoaded: boolean) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const fraction = Math.min(1, elapsed / arrivalDurationMs);
  const settled = elapsed >= arrivalDurationMs;
  const finished = settled && assetsLoaded;
  const destination = finished ? phase === "ready" ? "workspace" : "setup" : null;
  return { fraction, percentage: Math.floor(Math.min(fraction, assetsLoaded ? 1 : .99) * 100), settled, finished, destination, ready: destination === "workspace" };
}
