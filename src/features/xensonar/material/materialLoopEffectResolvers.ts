import type { MaterialEntry } from '../../l3lab/materialLibrary';
import type { MyzelPostFxGroupId } from '../architecture/machineRoomTypes';

export function resolveMaterialLoopRenameDraftValue(managedLoopMaterial: MaterialEntry | null) {
  return managedLoopMaterial?.name ?? '';
}

export function resolveMaterialLoopMyzelGroupTarget(args: {
  followForgeHandoff: boolean;
  materialLoopActive: boolean;
  effectiveLoopMyzelGroup: MyzelPostFxGroupId | null;
  currentGroup: MyzelPostFxGroupId;
}) {
  const { followForgeHandoff, materialLoopActive, effectiveLoopMyzelGroup, currentGroup } = args;
  if (!followForgeHandoff || !materialLoopActive || !effectiveLoopMyzelGroup) return null;
  return currentGroup === effectiveLoopMyzelGroup ? null : effectiveLoopMyzelGroup;
}
