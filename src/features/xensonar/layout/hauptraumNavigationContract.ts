import type { Room } from '../types';

export type XensonarFamilyRequestState = 'melodieQuest' | null;

export type EnterXensonarHauptraumRouteArgs = {
  setRoom: (room: Room) => void;
  setFamilyRequestedActive?: (value: XensonarFamilyRequestState) => void;
};

export const HAUPTRAUM_NAVIGATION_AUDIO_CONTRACT = {
  targetRoom: 'RESONANCE',
  clearsFamilyRequest: true,
  audioSideEffects: 'forbidden',
  forbiddenCalls: [
    'ensureAudioReady',
    'prewarmAudioRuntime',
    'spawnNexusRipple',
    'previewWaveStarterPresetSelection',
    'previewParticlePresetSelection',
  ],
} as const;

export function enterXensonarHauptraumRoute(args: EnterXensonarHauptraumRouteArgs) {
  args.setFamilyRequestedActive?.(null);
  args.setRoom('RESONANCE');
}
