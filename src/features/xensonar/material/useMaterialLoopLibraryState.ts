import { useEffect, useMemo, useState } from 'react';
import { getMaterialLibraryState, subscribeMaterialLibrary, type MaterialEntry } from '../../l3lab/materialLibrary';
import { buildSelectedLoopHandoffProfile, resolveEffectiveLoopMyzelGroup, resolveManagedMaterialLoopIndex } from './materialLoopBrowserUtils';
import { isVisibleMaterialLoopBankEntry } from './materialLoopRoleFilters';
import type { MyzelPostFxGroupId } from '../architecture/machineRoomTypes';

type ValidMyzelGroup = { id: MyzelPostFxGroupId };

type UseMaterialLoopLibraryStateArgs = {
  materialLoopId: string;
  manageId: string;
  hotkeyCount: number;
  validGroups: readonly ValidMyzelGroup[];
};

export function useMaterialLoopLibraryState(args: UseMaterialLoopLibraryStateArgs) {
  const { materialLoopId, manageId, hotkeyCount, validGroups } = args;
  const [materialLibraryState, setMaterialLibraryState] = useState(() => getMaterialLibraryState());

  useEffect(() => {
    const unsubscribe = subscribeMaterialLibrary(() => setMaterialLibraryState(getMaterialLibraryState()));
    return () => {
      unsubscribe();
    };
  }, []);

  const allLoopMaterials = useMemo(
    () => materialLibraryState.entries.filter((entry) => entry.role === 'loop'),
    [materialLibraryState.entries],
  );

  const exportedLoopMaterials = useMemo(
    () => allLoopMaterials.filter(isVisibleMaterialLoopBankEntry),
    [allLoopMaterials],
  );

  const recentLoopHotkeyEntries = useMemo(
    () => exportedLoopMaterials.slice(0, hotkeyCount),
    [exportedLoopMaterials, hotkeyCount],
  );

  const selectedLoopMaterial = useMemo(
    () => exportedLoopMaterials.find((entry) => entry.id === materialLoopId) ?? null,
    [exportedLoopMaterials, materialLoopId],
  );

  const managedLoopMaterial = useMemo(
    () => exportedLoopMaterials.find((entry) => entry.id === manageId) ?? null,
    [exportedLoopMaterials, manageId],
  );

  const managedLoopIndex = useMemo(
    () => resolveManagedMaterialLoopIndex(exportedLoopMaterials, manageId),
    [exportedLoopMaterials, manageId],
  );

  const selectedLoopHandoffProfile = useMemo(
    () => buildSelectedLoopHandoffProfile(selectedLoopMaterial),
    [selectedLoopMaterial],
  );

  const effectiveLoopMyzelGroup = useMemo(
    () => resolveEffectiveLoopMyzelGroup(selectedLoopMaterial, selectedLoopHandoffProfile, validGroups),
    [selectedLoopMaterial, selectedLoopHandoffProfile, validGroups],
  );

  return {
    materialLibraryState,
    allLoopMaterials,
    exportedLoopMaterials,
    recentLoopHotkeyEntries,
    selectedLoopMaterial,
    managedLoopMaterial,
    managedLoopIndex,
    selectedLoopHandoffProfile,
    effectiveLoopMyzelGroup,
  } satisfies {
    materialLibraryState: ReturnType<typeof getMaterialLibraryState>;
    allLoopMaterials: MaterialEntry[];
    exportedLoopMaterials: MaterialEntry[];
    recentLoopHotkeyEntries: MaterialEntry[];
    selectedLoopMaterial: MaterialEntry | null;
    managedLoopMaterial: MaterialEntry | null;
    managedLoopIndex: number;
    selectedLoopHandoffProfile: ReturnType<typeof buildSelectedLoopHandoffProfile>;
    effectiveLoopMyzelGroup: MyzelPostFxGroupId | null;
  };
}
