import { ROOT_FOLLOW_VOICE_ENGINE_OPTIONS } from "../rootFollowVoiceEngineOptions";
import type { RootFollowVoiceEngineMode } from "../performanceCrisisTypes";
import type { PerformanceCrisisRootFollowTabProps } from "./PerformanceCrisisRootFollowTabTypes";
export type { PerformanceCrisisRootFollowTabProps } from "./PerformanceCrisisRootFollowTabTypes";
import {
  formatNumber,
} from "../performanceCrisisPanelModel";
import {
  PolicyLineGrid,
  type PolicyLineItem,
  QuantizationControls,
  TruthLine,
} from "./PerformanceCrisisPanelControls";
import {
  formatStableLaneABReportUiValue,
  formatStableLaneClickBurstProxyUiValue,
  formatStableLaneExpressivePressureAddOnUiValue,
  formatStableLaneRootMaterialReliefProofUiValue,
  formatStableLaneSabReadinessDifferentialUiValue,
  formatStableLaneStressHarnessUiValue,
} from "../../diagnostics/stableLaneStressHarness";
import { formatStableLaneLiveDeliveryProofUiValue } from "../../diagnostics/stableLaneLiveDeliveryProof";
import { formatHolisticVoicePoolFallbackUiValue } from "../../audio/holisticVoicePoolFallback";
import { formatHolisticPressureBudgetPolicyUiValue } from "../../audio/holisticPressureBudgetPolicy";
import { formatHolisticCapacityFirstAdmissionGuardUiValue } from "../../audio/holisticCapacityFirstAdmissionGuard";
import { formatWaveStarterVoicePoolLiveReportUiValue } from "../../audio/waveStarterVoicePoolLiveReport";
import { formatWaveStarterWorkletPilotUiValue } from "../../audio/waveStarterWorkletPilotBridge";
import { formatWaveStarterParallelMixAbGuardUiValue } from "../../audio/waveStarterParallelMixAbGuard";
import { formatWaveStarterParallelPilotPressureScenarioUiValue } from "../../audio/waveStarterParallelPilotPressureScenario";
import { formatWaveStarterParallelPilotGainStabilityUiValue } from "../../audio/waveStarterParallelPilotGainStabilityReport";
import { formatWaveStarterVoiceSpecFailoverContractUiValue } from "../../audio/waveStarterVoiceSpecFailoverContract";
import { formatWaveStarterSynthFailoverCandidateUiValue } from "../../audio/waveStarterSynthFailoverCandidate";
import { formatWaveStarterSampleBufferTokenShadowUiValue } from "../../audio/waveStarterSampleBufferTokenShadow";
import { formatWaveStarterSampleFailoverCandidateUiValue } from "../../audio/waveStarterSampleFailoverCandidate";
import { formatWaveStarterSampleFailoverLegacyParityProbeUiValue } from "../../audio/waveStarterSampleFailoverLegacyParityProbe";
import { formatWaveStarterFailoverDecisionGateUiValue } from "../../audio/waveStarterFailoverDecisionGate";
import { formatWaveStarterFailoverStressProbeUiValue } from "../../audio/waveStarterFailoverStressProbe";
import { formatWaveStarterFailoverDefaultPolicyCandidateUiValue } from "../../audio/waveStarterFailoverDefaultPolicyCandidate";
import { formatWaveStarterFailoverLateWindowTuningProbeUiValue } from "../../audio/waveStarterFailoverLateWindowTuningProbe";
import { formatWaveStarterFailoverPolicyShadowAbUiValue } from "../../audio/waveStarterFailoverPolicyShadowAb";
import { formatWaveStarterFailoverPolicyReadinessMatrixUiValue } from "../../audio/waveStarterFailoverPolicyReadinessMatrix";
import { formatWaveStarterFailoverRealTestHarnessHooksUiValue } from "../../audio/waveStarterFailoverRealTestHarnessHooks";
import { formatWaveStarterKeyboardGestureCapacityUiValue } from "../../audio/waveStarterKeyboardGestureCapacity";
import { formatWaveStarterAttackIntegrityCongestionUiValue } from "../../audio/waveStarterAttackIntegrityCongestionBrake";
import { formatWaveStarterWorkletVoicePoolCompactionUiValue } from "../../audio/waveStarterWorkletVoicePoolCompactionReport";
import { formatWaveStarterWorkletProcessorRuntimeOwnershipUiValue } from "../../audio/waveStarterWorkletProcessorRuntimeOwnership";
import { formatWaveStarterFailoverEventLedgerUiValue } from "../../audio/waveStarterFailoverEventLedger";
import { formatWaveStarterSampleFailoverOffsetCropRefineUiValue } from "../../audio/waveStarterSampleFailoverOffsetCropRefine";
import { formatWaveStarterSynthFailoverEnvelopeOvertoneRefineUiValue } from "../../audio/waveStarterSynthFailoverEnvelopeOvertoneRefine";
import { formatParticleVoicePoolLiveReportUiValue } from "../../audio/particleVoicePoolLiveReport";

export function PerformanceCrisisRootFollowTab({
  rootFollowVoiceEngineMode,
  onRootFollowVoiceEngineModeChange,
  selectedPreset,
  rootFollowQuantizationMode,
  rootFollowQuantizationGrid,
  rootFollowQuantizationCustomSegments,
  onRootFollowQuantizationModeChange,
  onRootFollowQuantizationGridChange,
  onRootFollowQuantizationCustomSegmentsChange,
  currentLegacyReliefGate,
  liveSabReadiness,
  audioContextUserGestureProbe,
  syntheticSilentProbe,
  stableLaneStressHarnessReport,
  stableLaneABReport,
  stableLaneLiveDeliveryProofReport,
  holisticVoicePoolFallbackReport,
  waveStarterVoicePoolLiveReport,
  waveStarterWorkletPilotReport,
  waveStarterWorkletVoicePoolCompactionReport,
  waveStarterParallelMixAbGuardReport,
  particleVoicePoolLiveReport,
  stableLaneReadout,
  stableLaneFrameDelta,
  stableLaneFrameAdvanceFresh,
  stableLaneActiveRenderQuantumCount,
  stableLanePlanTransportBackendKind,
  browserResponsibilityReadout,
  sabReadinessReadout,
  stableLaneProofState,
  stableLaneClickBurstProxyReport,
  stableLaneRootMaterialReliefProofReport,
  stableLaneExpressivePressureAddOnReport,
  stableLaneSabReadinessDifferentialReport,
  holisticPressureBudgetPolicy,
  holisticCapacityFirstAdmissionGuard,
  waveStarterWorkletProcessorRuntimeOwnershipReport,
  waveStarterFailoverEventLedgerReport,
  waveStarterSampleFailoverOffsetCropRefineReport,
  waveStarterSynthFailoverEnvelopeOvertoneRefineReport,
  waveStarterParallelPilotPressureScenarioReport,
  waveStarterParallelPilotGainStabilityReport,
  waveStarterVoiceSpecFailoverContractReport,
  waveStarterSynthFailoverCandidateReport,
  waveStarterSampleBufferTokenShadowReport,
  waveStarterSampleFailoverCandidateReport,
  waveStarterSampleFailoverLegacyParityProbeReport,
  waveStarterFailoverDecisionGateReport,
  waveStarterFailoverStressProbeReport,
  waveStarterFailoverLateWindowTuningProbeReport,
  waveStarterFailoverPolicyShadowAbReport,
  waveStarterKeyboardGestureCapacityReport,
  waveStarterAttackIntegrityCongestionReport,
  waveStarterFailoverPolicyReadinessMatrixReport,
  waveStarterFailoverRealTestHarnessHooksReport,
  waveStarterFailoverDefaultPolicyCandidateReport,
  reliefGateNote,
  currentGranularMode,
  currentGranularSettings,
  onApplyGranularRootFollowPreset,
}: PerformanceCrisisRootFollowTabProps) {
  const responsibilityLines: PolicyLineItem[] = [
    { label: "Legacy-Relief Gate", value: currentLegacyReliefGate },
    { label: "Stable Lane", value: stableLaneReadout },
    {
      label: "Frame-Delta",
      value: `${stableLaneFrameDelta} · ${stableLaneFrameAdvanceFresh ? "frisch" : "stale"}`,
    },
    { label: "Lane-Quanten", value: `${stableLaneActiveRenderQuantumCount}` },
    { label: "Plan-Transport", value: browserResponsibilityReadout.planTransport },
    { label: "SAB-Readiness", value: sabReadinessReadout },
    { label: "Boot-Probe", value: stableLaneProofState },
    { label: "Audio-Probe", value: audioContextUserGestureProbe.blockerReason },
    {
      label: "AudioContext",
      value: `${audioContextUserGestureProbe.audioContextState} · ${audioContextUserGestureProbe.userActivationState}`,
    },
    {
      label: "Silent-Plan Probe",
      value: `${syntheticSilentProbe?.status ?? "not-run"} · Δ ${syntheticSilentProbe?.renderedFrameDelta ?? 0} · Q ${syntheticSilentProbe?.laneQuantaDelta ?? 0}${syntheticSilentProbe?.blockerReason ? ` · ${syntheticSilentProbe.blockerReason}` : ""}`,
    },
    {
      label: "Stress-Harness",
      value: formatStableLaneStressHarnessUiValue(stableLaneStressHarnessReport),
    },
    { label: "A/B-Report", value: formatStableLaneABReportUiValue(stableLaneABReport) },
    {
      label: "Click/Burst Proxy",
      value: formatStableLaneClickBurstProxyUiValue(stableLaneClickBurstProxyReport),
    },
    {
      label: "Relief-Proof",
      value: formatStableLaneRootMaterialReliefProofUiValue(stableLaneRootMaterialReliefProofReport),
    },
    {
      label: "Expressive Pressure",
      value: formatStableLaneExpressivePressureAddOnUiValue(stableLaneExpressivePressureAddOnReport),
    },
    {
      label: "SAB-Differenz",
      value: formatStableLaneSabReadinessDifferentialUiValue(stableLaneSabReadinessDifferentialReport),
    },
    {
      label: "Live-Ankunft",
      value: formatStableLaneLiveDeliveryProofUiValue(stableLaneLiveDeliveryProofReport),
    },
    {
      label: "Voice-Pool Gesamt",
      value: formatHolisticVoicePoolFallbackUiValue(holisticVoicePoolFallbackReport),
    },
    {
      label: "Pressure-Policy",
      value: formatHolisticPressureBudgetPolicyUiValue(holisticPressureBudgetPolicy),
    },
    {
      label: "Capacity-Guard",
      value: formatHolisticCapacityFirstAdmissionGuardUiValue(holisticCapacityFirstAdmissionGuard),
    },
    {
      label: "Wellenstarter Pool",
      value: formatWaveStarterVoicePoolLiveReportUiValue(waveStarterVoicePoolLiveReport),
    },
    {
      label: "Wellenstarter Worklet",
      value: formatWaveStarterWorkletPilotUiValue(waveStarterWorkletPilotReport),
    },
    {
      label: "Wellenstarter Worklet-Pool",
      value: formatWaveStarterWorkletVoicePoolCompactionUiValue(waveStarterWorkletVoicePoolCompactionReport),
    },
    {
      label: "Wellenstarter Prozessor-Laufzeit",
      value: formatWaveStarterWorkletProcessorRuntimeOwnershipUiValue(waveStarterWorkletProcessorRuntimeOwnershipReport),
    },
    {
      label: "Wellenstarter Event-Ledger",
      value: formatWaveStarterFailoverEventLedgerUiValue(waveStarterFailoverEventLedgerReport),
    },
    {
      label: "Wellenstarter Sample-Crop",
      value: formatWaveStarterSampleFailoverOffsetCropRefineUiValue(waveStarterSampleFailoverOffsetCropRefineReport),
    },
    {
      label: "Wellenstarter Synth-Hüllkurve",
      value: formatWaveStarterSynthFailoverEnvelopeOvertoneRefineUiValue(waveStarterSynthFailoverEnvelopeOvertoneRefineReport),
    },
    {
      label: "Wellenstarter A/B",
      value: formatWaveStarterParallelMixAbGuardUiValue(waveStarterParallelMixAbGuardReport),
    },
    {
      label: "Wellenstarter Druck",
      value: formatWaveStarterParallelPilotPressureScenarioUiValue(waveStarterParallelPilotPressureScenarioReport),
    },
    {
      label: "Wellenstarter Pilot-Stabilität",
      value: formatWaveStarterParallelPilotGainStabilityUiValue(waveStarterParallelPilotGainStabilityReport),
    },
    {
      label: "Wellenstarter VoiceSpec",
      value: formatWaveStarterVoiceSpecFailoverContractUiValue(waveStarterVoiceSpecFailoverContractReport),
    },
    {
      label: "Wellenstarter Synth-Failover",
      value: formatWaveStarterSynthFailoverCandidateUiValue(waveStarterSynthFailoverCandidateReport),
    },
    {
      label: "Wellenstarter Sample-Token",
      value: formatWaveStarterSampleBufferTokenShadowUiValue(waveStarterSampleBufferTokenShadowReport),
    },
    {
      label: "Wellenstarter Sample-Failover",
      value: formatWaveStarterSampleFailoverCandidateUiValue(waveStarterSampleFailoverCandidateReport),
    },
    {
      label: "Wellenstarter Sample-Parität",
      value: formatWaveStarterSampleFailoverLegacyParityProbeUiValue(waveStarterSampleFailoverLegacyParityProbeReport),
    },
    {
      label: "Wellenstarter Failover-Gate",
      value: formatWaveStarterFailoverDecisionGateUiValue(waveStarterFailoverDecisionGateReport),
    },
    {
      label: "Wellenstarter Stress-Probe",
      value: formatWaveStarterFailoverStressProbeUiValue(waveStarterFailoverStressProbeReport),
    },
    {
      label: "Wellenstarter Late-Window",
      value: formatWaveStarterFailoverLateWindowTuningProbeUiValue(waveStarterFailoverLateWindowTuningProbeReport),
    },
    {
      label: "Wellenstarter Shadow-A/B",
      value: formatWaveStarterFailoverPolicyShadowAbUiValue(waveStarterFailoverPolicyShadowAbReport),
    },
    {
      label: "Wellenstarter Keyboard-Kapazität",
      value: formatWaveStarterKeyboardGestureCapacityUiValue(waveStarterKeyboardGestureCapacityReport),
    },
    {
      label: "Wellenstarter Stau-Bremse",
      value: formatWaveStarterAttackIntegrityCongestionUiValue(waveStarterAttackIntegrityCongestionReport),
    },
    {
      label: "Wellenstarter Readiness",
      value: formatWaveStarterFailoverPolicyReadinessMatrixUiValue(waveStarterFailoverPolicyReadinessMatrixReport),
    },
    {
      label: "Wellenstarter Test-Hooks",
      value: formatWaveStarterFailoverRealTestHarnessHooksUiValue(waveStarterFailoverRealTestHarnessHooksReport),
    },
    {
      label: "Wellenstarter Default-Kandidat",
      value: formatWaveStarterFailoverDefaultPolicyCandidateUiValue(waveStarterFailoverDefaultPolicyCandidateReport),
    },
    {
      label: "Partikel Pool",
      value: formatParticleVoicePoolLiveReportUiValue(particleVoicePoolLiveReport),
    },
    { label: "Relief Events", value: browserResponsibilityReadout.reliefEvents },
    { label: "Blend L/S", value: browserResponsibilityReadout.blend },
  ];

  const granularStateLines: PolicyLineItem[] = [
    { label: "aktueller Modus", value: currentGranularMode },
    { label: "aktuelles Fenster", value: `${formatNumber(currentGranularSettings.windowMs)} ms` },
    { label: "aktueller Schritt", value: `${formatNumber(currentGranularSettings.stepMs)} ms` },
    { label: "aktuelle max Grains", value: currentGranularSettings.maxGrainsPerWindow },
    {
      label: "Wirksam: Druckreduktion",
      value: `${formatNumber(selectedPreset.granularRootFollow.densityReductionUnderLoad * 100)} %`,
    },
    { label: "Wirksam: Late-Grain", value: selectedPreset.granularRootFollow.lateGrainStrategy },
    { label: "Wirksam: Stale-Fenster", value: `${selectedPreset.granularRootFollow.staleWindowMs} ms` },
    { label: "Wirksam: letzten Pitch halten", value: selectedPreset.granularRootFollow.preserveLastValidPitch },
    { label: "Wirksam: Transport schützen", value: selectedPreset.granularRootFollow.preserveTransportContinuity },
    { label: "Wirksam: Catch-up-Gewitter", value: selectedPreset.granularRootFollow.preventCatchUpStorm },
  ];

  return (
    <div
      className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3"
      data-granular-root-follow-single-source="root-follow-granular-manager"
    >
      <div className="rounded-lg border border-violet-900/40 bg-black/25 p-3 text-[11px] text-neutral-400">
        Granular/Root-Follow wird hier nur gespiegelt und als
        Krisenprojektion beschrieben. Die editierbare Grain-Quelle
        bleibt der Granular Manager im Root-Follow-Menü; dadurch gibt es
        keine zweite Granular-Struktur.
      </div>
      <div className="mt-3">
        <QuantizationControls
          title="Root Follow Loop Quantisierung"
          mode={rootFollowQuantizationMode}
          grid={rootFollowQuantizationGrid}
          customSegments={rootFollowQuantizationCustomSegments}
          onModeChange={onRootFollowQuantizationModeChange}
          onGridChange={onRootFollowQuantizationGridChange}
          onCustomSegmentsChange={
            onRootFollowQuantizationCustomSegmentsChange
          }
        />
      </div>
      <div
        className="mt-3 rounded-lg border border-sky-500/20 bg-sky-950/10 p-3 text-[11px] leading-relaxed text-sky-100/75"
        data-root-follow-quantization-fallback-note="continue-last-valid"
      >
        Root Follow darf bei Überlast auf dem letzten gültigen
        Cursor-/Pitch-Stand weiterloopen und erst an gewählten
        Rasterpunkten wieder zum Cursor aufschließen. Aus = freie
        Live-Aktualität, strikt = immer quantisiert, als Fallback =
        normal frei, unter Druck quantisiert halten.
      </div>
      <div
        className="mt-3 rounded-lg border border-fuchsia-500/20 bg-fuchsia-950/10 p-3"
        data-root-follow-voice-engine-mode="main-thread-pool-optional"
      >
        <div className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-100/75">
          Root-Follow Voice Engine
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,220px)_1fr] md:items-center">
          <select
            value={rootFollowVoiceEngineMode}
            onChange={(event) =>
              onRootFollowVoiceEngineModeChange(
                event.target.value as RootFollowVoiceEngineMode,
              )
            }
            className="rounded-lg border border-fuchsia-300/25 bg-black/50 px-3 py-2 text-xs text-fuchsia-50"
            aria-label="Root-Follow Voice Engine wählen"
          >
            {ROOT_FOLLOW_VOICE_ENGINE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="text-[11px] leading-relaxed text-fuchsia-100/70">
            {ROOT_FOLLOW_VOICE_ENGINE_OPTIONS.find(
              (option) => option.id === rootFollowVoiceEngineMode,
            )?.note ?? "hörbarer Referenzpfad bleibt verfügbar"}
            . Direct/Synth bleibt begrenzt. Worklet Shadow ist stumm und
            ersetzt keinen hörbaren Pfad; Worklet Direct-Pilot ist ein
            kleiner hörbarer Pilot mit Legacy-Fallback. Worklet
            Granular-Plan/Buffer Shadow bleiben stumm. Worklet
            Granular-Pilot spielt nur einen kleinen additiven
            Sample-Elastic-Körper aus bounded Bufferfenstern; der
            Legacy-Materialpfad bleibt Referenz/Fallback. Worklet
            Stable-Lane Primary Test ist ein enger Crackle-Vergleich: nach
            frischem Buffer/Plan-Proof darf die Stable-Lane Legacy-Fenster
            früh stummschalten; sonst bleibt Legacy sofort Fallback. Worklet
            Granular-Primary Kandidat darf Legacy-Fenster nur dann stumm
            lassen, wenn die letzte Pilot-Health ready meldet; sonst
            bleibt Legacy sofort Fallback. Pilot-Health zählt Acks,
            akzeptierte Fenster und Buffer-Verfügbarkeit; ohne
            akzeptierte Fenster gilt der Worklet-Pilot als starved,
            nicht als wirksam überlegen.
          </div>
        </div>
        <div
          className="mt-3 rounded-lg border border-fuchsia-300/15 bg-black/25 p-3"
          data-root-follow-legacy-relief-gate-readout={
            currentLegacyReliefGate
          }
          data-root-follow-live-sab-readiness={
            liveSabReadiness?.stableLaneSabTransportReadiness ??
            "runtime-probe-pending"
          }
          data-root-follow-browser-responsibility-readout="true"
          data-root-follow-browser-responsibility-voice-engine={
            rootFollowVoiceEngineMode
          }
          data-root-follow-browser-responsibility-plan-transport={
            stableLanePlanTransportBackendKind
          }
          data-root-follow-audio-context-user-gesture-probe={
            audioContextUserGestureProbe.blockerReason
          }
          data-root-follow-synthetic-silent-plan-probe={
            syntheticSilentProbe?.status ?? "not-run"
          }
          data-root-follow-stable-lane-stress-harness={
            stableLaneStressHarnessReport.readiness
          }
          data-root-follow-stable-lane-ab-report={
            stableLaneABReport.decision
          }
          data-root-follow-live-delivery-proof={
            stableLaneLiveDeliveryProofReport.decision
          }
          data-holistic-voice-pool-fallback={
            holisticVoicePoolFallbackReport.readiness
          }
          data-wave-starter-voice-pool-live={
            waveStarterVoicePoolLiveReport?.decision ??
            "no-runtime-report"
          }
          data-wave-starter-worklet-pilot={
            waveStarterWorkletPilotReport?.decision ?? "not-requested"
          }
          data-wave-starter-worklet-voice-pool-compaction={
            waveStarterWorkletVoicePoolCompactionReport.decision
          }
          data-wave-starter-parallel-mix-ab-guard={
            waveStarterParallelMixAbGuardReport.decision
          }
          data-particle-voice-pool-live={
            particleVoicePoolLiveReport?.decision ?? "no-runtime-report"
          }
        >
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-fuchsia-100/60">
            aktuelle Verantwortungsschicht
          </div>
          <PolicyLineGrid
            className="grid gap-2 md:grid-cols-6"
            lines={responsibilityLines}
          />
          <div className="mt-2 text-[11px] leading-relaxed text-fuchsia-100/65">
            {reliefGateNote}
          </div>
        </div>
      </div>
      <div
        className="mt-3 grid gap-2 md:grid-cols-3"
        data-crisis-truth-audit="root-follow"
      >
        <TruthLine status="wirksam" title="Quantisierung / Halten">
          Der neue Root-Follow-Fallback ist an die
          Scheduler-Pitch-Lesung angebunden: unter Druck kann der letzte
          gültige Pitch gehalten und erst am gewählten Rasterpunkt
          aktualisiert werden.
        </TruthLine>
        <TruthLine status="projektion" title="Grainwerte">
          Fenster, Schritt und maximale Grains sind nur dann aus dieser
          Stilvorlage wirksam, wenn du sie mit „Grainwerte einmalig
          übernehmen“ in den Granular Manager projizierst.
        </TruthLine>
        <TruthLine status="wirksam" title="Renderer-Druckpfad">
          Druckreduktion, Late-Grain, Stale-Fenster und
          Catch-up-Gewitter werden jetzt von Material- und
          Synth-Root-Follow-Renderern gelesen: Dichte wird weich
          skaliert, verspätete Fenster werden je nach Stil kurz
          nachgeholt, verschmiert, gesprungen oder stale verworfen.
        </TruthLine>
      </div>
      <PolicyLineGrid
        className="mt-3 grid gap-3 md:grid-cols-4"
        lines={granularStateLines}
      />
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-[11px] text-neutral-500">
          Optional: Die Stilvorlage kann einmalig in den bestehenden
          Granular Manager projiziert werden. Danach bleiben
          Root-Follow-Menü und dieses Fenster weiterhin ein gemeinsamer
          Zustand.
        </div>
        <button
          type="button"
          onClick={onApplyGranularRootFollowPreset}
          className="rounded-lg border border-violet-400/60 bg-violet-500/15 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/25"
        >
          Grainwerte einmalig übernehmen
        </button>
      </div>
    </div>
  );
}
