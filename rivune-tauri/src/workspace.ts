// Compatibility export; new feature code imports its canonical module.
export * from './features/conversations/model.js';

export { nextSessionWorld, normalizeEnvironment, worldIndex, environmentName } from './features/worlds/catalog.js';

export { ReadingPositions, atLatest } from './features/conversations/readingPosition.js';
export { UpdateController } from './services/updates/controller.js';
