import type { MyzelCentralColorMixer } from '../../resonance/myzelCentralColorMixer';
import type { NodalDeviceMatrix } from '../../resonance/nodalDeviceMatrix';
import type { NodalModRoute } from '../../resonance/nodalModulationMatrix';
import type { MyceliumSnapshot } from '../../topology/myceliumSnapshot';
import type { MyzelRoom3Frame } from '../../topology/myzelRoom3Frame';
import type { SemanticInteractionDevice, SemanticInteractionRefs } from '../../resonance/semanticInteractionDevice';
import type { TopologicalResonatorDevice, TopologicalResonatorRefs } from '../../resonance/topologicalResonanceMatrix';

export type MyzelSynthDeviceId =
  | 'central-color-voice'
  | 'nodal-device-matrix'
  | 'semantic-interaction-device'
  | 'topological-resonance-matrix'
  | 'spatial-aura-field'
  | 'resident-field-frame';

export type MyzelSynthDeviceRole = 'voice-mixer' | 'relation-device' | 'semantic-device' | 'topological-device' | 'spatial-field' | 'resident-field';

export interface MyzelSynthDeviceDefinition {
  id: MyzelSynthDeviceId;
  label: string;
  role: MyzelSynthDeviceRole;
  runtimeFile: string;
  status: 'registered' | 'prepared';
  appTsxBoundary: 'no-inline-audio-graph' | 'no-inline-frame-runtime';
}

export interface MyzelSynthRuntimePolicy {
  enabled: boolean;
  colorMixer: MyzelCentralColorMixer;
  nodalDeviceMatrix: NodalDeviceMatrix;
  nodalModRoutes: readonly NodalModRoute[];
}

export type MyzelSynthAudioDeviceRefs = SemanticInteractionRefs & TopologicalResonatorRefs;

export type MyzelSynthRegisteredAudioDevices = {
  semantic: SemanticInteractionDevice | null;
  topological: TopologicalResonatorDevice | null;
};

export interface MyzelSynthRuntimeSnapshot {
  policy: MyzelSynthRuntimePolicy;
  source: 'default' | 'user-state';
  deviceCount: number;
  activeNodalTargetCount: number;
  room3Frame?: Pick<MyzelRoom3Frame, 'statusLine' | 'cursorYForGame'> | null;
  myceliumSnapshot?: Pick<MyceliumSnapshot, 'maxEnergy' | 'dominantFreq' | 'activeNodeLabel' | 'myzelRelationTension'> | null;
}
