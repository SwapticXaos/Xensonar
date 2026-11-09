export type RootFollowSessionState = {
  transportAnchor: number | null;
  nextSliceStart: number | null;
  sessionAnchorHz: number | null;
  materialSmoothedRootHz: number | null;
  quantizedRootHz: number | null;
  quantizedRootAcceptSec: number | null;
  globalSlotCounter: number;
};

export function createEmptyRootFollowSessionState(): RootFollowSessionState {
  return {
    transportAnchor: null,
    nextSliceStart: null,
    sessionAnchorHz: null,
    materialSmoothedRootHz: null,
    quantizedRootHz: null,
    quantizedRootAcceptSec: null,
    globalSlotCounter: 0,
  };
}

export function resetRootFollowSessionState(state: RootFollowSessionState) {
  state.transportAnchor = null;
  state.nextSliceStart = null;
  state.sessionAnchorHz = null;
  state.materialSmoothedRootHz = null;
  state.quantizedRootHz = null;
  state.quantizedRootAcceptSec = null;
  state.globalSlotCounter = 0;
}
