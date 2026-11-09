import type { MaterialEntry } from '../../l3lab/materialLibrary';
import { buildMachineRoomHandoffProfile } from '../architecture/machineRooms';
import type { Forge2WorkspaceId, MachineRoomHandoffProfile, MyzelPostFxGroupId } from '../architecture/machineRoomTypes';

type MaterialLoopWorkspaceOrigin = Forge2WorkspaceId | 'legacy-forge' | 'external' | 'forge-workshop';

function isMaterialLoopWorkspaceOrigin(value: string | undefined): value is MaterialLoopWorkspaceOrigin {
  return value === 'wave-material' || value === 'microtonal-logic' || value === 'legacy-forge' || value === 'external' || value === 'forge-workshop';
}

export function resolveMaterialLoopWorkspaceOrigin(entry: MaterialEntry | null): MaterialLoopWorkspaceOrigin | undefined {
  if (!entry) return undefined;
  if (isMaterialLoopWorkspaceOrigin(entry.workspaceOrigin)) {
    return entry.workspaceOrigin;
  }
  if (entry.renderMode?.includes('microtonal-logic')) return 'microtonal-logic';
  if (entry.renderMode?.includes('wave-material')) return 'wave-material';
  if (entry.renderMode?.includes('legacy')) return 'legacy-forge';
  return undefined;
}

export function buildSelectedLoopHandoffProfile(selectedLoopMaterial: MaterialEntry | null): MachineRoomHandoffProfile | null {
  if (!selectedLoopMaterial) return null;
  return buildMachineRoomHandoffProfile({
    role: selectedLoopMaterial.role,
    workspaceOrigin: resolveMaterialLoopWorkspaceOrigin(selectedLoopMaterial),
  });
}

export function resolveEffectiveLoopMyzelGroup(
  selectedLoopMaterial: MaterialEntry | null,
  selectedLoopHandoffProfile: MachineRoomHandoffProfile | null,
  validGroups: readonly { id: MyzelPostFxGroupId }[],
): MyzelPostFxGroupId | null {
  if (selectedLoopMaterial?.preferredMyzelGroup && validGroups.some((entry) => entry.id === selectedLoopMaterial.preferredMyzelGroup)) {
    return selectedLoopMaterial.preferredMyzelGroup as MyzelPostFxGroupId;
  }
  return selectedLoopHandoffProfile?.preferredMyzelGroup ?? null;
}

export function resolveManagedMaterialLoopIndex(entries: MaterialEntry[], manageId: string) {
  return manageId ? entries.findIndex((entry) => entry.id === manageId) : -1;
}

export function resolveMaterialLoopManagerTargetId(args: {
  entries: MaterialEntry[];
  requestedId?: string;
  activeId?: string;
}) {
  return args.requestedId ?? args.activeId ?? args.entries[0]?.id ?? '';
}

export function resolveMaterialLoopDeleteFallback(nextLoops: MaterialEntry[], currentIndex: number) {
  return nextLoops[Math.min(Math.max(currentIndex, 0), Math.max(0, nextLoops.length - 1))] ?? nextLoops[currentIndex - 1] ?? null;
}

export function resolveMaterialLoopBrowseTargetIndex(args: {
  entries: MaterialEntry[];
  currentId: string;
  browseArmed: boolean;
  key: 'ö' | 'ä';
  directCount: number;
}) {
  const { entries, currentId, browseArmed, key, directCount } = args;
  const currentIndex = entries.findIndex((entry) => entry.id === currentId);
  const lastIndex = entries.length - 1;
  if (lastIndex < directCount) return -1;
  if (!browseArmed || currentIndex < 0 || currentIndex < directCount) {
    return key === 'ö' ? Math.min(directCount, lastIndex) : Math.min(directCount + 1, lastIndex);
  }
  return key === 'ö'
    ? Math.max(0, currentIndex - 1)
    : Math.min(lastIndex, currentIndex + 1);
}
