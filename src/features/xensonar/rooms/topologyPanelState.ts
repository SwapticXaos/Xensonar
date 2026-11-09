import type { Dispatch, SetStateAction } from 'react';
import type { MyceliumSnapshot } from '../../topology/myceliumSnapshot';
import { buildTopologyStatusLine } from '../../topology/topologyStatusText';
import type { Room3BodyControls } from '../../resonance/timbreModel';
import { getRoom3MaterialLabel } from '../../resonance/timbreModel';
import type { Room } from '../types';

type FamilyRequestedActive = 'melodieQuest' | null;

type TopologyHandoffProfile = { balanceCarrier?: number | string | null };

type BuildTopologyPanelDisplayStateArgs = {
  snapshot: MyceliumSnapshot;
  room3BodyEnabled: boolean;
  materialLabel: string;
  primedY: number | null;
  primedSource: 'resonance' | 'topology' | 'wave' | 'toggle' | 'auto';
  freqFromY: (y: number) => number;
  room3BodyMaterial: Room3BodyControls['material'];
  constellationTension: number;
  constellationBrightness: number;
  selectedLoopHandoffProfile: TopologyHandoffProfile | null;
  selectedLoopMaterial: { balanceCarrier?: number | string | null } | null;
  summarizeHandoffProfile: (profile: any) => string;
};

export function buildTopologyPanelDisplayState(args: BuildTopologyPanelDisplayStateArgs) {
  return {
    topologyStatusLine: buildTopologyStatusLine({
      snapshot: args.snapshot,
      room3BodyEnabled: args.room3BodyEnabled,
      materialLabel: args.materialLabel,
      primedY: args.primedY,
      primedSource: args.primedSource,
      freqFromY: args.freqFromY,
    }),
    room3MaterialLabel: getRoom3MaterialLabel(args.room3BodyMaterial, args.constellationTension, args.constellationBrightness),
    handoffSummary: args.selectedLoopHandoffProfile
      ? args.summarizeHandoffProfile(args.selectedLoopHandoffProfile)
      : 'Noch kein aktives Forge-Material mit Handoff-Profil ausgewählt.',
    handoffBalanceCarrier: (() => {
      const balanceCarrier = args.selectedLoopMaterial?.balanceCarrier ?? args.selectedLoopHandoffProfile?.balanceCarrier ?? null;
      return typeof balanceCarrier === 'number' ? balanceCarrier.toFixed(2) : null;
    })(),
  };
}

type BuildTopologyRoomNavigationActionsArgs = {
  setFamilyRequestedActive: Dispatch<SetStateAction<FamilyRequestedActive>>;
  setRoom: (room: Room) => void;
};

export function buildTopologyRoomNavigationActions(args: BuildTopologyRoomNavigationActionsArgs) {
  return {
    openClassicField: () => {
      args.setFamilyRequestedActive(null);
      args.setRoom('RESONANCE');
    },
    openRefactorField: () => {
      args.setFamilyRequestedActive('melodieQuest');
      args.setRoom('XENPOLAR');
    },
  };
}
