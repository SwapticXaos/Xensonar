import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import { AppHeader } from './AppHeader';
import type { Room } from '../types';
import type { XenpolarView } from '../rooms/XenpolarRoom';
import { openMaterialschmiede } from '../rooms/xenpolarShortcut';
import { enterXensonarHauptraumRoute } from './hauptraumNavigationContract';

export function isXenpolarButtonActive(room: Room, xenpolarShortcutActive: boolean) {
  return room === 'XENPOLAR' || room === 'GAME' || room === 'MAIN' || xenpolarShortcutActive;
}

type BuildAppHeaderPropsArgs = {
  room: Room;
  recordingActive: boolean;
  logoMarkerPulses: ComponentProps<typeof AppHeader>['logoMarkerPulses'];
  recordingDurationLabel: string;
  xenpolarShortcutActive: boolean;
  onLogoClick: () => void;
  onToggleRecordingFromHeader: () => void;
  setFamilyRequestedActive: Dispatch<SetStateAction<'melodieQuest' | null>>;
  setRoom: (room: Room) => void;
  setXenpolarView: Dispatch<SetStateAction<XenpolarView>>;
};

export function buildAppHeaderProps(args: BuildAppHeaderPropsArgs): ComponentProps<typeof AppHeader> {
  return {
    room: args.room,
    recordingActive: args.recordingActive,
    logoMarkerPulses: args.logoMarkerPulses,
    recordingDurationLabel: args.recordingDurationLabel,
    xenpolarShortcutActive: args.xenpolarShortcutActive,
    xenpolarButtonActive: isXenpolarButtonActive(args.room, args.xenpolarShortcutActive),
    onLogoClick: args.onLogoClick,
    onToggleRecordingFromHeader: args.onToggleRecordingFromHeader,
    onOpenResonance: () => enterXensonarHauptraumRoute({
      setRoom: args.setRoom,
      setFamilyRequestedActive: args.setFamilyRequestedActive,
    }),
    onOpenTopology: () => {
      args.setFamilyRequestedActive(null);
      args.setRoom('TOPOLOGY');
    },
    onOpenMaterialschmiede: () => openMaterialschmiede(args.setRoom),
    onOpenXenpolar: () => {
      args.setFamilyRequestedActive(null);
      args.setXenpolarView('launcher');
      args.setRoom('XENPOLAR');
    },
  };
}
