import { createEntrophonVoicePreview } from '../audio/entrophonVoicePreview';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ENTROPHON_FILTER_OPTIONS,
  ENTROPHON_WAVEFORM_OPTIONS,
  getEntrophonSoundConfig,
  resetEntrophonSurfaceSoundConfig,
  setEntrophonSurfaceSoundConfig,
  subscribeEntrophonSoundConfig,
  resolveXensonarMicrotonalVoice,
  type EntrophonSurfaceSoundConfig,
} from '../../../core/audio/xensonarMicrotonalSoundEngine';

type HauptraumSurface = 'wave';

const SURFACE_LABEL = 'Wellenstarter';
const SURFACE_HINT = 'Tonhöhe kommt aus dem Xensonar-Raster / Tastendruck. Diese Regler formen nur die Stimme. Partikel und SpectralForge bleiben in diesem Branch auf ihrer alten Klanglogik.';

export type EntrophonHauptraumSoundPanelProps = {
  gridBase?: number;
  gridTuning?: string;
  waveSoundPreset?: string;
};

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}


export function EntrophonUnifiedSoundPanel({ gridBase, gridTuning, waveSoundPreset }: EntrophonHauptraumSoundPanelProps) {
  const surface: HauptraumSurface = 'wave';
  const previewRef = useRef<ReturnType<typeof createEntrophonVoicePreview> | null>(null);
  useEffect(() => () => { previewRef.current?.dispose(); previewRef.current = null; }, []);
  const [config, setConfig] = useState(getEntrophonSoundConfig);

  useEffect(() => subscribeEntrophonSoundConfig(() => setConfig(getEntrophonSoundConfig())), []);

  const cfg = config[surface];
  const update = (patch: Partial<EntrophonSurfaceSoundConfig>) => {
    setConfig(setEntrophonSurfaceSoundConfig(surface, patch));
  };
  const reset = () => setConfig(resetEntrophonSurfaceSoundConfig(surface));
  const previewFreq = Number.isFinite(gridBase ?? NaN) ? Number(gridBase) : 196;

  const voiceSummary = useMemo(() => {
    const voice = resolveXensonarMicrotonalVoice({ surface: 'wave', freq: previewFreq });
    return `${voice.waveform} · ${formatNumber(voice.tunedFreq, 1)} Hz · ${voice.oscillatorFreqs.length}+${voice.colorFreqs.length} Stimmen · Tonhöhe: Xensonar-Raster`;
  }, [cfg, previewFreq]);

  const fieldSummary = `Raster ${gridTuning ?? '—'} · Basis ${Number.isFinite(gridBase ?? NaN) ? `${formatNumber(Number(gridBase), 1)} Hz` : '—'} · Preset ${waveSoundPreset ?? '—'}`;

  return (
    <div className="border border-fuchsia-900/60 bg-fuchsia-950/15 px-3 py-3 rounded-sm" data-xensonar-entrophon-hauptraum-panel="true">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/80">Entrophon Klangkörper · Hauptraum</div>
          <div className="text-[10px] text-neutral-500 mt-1">
            Austausch-Branch: Entrophon ersetzt die aktive Wellenstarter-Stimme. Das Xensonar-Raster bestimmt die Tonhöhe; Partikel und SpectralForge bleiben in diesem Branch auf alter Klanglogik.
          </div>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-neutral-300 whitespace-nowrap">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> aktiv
        </label>
      </div>

      <div className="mb-3 rounded border border-neutral-800 bg-neutral-950/50 px-2 py-1.5 text-[10px] text-neutral-400">
        <span className="text-fuchsia-200/80">{SURFACE_LABEL}</span>: {SURFACE_HINT}
        <div className="mt-1 text-neutral-500">{fieldSummary}</div>
        <div className="mt-1 text-fuchsia-200/70">{voiceSummary}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Toggle label="Synth-Anteil" value={cfg.engineAmount} min={0} max={1} step={0.01} onChange={(v) => update({ engineAmount: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <Toggle label="Volume" value={cfg.volume} min={0} max={2} step={0.01} onChange={(v) => update({ volume: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <label className="text-[10px] text-neutral-400 uppercase tracking-widest">
          Waveform
          <select value={cfg.waveform} onChange={(e) => update({ waveform: e.target.value as OscillatorType })} className="mt-1 w-full bg-neutral-950 border border-neutral-700 p-1 text-xs text-neutral-300">
            {ENTROPHON_WAVEFORM_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <Toggle label="Unison" value={cfg.unison} min={1} max={6} step={1} onChange={(v) => update({ unison: v })} display={(v) => `${Math.round(v)}`} />
        <Toggle label="Detune" value={cfg.detune} min={0} max={80} step={0.5} onChange={(v) => update({ detune: v })} display={(v) => `${formatNumber(v, 1)}¢`} />
        <Toggle label="Attack" value={cfg.attack} min={0.0005} max={0.35} step={0.001} onChange={(v) => update({ attack: v })} display={(v) => `${Math.round(v * 1000)}ms`} />
        <Toggle label="Decay" value={cfg.decay} min={0.005} max={1.2} step={0.005} onChange={(v) => update({ decay: v })} display={(v) => `${Math.round(v * 1000)}ms`} />
        <Toggle label="Sustain" value={cfg.sustain} min={0} max={1} step={0.01} onChange={(v) => update({ sustain: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <Toggle label="Release" value={cfg.release} min={0.005} max={2.5} step={0.005} onChange={(v) => update({ release: v })} display={(v) => `${Math.round(v * 1000)}ms`} />
        <Toggle label="Pitch Bend" value={cfg.pitchBend} min={-24} max={24} step={0.05} onChange={(v) => update({ pitchBend: v })} display={(v) => `${formatNumber(v, 2)} st`} />
        <Toggle label="Bend Time" value={cfg.pitchBendTime} min={0.002} max={2} step={0.002} onChange={(v) => update({ pitchBendTime: v })} display={(v) => `${Math.round(v * 1000)}ms`} />
        <label className="text-[10px] text-neutral-400 uppercase tracking-widest">
          Filter
          <select value={cfg.filterType} onChange={(e) => update({ filterType: e.target.value as BiquadFilterType })} className="mt-1 w-full bg-neutral-950 border border-neutral-700 p-1 text-xs text-neutral-300">
            {ENTROPHON_FILTER_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <Toggle label="Filter Freq" value={cfg.filterFreqBase} min={40} max={18000} step={10} onChange={(v) => update({ filterFreqBase: v })} display={(v) => `${Math.round(v)} Hz`} />
        <Toggle label="Filter Q" value={cfg.filterResonance} min={0.1} max={26} step={0.1} onChange={(v) => update({ filterResonance: v })} display={(v) => formatNumber(v, 1)} />
        <Toggle label="Filter Env" value={cfg.filterEnvAmount} min={0} max={1.5} step={0.01} onChange={(v) => update({ filterEnvAmount: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <Toggle label="Filter Decay" value={cfg.filterDecay} min={0.005} max={2} step={0.005} onChange={(v) => update({ filterDecay: v })} display={(v) => `${Math.round(v * 1000)}ms`} />
        <Toggle label="Color" value={cfg.colorAmount} min={0} max={1.5} step={0.01} onChange={(v) => update({ colorAmount: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <Toggle label="Fold" value={cfg.foldAmount} min={0} max={1.5} step={0.01} onChange={(v) => update({ foldAmount: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <Toggle label="Delay" value={cfg.delayAmount} min={0} max={1} step={0.01} onChange={(v) => update({ delayAmount: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <Toggle label="Schweif" value={cfg.reverbAmount} min={0} max={1} step={0.01} onChange={(v) => update({ reverbAmount: v })} display={(v) => `${Math.round(v * 100)}%`} />
        <Toggle label="Distortion" value={cfg.distortion} min={0} max={1} step={0.01} onChange={(v) => update({ distortion: v })} display={(v) => `${Math.round(v * 100)}%`} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => {
          previewRef.current ??= createEntrophonVoicePreview();
          previewRef.current.play(cfg, previewFreq);
        }} className="px-2 py-1 border border-fuchsia-600 bg-fuchsia-950/40 text-fuchsia-100 text-xs">Stimme Preview</button>
        <button type="button" onClick={reset} className="px-2 py-1 border border-neutral-700 bg-neutral-950 text-neutral-300 text-xs">Stimme Reset</button>
      </div>
    </div>
  );
}

function Toggle({ label, value, min, max, step, onChange, display }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display?: (value: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{label}</span>
        <span className="font-mono text-[10px] text-fuchsia-200/75">{display ? display(value) : formatNumber(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="mt-1 w-full cursor-pointer accent-fuchsia-400" />
    </label>
  );
}
