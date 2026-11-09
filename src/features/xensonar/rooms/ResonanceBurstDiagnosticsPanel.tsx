import { useState } from 'react';
import { XENSONAR_BURST_STRESS_SCENARIOS, resolveBurstStressScenario, type XensonarBurstStressScenarioId } from '../diagnostics/burstStressScenarioContracts';
import type { WorkspacePackageActivationReport } from '../material/workspacePackageActivationReportTypes';

type RootFollowHealth = {
  audioContextState: string;
  selectedLoopName: string | null;
  selectedLoopId: string | null;
  rootFollowLoopActive: boolean;
  rootFollowEntries: number;
  packagePreferredEntries: number;
  materialLoopEntries: number;
  runtimeNodes: number;
  synthVoices: number;
  cacheSize: number;
  timerActive: boolean;
  gainConnected: boolean;
  browserState: string;
  rootFollowPreviewActive: boolean;
  rootFollowPlayfieldInside: boolean;
  effectivePlaybackGate: boolean;
  selectedEntryExists: boolean;
  lastPlaybackStage: string | null;
  lastStopReason: string | null;
  latestColdStartRisk: boolean;
  latestColdStartLeadMs: number | null;
};

type ResonanceBurstDiagnosticsPanelProps = {
  audioTapMonitor: any;
  audioBurstRecorder: any;
  audioPairTherapistStatus: string;
  rootFollowHealth: RootFollowHealth;
  workspacePackageActivationReport: WorkspacePackageActivationReport;
  activeStressScenarioId: XensonarBurstStressScenarioId;
  onChangeStressScenarioId: (id: XensonarBurstStressScenarioId) => void;
  onStartAudioBurstRecorder: () => void;
  onStopAudioBurstRecorder: () => void;
  onClearAudioBurstRecorder: () => void;
  onExportAudioBurstRecorder: () => void;
  onRunAudioPairTherapistReset: () => void;
  onClearRootFollowBrowserState: () => void;
  onReactivateRootFollowFromPackage: () => void;
};

export function ResonanceBurstDiagnosticsPanel({
  audioTapMonitor,
  audioBurstRecorder,
  audioPairTherapistStatus,
  rootFollowHealth,
  workspacePackageActivationReport,
  activeStressScenarioId,
  onChangeStressScenarioId,
  onStartAudioBurstRecorder,
  onStopAudioBurstRecorder,
  onClearAudioBurstRecorder,
  onExportAudioBurstRecorder,
  onRunAudioPairTherapistReset,
  onClearRootFollowBrowserState,
  onReactivateRootFollowFromPackage,
}: ResonanceBurstDiagnosticsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [therapistExpanded, setTherapistExpanded] = useState(false);
  const activeScenario = resolveBurstStressScenario(activeStressScenarioId);
  const latestAudioTraffic = [...(audioBurstRecorder?.entries ?? [])].reverse().find((entry: any) => entry?.audioTraffic)?.audioTraffic ?? null;
  const rootFollowTraffic = latestAudioTraffic?.rootFollow ?? null;
  const recentRootFollowTraffic = latestAudioTraffic?.recent?.rootFollow ?? null;
  const waveOvertoneArpTraffic = latestAudioTraffic?.waveOvertoneArp ?? null;
  const recentWaveOvertoneArpTraffic = latestAudioTraffic?.recent?.waveOvertoneArp ?? null;
  const recordingRuntime = latestAudioTraffic?.recordingRuntime ?? null;
  const quantizedTrafficRuntime = latestAudioTraffic?.quantizedTrafficRuntime ?? null;
  const materialTrackRuntime = latestAudioTraffic?.materialTrackRuntime ?? null;
  const rootFollowLifecycle = latestAudioTraffic?.rootFollowLifecycle ?? null;
  const spectralForgeRuntime = latestAudioTraffic?.spectralForgeRuntime ?? null;
  const burstWindows = latestAudioTraffic?.burstWindows ?? null;
  const stressComparison = latestAudioTraffic?.stressComparison ?? null;
  const burst16 = Array.isArray(burstWindows?.windows)
    ? burstWindows.windows.find((entry: any) => entry?.windowMs === 16)
    : null;
  const burst50 = Array.isArray(burstWindows?.windows)
    ? burstWindows.windows.find((entry: any) => entry?.windowMs === 50)
    : null;
  const burst100 = Array.isArray(burstWindows?.windows)
    ? burstWindows.windows.find((entry: any) => entry?.windowMs === 100)
    : null;

  return (
    <div className="mt-4 bg-black p-4 border border-neutral-800 text-neutral-400 text-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xs text-pink-400 uppercase tracking-widest font-bold border-b border-neutral-800 pb-1">Burst-Diagnose</h3>
          <div className="mt-2 text-[11px] text-neutral-500">
            Aktiv im Hintergrund: Recorder <span className="text-neutral-300">{audioBurstRecorder?.isRecording ? 'läuft' : 'bereit'}</span> · Einträge <span className="text-neutral-300">{audioBurstRecorder?.entries?.length ?? 0}</span> · Marker <span className="text-neutral-300">{audioBurstRecorder?.markerCount ?? 0}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs uppercase tracking-widest text-white hover:bg-white/10"
        >
          {expanded ? 'Burst-Diagnose einklappen' : 'Burst-Diagnose anzeigen'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-neutral-500">
            {([
              ['pre_fx', 'Vor FX'],
              ['post_fx', 'Nach FX'],
              ['monitor', 'Monitor'],
            ] as const).map(([tap, label]) => {
              const entry = audioTapMonitor?.taps?.[tap];
              return (
                <div key={tap} className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
                  <div>RMS <span className="text-neutral-300">{entry ? (entry.rms * 100).toFixed(1) : '—'}%</span></div>
                  <div>Peak <span className="text-neutral-300">{entry ? (entry.peak * 100).toFixed(1) : '—'}%</span></div>
                  <div>Stimmen <span className="text-neutral-300">{entry ? entry.activeVoices : '—'}</span></div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-neutral-500">
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Heißester Pfad <span className="text-neutral-300">{audioTapMonitor?.hottestTap === 'pre_fx' ? 'Vor FX' : audioTapMonitor?.hottestTap === 'post_fx' ? 'Nach FX' : audioTapMonitor?.hottestTap === 'monitor' ? 'Monitor' : '—'}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Lesart <span className="text-neutral-300">{audioTapMonitor?.diagnosis ?? '—'}</span>
            </div>
          </div>
          <div
            className="rounded border border-cyan-900/40 bg-cyan-950/10 p-3 text-[11px] text-neutral-400"
            data-burst-stress-scenario-contract="manual-comparison-panel"
          >
            <div className="grid gap-2 md:grid-cols-[minmax(220px,320px)_1fr]">
              <label className="grid gap-1">
                <span className="text-[10px] uppercase tracking-widest text-cyan-300">Stress-Szenario</span>
                <select
                  className="rounded border border-cyan-800/60 bg-black px-2 py-1 text-cyan-100"
                  value={activeStressScenarioId}
                  onChange={(event) => onChangeStressScenarioId(event.target.value as XensonarBurstStressScenarioId)}
                >
                  {XENSONAR_BURST_STRESS_SCENARIOS.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
                  ))}
                </select>
              </label>
              <div>
                <div className="text-cyan-100">{activeScenario.intent}</div>
                <div className="mt-1 text-neutral-500">Warmup {Math.round(activeScenario.warmupMs / 1000)}s · Messfenster {Math.round(activeScenario.recommendedMeasureMs / 1000)}s · Exportname enthält Szenario, Engine und Browserprofil.</div>
                <div className="mt-1 text-neutral-500">Erhaltung: {activeScenario.musicalPreservationFocus.slice(0, 2).join(' · ')}</div>
              </div>
            </div>
          </div>
          <div
            className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px] text-neutral-500"
            data-audio-stress-comparison-harness="burst-window-dashboard"
          >
            <div className="border border-rose-900/50 bg-rose-950/10 px-3 py-2">
              Burstfenster 16 ms <span className="text-neutral-200">{burst16?.maxEvents ?? 0}</span> · RF <span className="text-neutral-300">{burst16?.maxRootFollowEvents ?? 0}</span> · P <span className="text-neutral-300">{burst16?.maxParticleEvents ?? 0}</span> · W <span className="text-neutral-300">{burst16?.maxWaveStarterEvents ?? 0}</span>
            </div>
            <div className="border border-amber-900/50 bg-amber-950/10 px-3 py-2">
              Burstfenster 50/100 ms <span className="text-neutral-200">{burst50?.maxEvents ?? 0}</span> / <span className="text-neutral-200">{burst100?.maxEvents ?? 0}</span> · Risiko <span className="text-neutral-300">{stressComparison?.burstRiskScore ?? 0}</span> · Browser <span className="text-neutral-300">{stressComparison?.browserOptimizedReadout ?? '—'}</span>
            </div>
            <div className="border border-sky-900/50 bg-sky-950/10 px-3 py-2">
              Engine <span className="text-neutral-200">{stressComparison?.rootFollowVoiceEngineMode ?? '—'}</span> · Worklet <span className="text-neutral-300">{stressComparison?.workletPilotHealth ?? stressComparison?.workletStatus ?? '—'}</span>
            </div>
            <div className="border border-violet-900/50 bg-violet-950/10 px-3 py-2">
              Dominant <span className="text-neutral-200">{stressComparison?.dominantSubsystem ?? '—'}</span> · Primary-Mutes <span className="text-neutral-300">{stressComparison?.primaryCandidateMuteEvents ?? 0}</span> · Robust <span className="text-neutral-300">{stressComparison?.robustnessScore ?? 0}</span> · Erhalt <span className="text-neutral-300">{stressComparison?.musicalPreservationScore ?? 0}</span> · Restriktion <span className="text-neutral-300">{stressComparison?.restrictionCostScore ?? 0}</span>
            </div>
            <div className="border border-fuchsia-900/50 bg-fuchsia-950/10 px-3 py-2" data-root-follow-relief-gate-diagnostic={stressComparison?.legacyReliefGate ?? 'no-relief'}>
              Relief-Gate <span className="text-neutral-200">{stressComparison?.legacyReliefGate ?? 'no-relief'}</span> · Stable <span className="text-neutral-300">{stressComparison?.stableLaneReliefEvents ?? 0}</span> · Δ <span className="text-neutral-300">{stressComparison?.workletStableLaneRenderedFrameDelta ?? 0}</span> · Fresh <span className="text-neutral-300">{stressComparison?.workletStableLaneFrameAdvanceFresh ? 'ja' : 'nein'}</span> · Transport <span className="text-neutral-300">{stressComparison?.workletStableLanePlanTransportBackendKind ?? 'message-port'} P {stressComparison?.workletStableLanePlanTransportPostedCount ?? 0}/Q {stressComparison?.workletStableLanePlanTransportPendingCount ?? 0}/S {stressComparison?.workletStableLanePlanTransportDroppedSupersededCount ?? 0}</span> · SAB <span className="text-neutral-300">{stressComparison?.workletStableLaneSabTransportReadiness ?? 'unknown'}:{stressComparison?.workletStableLaneSabTransportReadinessReason ?? 'not-in-browser-runtime'}{stressComparison?.workletStableLaneSabTransportSingleFileHtmlLikelyBlocked ? ':singlefile/html' : ''}</span> · Blend <span className="text-neutral-300">{stressComparison?.stableLaneBlendEvents ?? 0}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-9 gap-2 text-[11px] text-neutral-500">
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Root Follow <span className="text-neutral-300">{rootFollowTraffic?.gateOpen ? 'offen' : rootFollowTraffic?.activeRequested ? 'wartet' : 'aus'}</span> · <span className="text-neutral-300">{rootFollowTraffic?.granulationMode ?? '—'}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              RF Nodes <span className="text-neutral-300">{rootFollowTraffic?.activeNodes ?? 0}</span> · Synth <span className="text-neutral-300">{rootFollowTraffic?.activeSynthVoices ?? 0}</span> · Timer <span className="text-neutral-300">{rootFollowTraffic?.timerActive ? 'an' : 'aus'}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Letzte Sekunde RF: Tick <span className="text-neutral-300">{recentRootFollowTraffic?.schedulerTicks ?? 0}</span> · Retune <span className="text-neutral-300">{recentRootFollowTraffic?.retuneSamples ?? 0}</span> · Grains <span className="text-neutral-300">{recentRootFollowTraffic?.grainWindows ?? 0}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              RF Vertrag <span className="text-neutral-300">{rootFollowLifecycle?.continuity ?? '—'}</span> · Start <span className="text-neutral-300">{rootFollowLifecycle?.sessionStarts ?? 0}</span> · Retune≠Start <span className="text-neutral-300">{rootFollowLifecycle?.retuneSamplesWithoutRestart ?? 0}</span> · Verdacht <span className="text-neutral-300">{rootFollowLifecycle?.sameLoopRestartSuspicions ?? 0}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Wellenstarter-Arp <span className="text-neutral-300">{waveOvertoneArpTraffic?.timerActive ? 'an' : 'aus'}</span> · Queue <span className="text-neutral-300">{waveOvertoneArpTraffic?.queueLength ?? 0}</span> · gespielt <span className="text-neutral-300">{waveOvertoneArpTraffic?.playedTotal ?? 0}</span> · letzte Sek. <span className="text-neutral-300">{recentWaveOvertoneArpTraffic?.admitted ?? 0}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Raster-Verkehr RAF <span className="text-neutral-300">{quantizedTrafficRuntime?.activeAnimationFrames ?? 0}</span> · Takt <span className="text-neutral-300">{quantizedTrafficRuntime?.activeIntervals ?? 0}</span> · aktiv <span className="text-neutral-300">{quantizedTrafficRuntime?.active ?? 0}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Materialspur aktiv <span className="text-neutral-300">{materialTrackRuntime?.active ?? 0}</span> · Source <span className="text-neutral-300">{materialTrackRuntime?.activeAudioSources ?? 0}</span> · Gain <span className="text-neutral-300">{materialTrackRuntime?.activeGainNodes ?? 0}</span> · Cache <span className="text-neutral-300">{materialTrackRuntime?.activeCacheEntries ?? 0}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Recording-Laufzeit aktiv <span className="text-neutral-300">{recordingRuntime?.active ?? 0}</span> · URL <span className="text-neutral-300">{recordingRuntime?.activeObjectUrls ?? 0}</span> · RAF <span className="text-neutral-300">{recordingRuntime?.activeAnimationFrames ?? 0}</span> · offen <span className="text-neutral-300">{recordingRuntime?.activeMediaRecorders ?? 0}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              SpectralForge aktiv <span className="text-neutral-300">{spectralForgeRuntime?.active ?? 0}</span> · Quelle <span className="text-neutral-300">{spectralForgeRuntime?.activeSourceAssets ?? 0}</span> · Audio <span className="text-neutral-300">{spectralForgeRuntime?.activeAudioSources ?? 0}</span> · URL <span className="text-neutral-300">{spectralForgeRuntime?.activeObjectUrls ?? 0}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-[11px] text-neutral-500">
            <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              Recorder <span className="text-neutral-300">{audioBurstRecorder?.isRecording ? 'läuft' : 'bereit'}</span> · Einträge <span className="text-neutral-300">{audioBurstRecorder?.entries?.length ?? 0}</span> · Marker <span className="text-neutral-300">{audioBurstRecorder?.markerCount ?? 0}</span>
            </div>
            {audioBurstRecorder?.isRecording ? (
              <button className="px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20" onClick={onStopAudioBurstRecorder}>Aufzeichnung stoppen</button>
            ) : (
              <button className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" onClick={onStartAudioBurstRecorder}>Aufzeichnung starten</button>
            )}
            <button className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed" onClick={onExportAudioBurstRecorder} disabled={!audioBurstRecorder?.entries?.length}>Log herunterladen</button>
            <button className="px-3 py-2 rounded-lg border border-white/10 bg-black/20 text-neutral-300 hover:bg-white/5" onClick={onClearAudioBurstRecorder}>Leeren</button>
          </div>
          <details
            open={therapistExpanded}
            onToggle={(event) => setTherapistExpanded((event.currentTarget as HTMLDetailsElement).open)}
            className="rounded border border-violet-900/50 bg-violet-950/10 p-3 text-[11px] text-neutral-400"
          >
            <summary className="cursor-pointer list-none text-violet-100">
              Paartherapeut / Paket-Aktivierung {therapistExpanded ? 'einklappen' : 'ausklappen'}
            </summary>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded border border-neutral-800 bg-black/30 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500">Audio-Kontext</div>
                  <div className="mt-1 text-neutral-200">{rootFollowHealth.audioContextState}</div>
                  <div className="mt-1 text-neutral-500">Browserzustand: {rootFollowHealth.browserState}</div>
                </div>
                <div className="rounded border border-neutral-800 bg-black/30 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500">Root Follow Auswahl</div>
                  <div className="mt-1 text-neutral-200">{rootFollowHealth.selectedLoopName ?? '—'}</div>
                  <div className="mt-1 text-neutral-500">aktiv {rootFollowHealth.rootFollowLoopActive ? 'ja' : 'nein'} · Entry {rootFollowHealth.selectedEntryExists ? 'sichtbar' : 'fehlt'} · Bank {rootFollowHealth.rootFollowEntries}</div>
                </div>
                <div className="rounded border border-neutral-800 bg-black/30 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500">Laufzeit</div>
                  <div className="mt-1 text-neutral-200">Nodes {rootFollowHealth.runtimeNodes} · Synth {rootFollowHealth.synthVoices}</div>
                  <div className="mt-1 text-neutral-500">Cache {rootFollowHealth.cacheSize} · Timer {rootFollowHealth.timerActive ? 'an' : 'aus'} · Gain {rootFollowHealth.gainConnected ? 'verbunden' : 'frei'}</div>
                  <div className="mt-1 text-neutral-500">Gate {rootFollowHealth.effectivePlaybackGate ? 'offen' : 'zu'} · Preview {rootFollowHealth.rootFollowPreviewActive ? 'an' : 'aus'} · Spielfeld {rootFollowHealth.rootFollowPlayfieldInside ? 'inside' : 'outside'}</div>
                  <div className="mt-1 text-neutral-500">Letzte Stufe {rootFollowHealth.lastPlaybackStage ?? '—'} · Stop {rootFollowHealth.lastStopReason ?? '—'}{rootFollowHealth.latestColdStartRisk ? ' · Kaltstart-Risiko' : ''}</div>
                </div>
              </div>
              <div className="rounded border border-neutral-800 bg-black/30 px-3 py-2">
                Paketdaten: <span className="text-neutral-200">{rootFollowHealth.materialLoopEntries}</span> Materialspur-Einträge · <span className="text-neutral-200">{rootFollowHealth.packagePreferredEntries}</span> als Root Follow markiert. Diese Reparatur löscht keine Samples und keine Materialspur; sie räumt nur Laufzeit-/Auswahlzustände oder setzt die Root-Follow-Bank aus den aktuell geladenen Paketdaten neu.
              </div>
              <div className="rounded border border-neutral-800 bg-black/30 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Letzter Paketvertrag</div>
                <div className="mt-1 text-neutral-200">{workspacePackageActivationReport.activationSummary}</div>
                <div className="mt-1 text-neutral-500">Material {workspacePackageActivationReport.materialEntries} · Bank {workspacePackageActivationReport.validRootFollowBankEntries}/{workspacePackageActivationReport.rootFollowBankEntries} gültig · Status {workspacePackageActivationReport.stateLabel}</div>
                {workspacePackageActivationReport.warnings.length ? (
                  <div className="mt-1 text-amber-300">{workspacePackageActivationReport.warnings.slice(0, 2).join(' · ')}</div>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <button type="button" className="rounded border border-violet-600/60 bg-violet-950/25 px-3 py-2 text-violet-100 hover:bg-violet-900/30" onClick={onRunAudioPairTherapistReset}>Laufzeit resetten</button>
                <button type="button" className="rounded border border-amber-600/60 bg-amber-950/20 px-3 py-2 text-amber-100 hover:bg-amber-900/25" onClick={onReactivateRootFollowFromPackage}>Paket-Root-Follow neu aktivieren</button>
                <button type="button" className="rounded border border-rose-700/60 bg-rose-950/20 px-3 py-2 text-rose-100 hover:bg-rose-900/25" onClick={onClearRootFollowBrowserState}>Browser-Auswahl löschen</button>
              </div>
              {audioPairTherapistStatus ? <div className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-neutral-300">{audioPairTherapistStatus}</div> : null}
            </div>
          </details>
          <div className="text-xs text-neutral-500">Der Recorder bleibt aktiv nutzbar, auch wenn dieses Feld zugeklappt ist. Mit laufender Aufzeichnung setzt <span className="text-neutral-300">Backspace</span> weiter einen Marker genau dann, wenn du das Knacken hörst.</div>
        </div>
      )}
    </div>
  );
}
