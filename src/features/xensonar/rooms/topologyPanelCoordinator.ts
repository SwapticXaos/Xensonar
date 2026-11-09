import { buildTopologyPanelProps } from './appRoomViewportProps';
import {
  buildTopologyPanelDisplayState,
  buildTopologyRoomNavigationActions,
} from './topologyPanelState';

type BuildCoordinatedTopologyPanelPropsArgs = {
  displayState: Parameters<typeof buildTopologyPanelDisplayState>[0];
  navigationActions: Parameters<typeof buildTopologyRoomNavigationActions>[0];
  panel: Omit<Parameters<typeof buildTopologyPanelProps>[0], 'statusLine' | 'room3MaterialLabel' | 'handoffSummary' | 'handoffBalanceCarrier' | 'onOpenClassicField' | 'onOpenRefactorField'>;
};

export function buildCoordinatedTopologyPanelProps(args: BuildCoordinatedTopologyPanelPropsArgs) {
  const displayState = buildTopologyPanelDisplayState(args.displayState);
  const navigationActions = buildTopologyRoomNavigationActions(args.navigationActions);

  return buildTopologyPanelProps({
    ...args.panel,
    statusLine: displayState.topologyStatusLine,
    room3MaterialLabel: displayState.room3MaterialLabel,
    handoffSummary: displayState.handoffSummary,
    handoffBalanceCarrier: displayState.handoffBalanceCarrier,
    onOpenClassicField: navigationActions.openClassicField,
    onOpenRefactorField: navigationActions.openRefactorField,
  });
}
