import { useEffect, useState } from "react";
import {
  readParticleVoicePoolLiveReportFromBrowser,
  type ParticleVoicePoolLiveReport,
} from "../audio/particleVoicePoolLiveReport";
import {
  readWaveStarterFailoverDecisionGateFromBrowser,
  type WaveStarterFailoverDecisionGateReport,
} from "../audio/waveStarterFailoverDecisionGate";
import {
  readWaveStarterSampleBufferTokenShadowReportFromBrowser,
  type WaveStarterSampleBufferTokenShadowReport,
} from "../audio/waveStarterSampleBufferTokenShadow";
import {
  readWaveStarterSampleFailoverCandidateReportFromBrowser,
  type WaveStarterSampleFailoverCandidateReport,
} from "../audio/waveStarterSampleFailoverCandidate";
import {
  readWaveStarterSynthFailoverCandidateReportFromBrowser,
  type WaveStarterSynthFailoverCandidateReport,
} from "../audio/waveStarterSynthFailoverCandidate";
import {
  readWaveStarterVoicePoolLiveReportFromBrowser,
  type WaveStarterVoicePoolLiveReport,
} from "../audio/waveStarterVoicePoolLiveReport";
import {
  readWaveStarterVoiceSpecFailoverContractFromBrowser,
  type WaveStarterVoiceSpecFailoverContractReport,
} from "../audio/waveStarterVoiceSpecFailoverContract";
import {
  readWaveStarterWorkletPilotReportFromBrowser,
  type WaveStarterWorkletPilotSnapshot,
} from "../audio/waveStarterWorkletPilotBridge";
import {
  readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser,
  type WaveStarterWorkletProcessorRuntimeOwnershipReport,
} from "../audio/waveStarterWorkletProcessorRuntimeOwnership";

const PERFORMANCE_CRISIS_BROWSER_REPORT_INTERVAL_MS = 800;

export type PerformanceCrisisBrowserReports = {
  waveStarterVoicePoolLiveReport: WaveStarterVoicePoolLiveReport | null;
  particleVoicePoolLiveReport: ParticleVoicePoolLiveReport | null;
  waveStarterWorkletPilotReport: WaveStarterWorkletPilotSnapshot | null;
  waveStarterWorkletProcessorRuntimeOwnershipReport: WaveStarterWorkletProcessorRuntimeOwnershipReport | null;
  waveStarterVoiceSpecFailoverContractReport: WaveStarterVoiceSpecFailoverContractReport | null;
  waveStarterSynthFailoverCandidateBaseReport: WaveStarterSynthFailoverCandidateReport | null;
  waveStarterSampleBufferTokenShadowBaseReport: WaveStarterSampleBufferTokenShadowReport | null;
  waveStarterSampleFailoverCandidateBaseReport: WaveStarterSampleFailoverCandidateReport | null;
  waveStarterFailoverDecisionGateReport: WaveStarterFailoverDecisionGateReport | null;
};

function readPerformanceCrisisBrowserReports(): PerformanceCrisisBrowserReports {
  return {
    waveStarterVoicePoolLiveReport:
      readWaveStarterVoicePoolLiveReportFromBrowser(),
    particleVoicePoolLiveReport: readParticleVoicePoolLiveReportFromBrowser(),
    waveStarterWorkletPilotReport: readWaveStarterWorkletPilotReportFromBrowser(),
    waveStarterWorkletProcessorRuntimeOwnershipReport:
      readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser(),
    waveStarterVoiceSpecFailoverContractReport:
      readWaveStarterVoiceSpecFailoverContractFromBrowser(),
    waveStarterSynthFailoverCandidateBaseReport:
      readWaveStarterSynthFailoverCandidateReportFromBrowser(),
    waveStarterSampleBufferTokenShadowBaseReport:
      readWaveStarterSampleBufferTokenShadowReportFromBrowser(),
    waveStarterSampleFailoverCandidateBaseReport:
      readWaveStarterSampleFailoverCandidateReportFromBrowser(),
    waveStarterFailoverDecisionGateReport:
      readWaveStarterFailoverDecisionGateFromBrowser(),
  };
}

export function usePerformanceCrisisBrowserReports() {
  const [reports, setReports] = useState<PerformanceCrisisBrowserReports>(() =>
    readPerformanceCrisisBrowserReports(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;
    const refresh = () => {
      if (!cancelled && !document.hidden) setReports(readPerformanceCrisisBrowserReports());
    };
    refresh();
    const intervalId = window.setInterval(
      refresh,
      PERFORMANCE_CRISIS_BROWSER_REPORT_INTERVAL_MS,
    );
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return reports;
}
