import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  setNodalDeviceTarget,
  updateNodalDeviceEntry,
  type NodalDeviceId,
  type NodalDeviceMatrix,
  type NodalTargetId,
} from "@/features/resonance/nodalDeviceMatrix";
import {
  useRoom3InstallationAndBodyStateBridges,
  type Room3InstallationAndBodyStateBridgeArgs,
} from "./useRoom3InstallationAndBodyStateBridges";
import { useRoom3MyzelStateMirrors, type Room3MyzelStateMirrorArgs } from "./useRoom3MyzelStateMirrors";
import {
  useRoom3NodalDeviceStateMirror,
  type Room3NodalDeviceStateMirrorArgs,
} from "./useRoom3NodalDeviceStateMirror";

export type Room3StateMirrorEffectsArgs =
  & Room3InstallationAndBodyStateBridgeArgs
  & Room3MyzelStateMirrorArgs
  & Room3NodalDeviceStateMirrorArgs;

export const useRoom3StateMirrorEffects = (args: Room3StateMirrorEffectsArgs) => {
  useRoom3InstallationAndBodyStateBridges(args);
  useRoom3MyzelStateMirrors(args);
  useRoom3NodalDeviceStateMirror(args);
};

export const useNodalDeviceMatrixActions = (
  setNodalDeviceMatrix: Dispatch<SetStateAction<NodalDeviceMatrix>>,
) => {
  const handleNodalDeviceEnabledChange = useCallback((device: NodalDeviceId, enabled: boolean) => {
    setNodalDeviceMatrix((prev) => updateNodalDeviceEntry(prev, device, { enabled }));
  }, [setNodalDeviceMatrix]);

  const handleNodalDeviceAmountChange = useCallback((device: NodalDeviceId, value: number) => {
    setNodalDeviceMatrix((prev) => updateNodalDeviceEntry(prev, device, { amount: value }));
  }, [setNodalDeviceMatrix]);

  const handleNodalDeviceTargetChange = useCallback((device: NodalDeviceId, target: NodalTargetId, value: number) => {
    setNodalDeviceMatrix((prev) => setNodalDeviceTarget(prev, device, target, value));
  }, [setNodalDeviceMatrix]);

  return {
    handleNodalDeviceEnabledChange,
    handleNodalDeviceAmountChange,
    handleNodalDeviceTargetChange,
  };
};
