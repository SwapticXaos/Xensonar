import {
  readStoredActiveGridTuningRack,
  readStoredCustomGridTunings,
  replaceStoredCustomGridTunings,
  sanitizeActiveGridTuningRack,
  writeStoredActiveGridTuningRack,
  type GridTuning,
  type StoredCustomGridTuning,
} from './instrumentData';

export type GridLibraryMemorySnapshot = {
  activeRack: GridTuning[];
  customTunings: StoredCustomGridTuning[];
};

export function readGridLibraryMemorySnapshot(): GridLibraryMemorySnapshot {
  return {
    activeRack: readStoredActiveGridTuningRack(),
    customTunings: readStoredCustomGridTunings(),
  };
}

export function replaceGridLibraryMemorySnapshot(args: {
  activeRack: GridTuning[];
  customTunings: StoredCustomGridTuning[];
}) {
  const persistedCustomTunings = replaceStoredCustomGridTunings(args.customTunings);
  const nextRack = sanitizeActiveGridTuningRack(args.activeRack);
  writeStoredActiveGridTuningRack(nextRack);
  return {
    persistedCustomTunings,
    nextRack,
  };
}
