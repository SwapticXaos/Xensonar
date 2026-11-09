/**
 * Types for PerformanceCrisisRootFollowTab.
 *
 * Props are composed from two sources:
 *
 * 1. Policy/mode/callback props — derived via Pick from PerformanceCrisisPanelProps,
 *    which already carries all correct types for the live controls.
 *
 * 2. Diagnostic props — derived via ReturnType from
 *    usePerformanceCrisisStableLaneDiagnostics, minus the wave-traffic fields
 *    that belong to the WaveStarter tab.
 *
 * This derivation strategy means:
 * - No manual re-statement of 40+ report types.
 * - New probes added to the hook automatically appear in the tab's contract.
 * - The boundary between policy controls and diagnostic surface stays explicit.
 *
 * No runtime code lives here. No audio, Worklet, or Root-Follow renderer changes.
 */

import type { usePerformanceCrisisStableLaneDiagnostics } from "../usePerformanceCrisisStableLaneDiagnostics";
import type { PerformanceCrisisPanelProps } from "../performanceCrisisPanelProps";

export type PerformanceCrisisRootFollowTabPolicyProps = Pick<
  PerformanceCrisisPanelProps,
  | "rootFollowVoiceEngineMode"
  | "onRootFollowVoiceEngineModeChange"
  | "selectedPreset"
  | "rootFollowQuantizationMode"
  | "rootFollowQuantizationGrid"
  | "rootFollowQuantizationCustomSegments"
  | "onRootFollowQuantizationModeChange"
  | "onRootFollowQuantizationGridChange"
  | "onRootFollowQuantizationCustomSegmentsChange"
  | "currentGranularMode"
  | "currentGranularSettings"
  | "onApplyGranularRootFollowPreset"
>;

type DiagnosticsHookResult = ReturnType<
  typeof usePerformanceCrisisStableLaneDiagnostics
>;

export type PerformanceCrisisRootFollowTabDiagnosticsProps = Omit<
  DiagnosticsHookResult,
  "waveTraffic" | "recentWaveTraffic"
>;

export type PerformanceCrisisRootFollowTabProps =
  PerformanceCrisisRootFollowTabPolicyProps &
    PerformanceCrisisRootFollowTabDiagnosticsProps;
