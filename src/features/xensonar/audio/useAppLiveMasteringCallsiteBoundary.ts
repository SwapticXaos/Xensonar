import { useLiveMasterBusRuntimeRefs } from "./useLiveMasterBusRuntimeRefs";
import { useLiveMasteringUiState } from "./useLiveMasteringUiState";

export type AppLiveMasteringCallsiteBoundaryContract = ReturnType<
  typeof useLiveMasterBusRuntimeRefs
> &
  ReturnType<typeof useLiveMasteringUiState>;

export const APP_LIVE_MASTERING_CALLSITE_BOUNDARY_CONTRACT = {
  patch: "3.2.91.6.9.131_app_live_mastering_callsite_boundary",
  scope: "callsite-cleanup-only",
  appOwnsInvocation: true,
  preservesHookOrder: [
    "useLiveMasterBusRuntimeRefs",
    "useLiveMasteringUiState",
  ] as const,
  wrapsPerformanceCrisisPolicyHook: false,
  runtimeOwned: false,
  audioMutating: false,
  audioNodeConstructing: false,
  packagePersistenceOwned: false,
  visibleUiChangedByBoundary: false,
} as const;

export function useAppLiveMasteringCallsiteBoundary(): AppLiveMasteringCallsiteBoundaryContract {
  const liveMasterBusRuntimeRefs = useLiveMasterBusRuntimeRefs();
  const liveMasteringUiState = useLiveMasteringUiState();

  return {
    ...liveMasterBusRuntimeRefs,
    ...liveMasteringUiState,
  };
}
