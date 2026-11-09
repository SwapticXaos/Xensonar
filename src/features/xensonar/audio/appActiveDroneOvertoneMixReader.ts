import { resolveActiveDroneOvertoneMix } from './masteringHelpers';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';

type CurrentRef<T> = { readonly current: T };

type ActiveDroneOvertoneMixReaderInput = {
  readonly nexusParamsRef: CurrentRef<Pick<
    AppNexusParams,
    'dronePreset' | 'droneJIOvertonesByPreset' | 'droneJIOvertones'
  >>;
};

export const APP_ACTIVE_DRONE_OVERTONE_MIX_READER_PROBE = {
  cleanupKind: 'app-active-drone-overtone-mix-reader',
  ownsRuntime: false,
  mutatesAudio: false,
  ownsEffects: false,
  ownsScheduling: false,
  ownsDronePolicy: false,
  onlyReadsCurrentNexusDroneOvertoneState: true,
  movedFromAppCallsite: [
    'getActiveDroneOvertoneMix local reader',
  ] as const,
  explicitlyNotMoved: [
    'applyRealtimeDroneOvertones audio automation body',
    'drone graph routing',
    'drone preset or overtone semantics',
    'WaveStarter, Root-Follow, Materialspur, SpectralForge and Stable-Rhythm behavior',
  ] as const,
} as const;

export function createActiveDroneOvertoneMixReader({
  nexusParamsRef,
}: ActiveDroneOvertoneMixReaderInput): () => Record<string, number> {
  return () => resolveActiveDroneOvertoneMix({
    dronePreset: nexusParamsRef.current.dronePreset,
    droneJIOvertonesByPreset: nexusParamsRef.current.droneJIOvertonesByPreset,
    droneJIOvertones: nexusParamsRef.current.droneJIOvertones,
  });
}
