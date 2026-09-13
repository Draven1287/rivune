export const worlds = [
  ['ocean', 'Stillwater', 'Silver light, open water, distant haze'],
  ['cloud', 'Cloudline', 'A soft cloud layer beneath a warm horizon'],
  ['orbital', 'Orbital', 'A planetary edge in expansive darkness'],
] as const;
export function worldIndex(value: string): number { return worlds.findIndex(world => world[0] === value); }
export function environmentName(value: string): string {
  if (value === 'auto') return 'Between sessions';
  if (value === 'plain') return 'Focus';
  return worlds.find(world => world[0] === value)?.[1] || 'Stillwater';
}
export function normalizeEnvironment(value: string): string {
  return value === 'auto' || value === 'plain' || worldIndex(value) >= 0 ? value : 'ocean';
}
// Called once per document session, never by the animation clock.
export function nextSessionWorld(previous: string | null): string {
  return worlds[(worldIndex(previous || '') + 1) % worlds.length][0];
}
