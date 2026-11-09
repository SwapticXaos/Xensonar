import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { MYZEL_POST_FX_GROUPS } from "../architecture/machineRooms";
import type { MyzelPostFxGroupId } from "../architecture/machineRoomTypes";
import type { SemanticNode } from "../domain/runtimeTypes";
import type { MyzelPattern } from "../domain/instrumentData";
import type {
  DEFAULT_INSTALLATION_FIELD_CONFIG,
  InstallationResidentSoundPreset,
} from "../../topology/installationFieldConfig";
import type { SavedResidentConstellation } from "../../topology/residentConstellations";
import type { MyceliumSnapshot } from "../../topology/myceliumSnapshot";
import type {
  deriveDroneMyceliumMod,
  deriveMyzelLayerMod,
  MyzelBallMode,
  MyzelNodeMode,
} from "../../resonance/myceliumInterpreters";
import type { MyzelInterpreterMix } from "../../resonance/interpreterConfig";
import type { MyzelCentralColorMixer } from "../../resonance/myzelCentralColorMixer";
import type { NodalDeviceMatrix } from "../../resonance/nodalDeviceMatrix";
import type { Room3ModField } from "../../resonance/modField";
import type {
  MyzelPostFxRouter,
  MyzelPostFxSourceKey,
  MyzelPostFxTelemetry,
} from "../../resonance/myzelPostFxRouter";
import type { SemanticInteractionEnvelope } from "../../resonance/semanticInteractionDevice";
import type { TopologicalResonatorEnvelope } from "../../resonance/topologicalResonanceMatrix";
import type { Room3BodyControls, Room3TimbreState } from "../../resonance/timbreModel";
import type { MyzelInstallationMix, MyzelTopologyMode } from "../../resonance/refactorTopologySupport";
import type { createRefactorTopologyLegacyAudioState } from "../../resonance/refactorTopologyLegacyAudio";
import type { Room3ModalBodyState } from "../../resonance/modalBody";
import type { createRoom3NodeDeviceAudioEnvelope } from "./room3NodeDeviceAudioPath";

type Room3StateSetter<T> = Dispatch<SetStateAction<T>>;
type Room3TParams = {
  tension: number;
  slimLayers: number;
  rawReality: number;
  intensityGlobal: number;
};

export type TopologyAudioRefs = {
  nodes: SemanticNode[];
  cursor: { x: number; y: number; vx: number; vy: number };
  osc: OscillatorNode | null;
  filter: BiquadFilterNode | null;
  gain: GainNode | null;
  fmOsc: OscillatorNode | null;
  fmGain: GainNode | null;
};

export type ConstellationStateSnapshot = {
  ratios: number[];
  tension: number;
  brightness: number;
  centroidX: number;
  centroidY: number;
  flux: number;
};

export type Room3TopologyStateRefs = {
  installationFieldConfigRef: MutableRefObject<typeof DEFAULT_INSTALLATION_FIELD_CONFIG>;
  installationSharedFieldActiveRef: MutableRefObject<boolean>;
  room3BodyEnabledRef: MutableRefObject<boolean>;
  room3BodyControlsRef: MutableRefObject<Room3BodyControls>;
  myzelTopologyModeRef: MutableRefObject<MyzelTopologyMode>;
  myzelInstallationMixRef: MutableRefObject<MyzelInstallationMix>;
  myzelLegacyAudioRef: MutableRefObject<ReturnType<typeof createRefactorTopologyLegacyAudioState>>;
  myzelInterpreterMixRef: MutableRefObject<MyzelInterpreterMix>;
  myzelCentralColorMixerRef: MutableRefObject<MyzelCentralColorMixer>;
  nodalDeviceMatrixRef: MutableRefObject<NodalDeviceMatrix>;
  myzelPostFxRouterRef: MutableRefObject<MyzelPostFxRouter | null>;
  myzelPostFxSendsRef: MutableRefObject<Record<MyzelPostFxSourceKey, GainNode | null>>;
  myzelPostFxConnectionsRef: MutableRefObject<{ drone: boolean; myzel: boolean }>;
  myzelPrimedYRef: MutableRefObject<number | null>;
  myzelPrimedSourceRef: MutableRefObject<"resonance" | "topology" | "wave" | "toggle" | "auto">;
  topologyCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  topologyDragRef: MutableRefObject<{ nodeIndex: number | null; offsetX: number; offsetY: number }>;
  topologyRefs: MutableRefObject<TopologyAudioRefs>;
  myceliumSnapshotRef: MutableRefObject<MyceliumSnapshot>;
  constellationStateRef: MutableRefObject<ConstellationStateSnapshot>;
  myceliumDroneAmountRef: MutableRefObject<number>;
  myceliumDroneModRef: MutableRefObject<ReturnType<typeof deriveDroneMyceliumMod>>;
  myzelLayerModRef: MutableRefObject<ReturnType<typeof deriveMyzelLayerMod>>;
  myzelGateRef: MutableRefObject<number>;
  myzelAudioFieldEnvelopeRef: MutableRefObject<ReturnType<typeof createRoom3NodeDeviceAudioEnvelope>>;
  myzelFieldSpaceBoostRef: MutableRefObject<number>;
  semanticInteractionEnvelopeRef: MutableRefObject<SemanticInteractionEnvelope>;
  topologicalResonatorEnvelopeRef: MutableRefObject<TopologicalResonatorEnvelope>;
  room3ModFieldRef: MutableRefObject<Room3ModField>;
  room3TimbreStateRef: MutableRefObject<Room3TimbreState>;
  room3ModalStateRef: MutableRefObject<Room3ModalBodyState>;
  room3BodyCurveRef: MutableRefObject<{ pre: number; post: number }>;
  topologyLoopErrorRef: MutableRefObject<string | null>;
  topologyLastStatusRef: MutableRefObject<string>;
};

export type Room3InstallationSharedFieldFlags = {
  installationSharedFieldActive: boolean;
  installResidentsEnabled: boolean;
  installAttractCursor: boolean;
  installAttractOscillatorBall: boolean;
  installResidentWaveExcitationEnabled: boolean;
  installResidentBallCouplingEnabled: boolean;
};

export type Room3TopologyUiState = Room3TopologyStateRefs & {
  myzelEnabled: boolean;
  setMyzelEnabled: Room3StateSetter<boolean>;
  tParams: Room3TParams;
  setTParams: Room3StateSetter<Room3TParams>;
  myzelInterpreterMix: MyzelInterpreterMix;
  setMyzelInterpreterMix: Room3StateSetter<MyzelInterpreterMix>;
  myzelCentralColorMixer: MyzelCentralColorMixer;
  setMyzelCentralColorMixer: Room3StateSetter<MyzelCentralColorMixer>;
  nodalDeviceMatrix: NodalDeviceMatrix;
  setNodalDeviceMatrix: Room3StateSetter<NodalDeviceMatrix>;
  myzelDriveEnabled: boolean;
  setMyzelDriveEnabled: Room3StateSetter<boolean>;
  keyboardWindowStamp: number;
  setKeyboardWindowStamp: Room3StateSetter<number>;
  myzelPattern: MyzelPattern;
  setMyzelPattern: Room3StateSetter<MyzelPattern>;
  myzelPostFxGroup: MyzelPostFxGroupId;
  setMyzelPostFxGroup: Room3StateSetter<MyzelPostFxGroupId>;
  activeMyzelPostFxGroup: (typeof MYZEL_POST_FX_GROUPS)[number];
  myzelPostFxDepth: number;
  setMyzelPostFxDepth: Room3StateSetter<number>;
  myzelPostFxParallel: number;
  setMyzelPostFxParallel: Room3StateSetter<number>;
  myzelPostFxEnabled: boolean;
  setMyzelPostFxEnabled: Room3StateSetter<boolean>;
  myzelFollowForgeHandoff: boolean;
  setMyzelFollowForgeHandoff: Room3StateSetter<boolean>;
  setMyzelPostFxMonitor: Room3StateSetter<MyzelPostFxTelemetry | null>;
  myzelBallMode: MyzelBallMode;
  setMyzelBallMode: Room3StateSetter<MyzelBallMode>;
  myzelNodeMode: MyzelNodeMode;
  setMyzelNodeMode: Room3StateSetter<MyzelNodeMode>;
  myzelStep16ths: number;
  setMyzelStep16ths: Room3StateSetter<number>;
  room3BodyEnabled: boolean;
  setRoom3BodyEnabled: Room3StateSetter<boolean>;
  room3BodyControls: Room3BodyControls;
  setRoom3BodyControls: Room3StateSetter<Room3BodyControls>;
  myzelTopologyMode: MyzelTopologyMode;
  setMyzelTopologyMode: Room3StateSetter<MyzelTopologyMode>;
  myzelInstallationMix: MyzelInstallationMix;
  setMyzelInstallationMix: Room3StateSetter<MyzelInstallationMix>;
  installationFieldConfig: typeof DEFAULT_INSTALLATION_FIELD_CONFIG;
  setInstallationFieldConfig: Room3StateSetter<typeof DEFAULT_INSTALLATION_FIELD_CONFIG>;
  selectedResidentId: string | null;
  setSelectedResidentId: Room3StateSetter<string | null>;
  residentConstellationName: string;
  setResidentConstellationName: Room3StateSetter<string>;
  residentAddFrequencySlider: number;
  setResidentAddFrequencySlider: Room3StateSetter<number>;
  customResidentSoundPreset: InstallationResidentSoundPreset;
  setCustomResidentSoundPreset: Room3StateSetter<InstallationResidentSoundPreset>;
  customResidentElasticPitch: boolean;
  setCustomResidentElasticPitch: Room3StateSetter<boolean>;
  savedResidentConstellations: SavedResidentConstellation[];
  setSavedResidentConstellations: Room3StateSetter<SavedResidentConstellation[]>;
  systemState: string;
  setSystemState: Room3StateSetter<string>;
  room3TopologyStateRefs: Room3TopologyStateRefs;
  installationSharedFieldFlags: Room3InstallationSharedFieldFlags;
};
