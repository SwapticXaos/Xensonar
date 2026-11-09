import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_OVERTONE_BY_PRESET,
  cloneOvertoneMixByPreset,
} from "../domain/instrumentData";
import { ROOT_FOLLOW_LOOP_UI_STORAGE_KEY, readRootFollowLoopUiPatchFromStorage, writeRootFollowLoopUiStateToStorage } from "../rootFollow/rootFollowLoopUiStorage";
import { setResonanceViewportBaseHz } from "./resonanceRuntimeMath";
import {
  PARTICLE_SAMPLE_PROFILE_STORAGE_KEY,
  createInitialNexusParams,
  mergeNexusUiPatch,
  type NexusUiPatch,
} from "./nexusParamsInitialState";

export const useAppNexusParamsState = () => {
  const initialOvertonesByPreset = useRef(cloneOvertoneMixByPreset(DEFAULT_OVERTONE_BY_PRESET));
  const nexusParamsRef = useRef(createInitialNexusParams(initialOvertonesByPreset.current));
  const [nParamsUI, setNParamsUI] = useState(nexusParamsRef.current);

  useEffect(() => {
    setResonanceViewportBaseHz(nParamsUI.gridBase);
  }, [nParamsUI.gridBase]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PARTICLE_SAMPLE_PROFILE_STORAGE_KEY, nParamsUI.particleSampleProfileMode ?? 'current_db_v2');
    } catch {}
  }, [nParamsUI.particleSampleProfileMode]);

  useEffect(() => {
    const patch = readRootFollowLoopUiPatchFromStorage();
    if (Object.keys(patch).length === 0) return;
    Object.assign(nexusParamsRef.current, patch);
    setNParamsUI({ ...nexusParamsRef.current });
  }, []);

  useEffect(() => {
    writeRootFollowLoopUiStateToStorage(nParamsUI);
  }, [
    nParamsUI.rootFollowLoopActive,
    nParamsUI.rootFollowLoopId,
    nParamsUI.rootFollowLoopTimeMode,
    nParamsUI.rootFollowLoopVolume,
    nParamsUI.rootFollowLoopGranulationMode,
    nParamsUI.rootFollowGranularSettings,
    nParamsUI.rootFollowImpulsRasterEvery,
    nParamsUI.rootFollowImpulsRasterCycleDiv,
    nParamsUI.rootFollowImpulsRasterClockMode,
    nParamsUI.rootFollowImpulsRasterPattern,
  ]);

  const updateNParams = useCallback((partial: NexusUiPatch) => {
    Object.assign(nexusParamsRef.current, mergeNexusUiPatch(nexusParamsRef.current, partial));
    setNParamsUI({ ...nexusParamsRef.current });
  }, []);

  return {
    initialOvertonesByPreset,
    nexusParamsRef,
    nParamsUI,
    updateNParams,
    rootFollowUiStorageKey: ROOT_FOLLOW_LOOP_UI_STORAGE_KEY,
  };
};
