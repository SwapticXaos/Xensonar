import type { StableMusicLaneRuntimeSnapshot } from './stableMusicLaneContracts';

export type StableMusicLaneSpeakerProbeOverlayProps = {
  snapshot: StableMusicLaneRuntimeSnapshot;
  active: boolean;
  onStart: () => void | Promise<void>;
  onStop: () => void;
};

const formatPeak = (value: number) => (Number.isFinite(value) ? value.toFixed(3) : '0.000');

const resolveLampLabel = (snapshot: StableMusicLaneRuntimeSnapshot) => {
  if (snapshot.graphProbeStatus === 'passed') return 'GRÜN · Worklet-Signal im Graph gemessen';
  if (snapshot.graphProbeStatus === 'failed') return 'ROT · kein Worklet-Ausgang gemessen';
  if (snapshot.graphProbeStatus === 'measuring') return 'MISST · automatische Graph-Probe läuft';
  if (snapshot.status === 'failed' || snapshot.status === 'unsupported') return 'ROT · Worklet startet nicht';
  return 'BEREIT · Auto-Test starten';
};

const resolveLampClassName = (snapshot: StableMusicLaneRuntimeSnapshot) => {
  if (snapshot.graphProbeStatus === 'passed') return 'border-emerald-300/70 bg-emerald-500/25 text-emerald-50 shadow-[0_0_14px_rgba(16,185,129,0.45)]';
  if (snapshot.graphProbeStatus === 'failed' || snapshot.status === 'failed' || snapshot.status === 'unsupported') return 'border-red-300/70 bg-red-500/22 text-red-50 shadow-[0_0_14px_rgba(248,113,113,0.42)]';
  if (snapshot.graphProbeStatus === 'measuring') return 'border-sky-300/70 bg-sky-500/20 text-sky-50 shadow-[0_0_14px_rgba(56,189,248,0.38)] animate-pulse';
  return 'border-amber-300/60 bg-amber-500/12 text-amber-50';
};

export function StableMusicLaneSpeakerProbeOverlay({
  snapshot,
  active,
  onStart,
  onStop,
}: StableMusicLaneSpeakerProbeOverlayProps) {
  const statusLabel = `${snapshot.status} · ctx ${snapshot.contextState}`;
  const graphLabel = resolveLampLabel(snapshot);
  return (
    <div
      data-xensonar-stable-music-lane-graph-probe-status={snapshot.graphProbeStatus}
      data-xensonar-stable-music-lane-graph-probe-rms={snapshot.graphProbeRms}
      data-xensonar-stable-music-lane-graph-probe-peak={snapshot.graphProbePeakAbs}
      className="fixed bottom-3 left-3 z-[80] max-w-[25rem] rounded-lg border border-amber-400/45 bg-black/84 p-3 text-xs text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.22)] backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold tracking-wide text-amber-100">Worklet-Speaker Auto-Test</div>
          <div className="text-[10px] text-amber-100/60">misst Worklet → Gain → Analyser → destination</div>
        </div>
        <button
          type="button"
          onClick={active ? onStop : onStart}
          className={`rounded border px-3 py-1 text-[11px] font-semibold ${active ? 'border-red-300/70 bg-red-950/55 text-red-100 hover:bg-red-900/70' : 'border-amber-300/70 bg-amber-950/55 text-amber-50 hover:bg-amber-900/70'}`}
        >
          {active ? 'Auto-Test stoppen' : 'Auto-Test starten'}
        </button>
      </div>
      <div className={`mb-2 rounded border px-2 py-1 text-[11px] font-semibold ${resolveLampClassName(snapshot)}`}>
        {graphLabel}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] text-amber-100/72">
        <span>Status</span><span className="truncate text-amber-50/80">{statusLabel}</span>
        <span>Graph</span><span>RMS {formatPeak(snapshot.graphProbeRms)} · Peak {formatPeak(snapshot.graphProbePeakAbs)} · n {snapshot.graphProbeSampleCount}</span>
        <span>Worklet</span><span>Peak {formatPeak(snapshot.peakAbs)} / proof {formatPeak(snapshot.speakerProofPeakAbs)} · Puls {snapshot.speakerProofPulseCount}</span>
        <span>Grund</span><span className="truncate">{snapshot.graphProbeReason ?? snapshot.detail}</span>
        <span>Regel</span><span>GRÜN nur bei automatisch gemessenem Graph-Signal; kein Hör-Raten.</span>
      </div>
    </div>
  );
}
