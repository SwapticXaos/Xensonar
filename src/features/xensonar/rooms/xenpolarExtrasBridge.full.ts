export {
  createActiveIrrlichtArenaHud,
  createActiveIrrlichtArenaState,
  createDormantIrrlichtArenaHud,
  createDormantIrrlichtArenaState,
} from '@/features/xenpolar/rooms/irrlichtArenaState';
export type {
  IrrlichtArenaHudState,
  IrrlichtArenaRuntimeState,
} from '@/features/xenpolar/rooms/irrlichtArenaState';

export { useXenpolarController } from '@/features/xenpolar/rooms/useXenpolarController';
export type { UseXenpolarControllerArgs } from '@/features/xenpolar/rooms/useXenpolarController';

export {
  advanceGameChaos,
  clampFreq,
  hybridGameFreq,
} from '@/features/xenpolar/rooms/irrlichtArenaAudioMath';

export {
  playHeartPickupChord,
  playOrbHitSound,
  playOrbShotSound,
  playPlayerHitSound,
  playPlayerShotMotif,
} from '@/features/xenpolar/rooms/irrlichtArenaAudioPlayback';

export { resolveArenaAnchorRatios } from '@/features/xenpolar/rooms/xenpolarRuntimeHelpers';

export {
  buildIrrlichtArenaSeed,
  captureIrrlichtArenaEvent,
  createIrrlichtArenaInterpreter,
  finalizeIrrlichtArenaRun,
  formatIrrlichtArenaSeedStatus,
} from '@/features/xenpolar/interpretation/xenpolarLoopInterpreter';
export type {
  IrrlichtArenaInterpreter,
  IrrlichtArenaInterpreterSnapshot,
  XenpolarSeedSummary,
} from '@/features/xenpolar/interpretation/xenpolarLoopInterpreter';
