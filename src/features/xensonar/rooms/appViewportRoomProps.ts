import {
  buildAuxiliaryRoomProps,
} from './auxiliaryRoomProps';
import {
  buildIrrlichtArenaPanelProps,
  buildMainRoomProps,
  buildXenpolarRoomProps,
} from './appRoomViewportProps';

type BuildAppViewportRoomPropsArgs = {
  mainRoom: Parameters<typeof buildMainRoomProps>[0];
  xenpolarRoom: Parameters<typeof buildXenpolarRoomProps>[0];
  irrlichtArenaPanel: Parameters<typeof buildIrrlichtArenaPanelProps>[0];
  auxiliaryRooms: Parameters<typeof buildAuxiliaryRoomProps>[0];
};

export function buildAppViewportRoomProps(args: BuildAppViewportRoomPropsArgs) {
  return {
    mainRoomProps: buildMainRoomProps(args.mainRoom),
    xenpolarRoomProps: buildXenpolarRoomProps(args.xenpolarRoom),
    irrlichtArenaPanelProps: buildIrrlichtArenaPanelProps(args.irrlichtArenaPanel),
    auxiliaryRoomProps: buildAuxiliaryRoomProps(args.auxiliaryRooms),
  };
}
