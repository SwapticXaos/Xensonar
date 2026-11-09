import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { InstallationFieldConfig } from '../../topology/installationFieldConfig';
import { createResidentConstellationSnapshot, restoreResidentConstellationNodes, type SavedResidentConstellation } from '../../topology/residentConstellations';
import { addCustomResidentNode, applyResidentModeMask } from '../../topology/residentTheory';
import type { SemanticNode } from '../domain/runtimeTypes';

type TopologyNodeRefs = MutableRefObject<{
  nodes: SemanticNode[];
}>;

type BuildTopologyResidentActionsArgs = {
  topologyRefs: TopologyNodeRefs;
  residentBaseHz: number;
  topologyWidth: number;
  topologyHeight: number;
  installationFieldConfigRef: MutableRefObject<InstallationFieldConfig>;
  residentAddFrequencyHz: number;
  customResidentSoundPreset: string;
  customResidentElasticPitch: boolean;
  residentConstellationName: string;
  savedResidentConstellations: SavedResidentConstellation[];
  setSavedResidentConstellations: Dispatch<SetStateAction<SavedResidentConstellation[]>>;
  setInstallationFieldConfig: Dispatch<SetStateAction<InstallationFieldConfig>>;
  setSelectedResidentId: Dispatch<SetStateAction<string | null>>;
  setResidentConstellationName: Dispatch<SetStateAction<string>>;
  setSystemState: Dispatch<SetStateAction<string>>;
};

export function buildTopologyResidentActions(args: BuildTopologyResidentActionsArgs) {
  return {
    addInstallationResident: () => {
      const node = addCustomResidentNode({
        nodes: args.topologyRefs.current.nodes,
        baseFreq: args.residentBaseHz,
        width: args.topologyWidth,
        height: args.topologyHeight,
        system: args.installationFieldConfigRef.current.residentSystem,
        mode: args.installationFieldConfigRef.current.residentMode,
        frequencyHz: args.residentAddFrequencyHz,
      });
      node.customResidentSound = args.customResidentSoundPreset;
      node.customResidentElasticPitch = !!args.customResidentElasticPitch;
      args.setSelectedResidentId(node.residentId ?? null);
      args.setSystemState(`Resident ergänzt: ${node.freq.toFixed(1)} Hz`);
    },
    saveCurrentResidentConstellation: () => {
      const snapshot = createResidentConstellationSnapshot({
        name: args.residentConstellationName,
        nodes: args.topologyRefs.current.nodes,
        config: args.installationFieldConfigRef.current,
      });
      args.setSavedResidentConstellations((prev) => [snapshot, ...prev.filter((entry) => entry.id !== snapshot.id)].slice(0, 12));
    },
    loadResidentConstellation: (id: string) => {
      const snapshot = args.savedResidentConstellations.find((entry) => entry.id === id);
      if (!snapshot) return;
      args.topologyRefs.current.nodes = restoreResidentConstellationNodes(snapshot);
      applyResidentModeMask(args.topologyRefs.current.nodes, args.residentBaseHz, snapshot.config.residentSystem, snapshot.config.residentMode);
      args.setInstallationFieldConfig((prev) => ({
        ...prev,
        residentsEnabled: snapshot.config.residentsEnabled,
        residentSystem: snapshot.config.residentSystem,
        residentMode: snapshot.config.residentMode,
        residentSound: snapshot.config.residentSound,
        residentVolume: snapshot.config.residentVolume,
        residentElasticPitch: !!snapshot.config.residentElasticPitch,
      }));
      args.setSelectedResidentId(args.topologyRefs.current.nodes[0]?.residentId ?? null);
      args.setResidentConstellationName(snapshot.name);
      args.setSystemState(`Resident-Konstellation geladen: ${snapshot.name}`);
    },
    deleteResidentConstellation: (id: string) => {
      args.setSavedResidentConstellations((prev) => prev.filter((entry) => entry.id !== id));
    },
  };
}
