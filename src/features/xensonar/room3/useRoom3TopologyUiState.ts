import { useMemo, useRef, useState } from "react";
import { MYZEL_POST_FX_GROUPS } from "../architecture/machineRooms";
import type { MyzelPostFxGroupId } from "../architecture/machineRoomTypes";
import type { SemanticNode } from "../domain/runtimeTypes";
import { DEFAULT_INSTALLATION_FIELD_CONFIG, type InstallationResidentSoundPreset } from "../../topology/installationFieldConfig";
import { residentSliderFromHz } from "../../topology/residentTheory";
import { loadResidentConstellations, type SavedResidentConstellation } from "../../topology/residentConstellations";
import { createEmptyMyceliumSnapshot, type MyceliumSnapshot } from "../../topology/myceliumSnapshot";
import { deriveDroneMyceliumMod, deriveMyzelLayerMod, type MyzelBallMode, type MyzelNodeMode } from "../../resonance/myceliumInterpreters";
import { DEFAULT_MYZEL_INTERPRETER_MIX, type MyzelInterpreterMix } from "../../resonance/interpreterConfig";
import { DEFAULT_MYZEL_CENTRAL_COLOR_MIXER, type MyzelCentralColorMixer } from "../../resonance/myzelCentralColorMixer";
import { DEFAULT_NODAL_DEVICE_MATRIX, type NodalDeviceMatrix } from "../../resonance/nodalDeviceMatrix";
import { deriveRoom3ModField, type Room3ModField } from "../../resonance/modField";
import { type MyzelPostFxRouter, type MyzelPostFxSourceKey, type MyzelPostFxTelemetry } from "../../resonance/myzelPostFxRouter";
import { createSemanticInteractionEnvelope, type SemanticInteractionEnvelope } from "../../resonance/semanticInteractionDevice";
import { createTopologicalResonatorEnvelope, type TopologicalResonatorEnvelope } from "../../resonance/topologicalResonanceMatrix";
import { DEFAULT_ROOM3_BODY_CONTROLS, deriveRoom3TimbreState, type Room3BodyControls, type Room3TimbreState } from "../../resonance/timbreModel";
import { DEFAULT_MYZEL_INSTALLATION_MIX, type MyzelInstallationMix, type MyzelTopologyMode } from "../../resonance/refactorTopologySupport";
import { createRefactorTopologyLegacyAudioState } from "../../resonance/refactorTopologyLegacyAudio";
import { deriveRoom3ModalBody, type Room3ModalBodyState } from "../../resonance/modalBody";
import { createRoom3NodeDeviceAudioEnvelope } from "./room3NodeDeviceAudioPath";
import type { MyzelPattern } from "../domain/instrumentData";

import type {
  ConstellationStateSnapshot,
  Room3InstallationSharedFieldFlags,
  Room3TopologyStateRefs,
  Room3TopologyUiState,
  TopologyAudioRefs,
} from "./room3TopologyUiStateTypes";
export type {
  ConstellationStateSnapshot,
  Room3InstallationSharedFieldFlags,
  Room3TopologyStateRefs,
  Room3TopologyUiState,
  TopologyAudioRefs,
} from "./room3TopologyUiStateTypes";

export function useRoom3TopologyUiState(): Room3TopologyUiState {
  const [myzelEnabled, setMyzelEnabled] = useState(false);
  const [tParams, setTParams] = useState({ tension: 0.5, slimLayers: 0.8, rawReality: 0.3, intensityGlobal: 0.48 });
  const [myzelInterpreterMix, setMyzelInterpreterMix] = useState<MyzelInterpreterMix>(DEFAULT_MYZEL_INTERPRETER_MIX);
  const [myzelCentralColorMixer, setMyzelCentralColorMixer] = useState<MyzelCentralColorMixer>(DEFAULT_MYZEL_CENTRAL_COLOR_MIXER);
  const [nodalDeviceMatrix, setNodalDeviceMatrix] = useState<NodalDeviceMatrix>(DEFAULT_NODAL_DEVICE_MATRIX);
  const [myzelDriveEnabled, setMyzelDriveEnabled] = useState(true);
  const [keyboardWindowStamp, setKeyboardWindowStamp] = useState(0);
  const [myzelPattern, setMyzelPattern] = useState<MyzelPattern>("breath");
  const [myzelPostFxGroup, setMyzelPostFxGroup] = useState<MyzelPostFxGroupId>("master");
  const [myzelPostFxDepth, setMyzelPostFxDepth] = useState(0.58);
  const [myzelPostFxParallel, setMyzelPostFxParallel] = useState(0.42);
  const [myzelPostFxEnabled, setMyzelPostFxEnabled] = useState(true);
  const [myzelFollowForgeHandoff, setMyzelFollowForgeHandoff] = useState(true);
  const [, setMyzelPostFxMonitor] = useState<MyzelPostFxTelemetry | null>(null);
  const [myzelBallMode, setMyzelBallMode] = useState<MyzelBallMode>("scanner");
  const [myzelNodeMode, setMyzelNodeMode] = useState<MyzelNodeMode>("hybrid");
  const [myzelStep16ths, setMyzelStep16ths] = useState<number>(4);
  const [room3BodyEnabled, setRoom3BodyEnabled] = useState(true);
  const [room3BodyControls, setRoom3BodyControls] = useState<Room3BodyControls>(DEFAULT_ROOM3_BODY_CONTROLS);
  const [myzelTopologyMode, setMyzelTopologyMode] = useState<MyzelTopologyMode>("enhancer");
  const [myzelInstallationMix, setMyzelInstallationMix] = useState<MyzelInstallationMix>(DEFAULT_MYZEL_INSTALLATION_MIX);
  const [installationFieldConfig, setInstallationFieldConfig] = useState(DEFAULT_INSTALLATION_FIELD_CONFIG);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [residentConstellationName, setResidentConstellationName] = useState("Neue Konstellation");
  const [residentAddFrequencySlider, setResidentAddFrequencySlider] = useState(() => residentSliderFromHz(220));
  const [customResidentSoundPreset, setCustomResidentSoundPreset] = useState<InstallationResidentSoundPreset>(DEFAULT_INSTALLATION_FIELD_CONFIG.residentSound);
  const [customResidentElasticPitch, setCustomResidentElasticPitch] = useState<boolean>(false);
  const [savedResidentConstellations, setSavedResidentConstellations] = useState<SavedResidentConstellation[]>(() => loadResidentConstellations());
  const [systemState, setSystemState] = useState<string>("Fließendes Myzel");

  const installationFieldConfigRef = useRef(DEFAULT_INSTALLATION_FIELD_CONFIG);
  const installationSharedFieldActiveRef = useRef(false);
  const room3BodyEnabledRef = useRef(true);
  const room3BodyControlsRef = useRef<Room3BodyControls>(DEFAULT_ROOM3_BODY_CONTROLS);
  const myzelTopologyModeRef = useRef<MyzelTopologyMode>("enhancer");
  const myzelInstallationMixRef = useRef<MyzelInstallationMix>(DEFAULT_MYZEL_INSTALLATION_MIX);
  const myzelLegacyAudioRef = useRef(createRefactorTopologyLegacyAudioState());
  const myzelInterpreterMixRef = useRef<MyzelInterpreterMix>(DEFAULT_MYZEL_INTERPRETER_MIX);
  const myzelCentralColorMixerRef = useRef<MyzelCentralColorMixer>(DEFAULT_MYZEL_CENTRAL_COLOR_MIXER);
  const nodalDeviceMatrixRef = useRef<NodalDeviceMatrix>(DEFAULT_NODAL_DEVICE_MATRIX);
  const myzelPostFxRouterRef = useRef<MyzelPostFxRouter | null>(null);
  const myzelPostFxSendsRef = useRef<Record<MyzelPostFxSourceKey, GainNode | null>>({ particles: null, drone: null, waves: null, myzel: null, forge: null });
  const myzelPostFxConnectionsRef = useRef<{ drone: boolean; myzel: boolean }>({ drone: false, myzel: false });
  const myzelPrimedYRef = useRef<number | null>(null);
  const myzelPrimedSourceRef = useRef<"resonance" | "topology" | "wave" | "toggle" | "auto">("auto");
  const topologyCanvasRef = useRef<HTMLCanvasElement>(null);
  const topologyDragRef = useRef<{ nodeIndex: number | null; offsetX: number; offsetY: number }>({ nodeIndex: null, offsetX: 0, offsetY: 0 });
  const topologyRefs = useRef<TopologyAudioRefs>({
    nodes: [] as SemanticNode[],
    cursor: { x: 0, y: 0, vx: 0, vy: 0 },
    osc: null,
    filter: null,
    gain: null,
    fmOsc: null,
    fmGain: null,
  });
  const myceliumSnapshotRef = useRef<MyceliumSnapshot>(createEmptyMyceliumSnapshot());
  const constellationStateRef = useRef<ConstellationStateSnapshot>({
    ratios: [1.25, 1.5, 1.875],
    tension: 0,
    brightness: 0.5,
    centroidX: 0.5,
    centroidY: 0.5,
    flux: 0,
  });
  const myceliumDroneAmountRef = useRef(0.35);
  const myceliumDroneModRef = useRef(deriveDroneMyceliumMod(createEmptyMyceliumSnapshot(), 0));
  const myzelLayerModRef = useRef(deriveMyzelLayerMod(createEmptyMyceliumSnapshot(), 0.48, 55, "scanner", "hybrid"));
  const myzelGateRef = useRef(0);
  const myzelAudioFieldEnvelopeRef = useRef(createRoom3NodeDeviceAudioEnvelope());
  const myzelFieldSpaceBoostRef = useRef(0);
  const semanticInteractionEnvelopeRef = useRef<SemanticInteractionEnvelope>(createSemanticInteractionEnvelope());
  const topologicalResonatorEnvelopeRef = useRef<TopologicalResonatorEnvelope>(createTopologicalResonatorEnvelope());
  const room3ModFieldRef = useRef<Room3ModField>(deriveRoom3ModField(createEmptyMyceliumSnapshot(), 0, DEFAULT_ROOM3_BODY_CONTROLS));
  const room3TimbreStateRef = useRef<Room3TimbreState>(deriveRoom3TimbreState(createEmptyMyceliumSnapshot(), room3ModFieldRef.current, DEFAULT_ROOM3_BODY_CONTROLS));
  const room3ModalStateRef = useRef<Room3ModalBodyState>(deriveRoom3ModalBody(createEmptyMyceliumSnapshot(), 110, room3TimbreStateRef.current, room3ModFieldRef.current));
  const room3BodyCurveRef = useRef({ pre: -1, post: -1 });
  const topologyLoopErrorRef = useRef<string | null>(null);
  const topologyLastStatusRef = useRef<string>("Fließendes Myzel");

  const activeMyzelPostFxGroup = useMemo(() => MYZEL_POST_FX_GROUPS.find((entry) => entry.id === myzelPostFxGroup) ?? MYZEL_POST_FX_GROUPS[0], [myzelPostFxGroup]);

  const installationSharedFieldFlags = useMemo<Room3InstallationSharedFieldFlags>(() => ({
    installationSharedFieldActive: myzelEnabled && myzelTopologyMode === "installation",
    installResidentsEnabled: installationFieldConfig.residentsEnabled,
    installAttractCursor: installationFieldConfig.nomadAttractors.cursor,
    installAttractOscillatorBall: installationFieldConfig.nomadAttractors.oscillatorBall,
    installResidentWaveExcitationEnabled: installationFieldConfig.residentWaveExcitation.sonarWaves,
    installResidentBallCouplingEnabled: installationFieldConfig.residentBallCoupling.oscillatorBall,
  }), [installationFieldConfig, myzelEnabled, myzelTopologyMode]);

  const room3TopologyStateRefs = useMemo<Room3TopologyStateRefs>(() => ({
    installationFieldConfigRef,
    installationSharedFieldActiveRef,
    room3BodyEnabledRef,
    room3BodyControlsRef,
    myzelTopologyModeRef,
    myzelInstallationMixRef,
    myzelLegacyAudioRef,
    myzelInterpreterMixRef,
    myzelCentralColorMixerRef,
    nodalDeviceMatrixRef,
    myzelPostFxRouterRef,
    myzelPostFxSendsRef,
    myzelPostFxConnectionsRef,
    myzelPrimedYRef,
    myzelPrimedSourceRef,
    topologyCanvasRef,
    topologyDragRef,
    topologyRefs,
    myceliumSnapshotRef,
    constellationStateRef,
    myceliumDroneAmountRef,
    myceliumDroneModRef,
    myzelLayerModRef,
    myzelGateRef,
    myzelAudioFieldEnvelopeRef,
    myzelFieldSpaceBoostRef,
    semanticInteractionEnvelopeRef,
    topologicalResonatorEnvelopeRef,
    room3ModFieldRef,
    room3TimbreStateRef,
    room3ModalStateRef,
    room3BodyCurveRef,
    topologyLoopErrorRef,
    topologyLastStatusRef,
  }), []);

  return {
    myzelEnabled,
    setMyzelEnabled,
    tParams,
    setTParams,
    myzelInterpreterMix,
    setMyzelInterpreterMix,
    myzelCentralColorMixer,
    setMyzelCentralColorMixer,
    nodalDeviceMatrix,
    setNodalDeviceMatrix,
    myzelDriveEnabled,
    setMyzelDriveEnabled,
    keyboardWindowStamp,
    setKeyboardWindowStamp,
    myzelPattern,
    setMyzelPattern,
    myzelPostFxGroup,
    setMyzelPostFxGroup,
    activeMyzelPostFxGroup,
    myzelPostFxDepth,
    setMyzelPostFxDepth,
    myzelPostFxParallel,
    setMyzelPostFxParallel,
    myzelPostFxEnabled,
    setMyzelPostFxEnabled,
    myzelFollowForgeHandoff,
    setMyzelFollowForgeHandoff,
    setMyzelPostFxMonitor,
    myzelBallMode,
    setMyzelBallMode,
    myzelNodeMode,
    setMyzelNodeMode,
    myzelStep16ths,
    setMyzelStep16ths,
    room3BodyEnabled,
    setRoom3BodyEnabled,
    room3BodyControls,
    setRoom3BodyControls,
    myzelTopologyMode,
    setMyzelTopologyMode,
    myzelInstallationMix,
    setMyzelInstallationMix,
    installationFieldConfig,
    setInstallationFieldConfig,
    selectedResidentId,
    setSelectedResidentId,
    residentConstellationName,
    setResidentConstellationName,
    residentAddFrequencySlider,
    setResidentAddFrequencySlider,
    customResidentSoundPreset,
    setCustomResidentSoundPreset,
    customResidentElasticPitch,
    setCustomResidentElasticPitch,
    savedResidentConstellations,
    setSavedResidentConstellations,
    systemState,
    setSystemState,
    ...room3TopologyStateRefs,
    room3TopologyStateRefs,
    installationSharedFieldFlags,
  };
}
