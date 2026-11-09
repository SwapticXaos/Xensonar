import { useState } from "react";
import type { PerformanceCrisisPanelProps } from "../performanceCrisisPanelProps";
import { PresetSelect } from "./PerformanceCrisisPanelControls";
import { TAB_LABELS, type PerformanceCrisisTab } from "../performanceCrisisPanelModel";
import { usePerformanceCrisisStableLaneDiagnostics } from "../usePerformanceCrisisStableLaneDiagnostics";
import {
  PerformanceCrisisParticleTab,
  PerformanceCrisisWaveStarterTab,
  type PerformanceCrisisParticleTabProps,
  type PerformanceCrisisWaveStarterTabProps,
} from "./PerformanceCrisisParticleWaveTabs";
import {
  PerformanceCrisisRootFollowTab,
  type PerformanceCrisisRootFollowTabProps,
} from "./PerformanceCrisisRootFollowTab";

export function PerformanceCrisisManagementPanel({
  activePresetId,
  particlePresetId,
  waveStarterPresetId,
  particleCrisisMode,
  particleAmbientMotionMode,
  particleLoadReductionMode,
  rootFollowQuantizationMode,
  rootFollowQuantizationGrid,
  rootFollowQuantizationCustomSegments,
  rootFollowVoiceEngineMode,
  particleQuantizationMode,
  particleQuantizationGrid,
  presetIds,
  selectedPreset,
  selectedParticlePreset,
  selectedWaveStarterPreset,
  currentGranularMode,
  currentGranularSettings,
  audioBurstRecorder,
  onPresetChange,
  onParticlePresetChange,
  onWaveStarterPresetChange,
  onParticleCrisisModeChange,
  onParticleAmbientMotionModeChange,
  onParticleLoadReductionModeChange,
  onRootFollowQuantizationModeChange,
  onRootFollowQuantizationGridChange,
  onRootFollowQuantizationCustomSegmentsChange,
  onRootFollowVoiceEngineModeChange,
  onParticleQuantizationModeChange,
  onApplyGranularRootFollowPreset,
}: PerformanceCrisisPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<PerformanceCrisisTab>("granular");
  const {
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
    waveTraffic,
    recentWaveTraffic,
  } = usePerformanceCrisisStableLaneDiagnostics({
    rootFollowVoiceEngineMode,
    audioBurstRecorder,
  });

  const rootFollowTabProps = {
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
  } satisfies PerformanceCrisisRootFollowTabProps;

  const particleTabProps = {
    particlePresetId,
    presetIds,
    selectedParticlePreset,
    particleCrisisMode,
    particleAmbientMotionMode,
    particleLoadReductionMode,
    particleQuantizationMode,
    particleQuantizationGrid,
    onParticlePresetChange,
    onParticleCrisisModeChange,
    onParticleAmbientMotionModeChange,
    onParticleLoadReductionModeChange,
    onParticleQuantizationModeChange,
  } satisfies PerformanceCrisisParticleTabProps;

  const waveStarterTabProps = {
    waveStarterPresetId,
    presetIds,
    selectedWaveStarterPreset,
    waveTraffic,
    recentWaveTraffic,
    onWaveStarterPresetChange,
  } satisfies PerformanceCrisisWaveStarterTabProps;

  return (
    <section
      className="mt-4 rounded-2xl border border-violet-900/60 bg-violet-950/10 p-4 text-sm text-neutral-400"
      data-performance-crisis-management="soft-style-template"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-violet-200">
            Performance &amp; Krisenmanagement
          </h3>
          <div className="mt-2 text-[11px] text-neutral-500">
            Stilvorlage{" "}
            <span className="text-neutral-200">{selectedPreset.label}</span> ·
            Herkunft{" "}
            <span className="text-neutral-300">{selectedPreset.lineage}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PresetSelect
            value={activePresetId}
            presetIds={presetIds}
            label="Performance-Stilvorlage wählen"
            onChange={onPresetChange}
          />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs uppercase tracking-widest text-white hover:bg-white/10"
          >
            {expanded ? "Management einklappen" : "Management anzeigen"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div
            className="rounded-xl border border-neutral-800 bg-black/30 p-3 text-[12px] text-neutral-300"
            data-performance-crisis-soft-style-note="true"
          >
            <div>{selectedPreset.summary}</div>
            <div className="mt-2 text-[11px] text-neutral-500">
              Die Stilvorlage ist kein harter Gesamtschalter: Partikel und
              Wellenstarter können unten eigene Stilquellen behalten.
              Granular/Root-Follow nutzt weiterhin den vorhandenen Granular
              Manager als einzige Datenquelle.
            </div>
            <div
              className="mt-2 text-[11px] leading-relaxed text-neutral-400"
              data-performance-crisis-agency-note="recording-burst-agency"
            >
              Agency-Hinweis: Dieses Feld entscheidet nicht heimlich, welche
              musikalische Qualität geopfert wird. Du wählst, ob unter Druck
              eher Rastertreue, Attack, Dichte, Direktheit oder Stabilität
              wichtiger ist. Erfahrungswert aus den bisherigen Tests: hörbare
              Live-Bursts landen in Xensonar-Aufnahmen meist nicht in der
              Aufnahme, weil sie vorher abgefangen werden. Für Aufnahme- oder
              Klangforschungs-Situationen kann deshalb ein offenerer Stil
              sinnvoll sein; für Live-Spiel bleibt ein Schutzstil nützlich.
            </div>
            <div
              className="mt-2 text-[11px] leading-relaxed text-neutral-400"
              data-performance-crisis-wave-starter-load-note="smooth-before-thin"
            >
              Wellenstarter-Hinweis: Nach aktuellem Codebild ist Wellenstarter
              normalerweise nicht der große Dauer-Eventstrom. Ein Impuls kann
              zwar Body-Exciter, Gradient-Töne, optionale Obertöne und einen
              kurzen Arp auslösen, bleibt aber als jüngster Intent begrenzt. Im
              Vergleich zu Root-Follow-Fenstern mit mehreren Direct Events oder
              Granular-Grains sollte Wellenstarter deshalb nicht zu früh
              restriktiv gesenkt werden; zuerst sind kurze
              Millisekunden-Glättung und bounded defer musikalisch plausibler
              als hartes Wegschneiden.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(TAB_LABELS) as PerformanceCrisisTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-2 text-[11px] uppercase tracking-widest ${activeTab === tab ? "border border-violet-300 bg-violet-200 text-black" : "border border-neutral-800 bg-black/30 text-neutral-300 hover:bg-white/5"}`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {activeTab === "granular" && (
            <PerformanceCrisisRootFollowTab {...rootFollowTabProps} />
          )}

          {activeTab === "particles" && (
            <PerformanceCrisisParticleTab {...particleTabProps} />
          )}

          {activeTab === "wave" && (
            <PerformanceCrisisWaveStarterTab {...waveStarterTabProps} />
          )}

          <div
            className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 text-[11px] text-neutral-500"
            data-performance-crisis-diagnostics-delegation="burst-panel"
          >
            <div className="font-semibold uppercase tracking-[0.2em] text-neutral-300">
              Verbundene Diagnosefenster
            </div>
            <div className="mt-2">
              Burst-Diagnose und Browser ↔ App PaarTherapeut bleiben im
              bestehenden Diagnosefenster direkt darunter. Dieses
              Management-Feld sammelt Performance-Stile und Policies; Recorder,
              Marker, Export und Paartherapie-Aktionen werden nicht ein zweites
              Mal nachgebaut.
            </div>
            <div className="mt-2 text-neutral-400">
              Aktiver Diagnose-Stil:{" "}
              <span className="text-neutral-200">
                {selectedPreset.diagnostics.burstRecorderSensitivity}
              </span>{" "}
              · Rejected-Events sichtbar:{" "}
              <span className="text-neutral-200">
                {selectedPreset.diagnostics.exposeRejectedEvents
                  ? "ja"
                  : "nein"}
              </span>{" "}
              · PaarTherapeut angebunden:{" "}
              <span className="text-neutral-200">
                {selectedPreset.diagnostics.exposeBrowserAppTherapist
                  ? "ja"
                  : "nein"}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
