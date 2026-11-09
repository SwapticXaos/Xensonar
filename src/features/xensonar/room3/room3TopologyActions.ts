import { DEFAULT_INSTALLATION_FIELD_CONFIG, type InstallationFieldConfig } from '../../topology/installationFieldConfig';
import { applyResidentModeMask } from '../../topology/residentTheory';
import { createInitialMyzelTopologyNodes, type MyzelTopologyMode } from '../../resonance/refactorTopologySupport';
import type { MyzelNodeMode } from '../../resonance/myceliumInterpreters';
import type { SemanticNode } from '../domain/runtimeTypes';
import type { MyzelPattern } from '../domain/instrumentData';

type MutableRef<T> = { current: T };

type TopologyRefs = MutableRef<{
  nodes: SemanticNode[];
}>;

type BuildRoom3TopologyActionsArgs = {
  topologyRefs: TopologyRefs;
  topologyWidth: number;
  topologyHeight: number;
  installationFieldConfig: InstallationFieldConfig;
  setInstallationFieldConfig: (value: InstallationFieldConfig) => void;
  setMyzelTopologyMode: (mode: MyzelTopologyMode) => void;
  setMyzelEnabled: (enabled: boolean) => void;
  setMyzelNodeMode: (mode: MyzelNodeMode) => void;
  setMyzelPattern: (pattern: MyzelPattern) => void;
  setMyzelPostFxEnabled: (enabled: boolean) => void;
  setSystemState: (message: string) => void;
  topologyLoopErrorRef: MutableRef<unknown>;
  warmMyzelAudioRuntime: () => void;
  myzelEnabled: boolean;
};

export function buildRoom3TopologyActions(args: BuildRoom3TopologyActionsArgs) {
  const resetMyzelTopologyNodes = () => {
    args.topologyRefs.current.nodes = createInitialMyzelTopologyNodes(220, args.topologyWidth, args.topologyHeight);
    applyResidentModeMask(
      args.topologyRefs.current.nodes,
      220,
      args.installationFieldConfig.residentSystem,
      args.installationFieldConfig.residentMode,
    );
  };

  const setMyzelModeAndPower = (mode: MyzelTopologyMode) => {
    args.topologyLoopErrorRef.current = null;
    args.setMyzelTopologyMode(mode);
    args.setMyzelEnabled(true);
    if (mode === 'installation') {
      args.setSystemState('Kunst-Installation · Resident Constellations');
      args.setMyzelNodeMode('ji');
      args.setMyzelPattern('choir');
      args.setMyzelPostFxEnabled(false);
      args.setInstallationFieldConfig(DEFAULT_INSTALLATION_FIELD_CONFIG);
    } else {
      args.setSystemState('Fließendes Myzel');
      args.setMyzelPostFxEnabled(true);
    }
    args.warmMyzelAudioRuntime();
  };

  const toggleMyzelEnabled = () => {
    args.topologyLoopErrorRef.current = null;
    if (args.myzelEnabled) {
      args.setSystemState('Fließendes Myzel');
      args.setMyzelEnabled(false);
      return;
    }
    args.setMyzelEnabled(true);
    args.warmMyzelAudioRuntime();
  };

  return {
    resetMyzelTopologyNodes,
    setMyzelModeAndPower,
    toggleMyzelEnabled,
  };
}
