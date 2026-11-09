import type { MutableRefObject, RefObject } from "react";
import type { MyzelTopologyMode } from "../../resonance/refactorTopologySupport";

type MutableRuntimeRef<T = any> = MutableRefObject<T> | RefObject<T>;

export type Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs = {
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  nexusRefs: MutableRuntimeRef<any>;
  myzelEnabled: boolean;
  myzelTopologyMode: MyzelTopologyMode;
  myzelTopologyModeRef: MutableRuntimeRef<MyzelTopologyMode>;
  nParamsUI: {
    bassRootMode: string;
    bassRootHz: number;
  };
  getInterpreterMyzelBaseHz: () => number;
  getLiveMasterBus: (ctx: AudioContext, lane: "space") => AudioNode;
  ensureMyzelSynth: (ctx: AudioContext) => void;
  refs: {
    myceliumSnapshotRef: MutableRuntimeRef<any>;
    myzelCentralColorMixerRef: MutableRuntimeRef<any>;
    nodalDeviceMatrixRef: MutableRuntimeRef<any>;
    myzelAudioFieldEnvelopeRef: MutableRuntimeRef<any>;
    semanticInteractionEnvelopeRef: MutableRuntimeRef<any>;
    topologicalResonatorEnvelopeRef: MutableRuntimeRef<any>;
    myzelLayerModRef: MutableRuntimeRef<any>;
    myzelInterpreterMixRef: MutableRuntimeRef<any>;
    myzelGateRef: MutableRuntimeRef<any>;
    myzelFieldSpaceBoostRef: MutableRuntimeRef<number>;
    myzelLegacyAudioRef: MutableRuntimeRef<any>;
    myzelInstallationMixRef: MutableRuntimeRef<any>;
    installationSharedFieldActiveRef: MutableRuntimeRef<any>;
    installationFieldConfigRef: MutableRuntimeRef<any>;
  };
  policies: {
    myzelDriveEnabled: boolean;
    droneMinFreq: number;
    droneMaxFreq: number;
    isInstallationResidentBallCouplingActive: (sharedFieldActive: any, installationFieldConfig: any) => boolean;
  };
};
