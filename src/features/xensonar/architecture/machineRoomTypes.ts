export type MachineRoomId =
  | "xensonarPerformance"
  | "forgeLegacy"
  | "forgeCanonical"
  | "myzelMastering"
  | "externalSlot"
  | "forgeWorkshop";

export type SyntheticForgeWorkspaceId = "wave-material" | "microtonal-logic";
/** @deprecated Legacy implementation alias. Use SyntheticForgeWorkspaceId. */
export type Forge2WorkspaceId = SyntheticForgeWorkspaceId;
export type MyzelPostFxGroupId = "master" | "particles" | "drone" | "waves" | "forge";
export type SupportedMaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
export type TransitionGuardId = 'stabilize-contracts' | 'guarded-handoff';

export interface MachineRoomHandoffProfile {
  preferredMyzelGroup: MyzelPostFxGroupId;
  workspaceOrigin?: SyntheticForgeWorkspaceId | 'legacy-forge' | 'external' | 'forge-workshop';
  transitionGuard: TransitionGuardId;
  balanceCarrier: string;
  routeSummary: string;
  stabilizeBy: string;
}

export interface MachineRoomDefinition {
  id: MachineRoomId;
  stageLabel: string;
  title: string;
  shortLabel: string;
  summary: string;
  exportsTo: string;
  owns: string[];
  avoids: string[];
}

export interface SyntheticForgeWorkspaceDefinition {
  id: SyntheticForgeWorkspaceId;
  label: string;
  summary: string;
  inheritsBalanceFrom: string;
  preparesFor: string;
}

/** @deprecated Legacy implementation alias. Use SyntheticForgeWorkspaceDefinition. */
export type Forge2WorkspaceDefinition = SyntheticForgeWorkspaceDefinition;

export interface MyzelPostFxGroupDefinition {
  id: MyzelPostFxGroupId;
  label: string;
  summary: string;
  receivesFrom: string;
  keepsStableBy: string;
}

