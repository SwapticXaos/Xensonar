import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT } from './rootFollowSideBySideLayout';
import type { MaterialEntry } from '../../../l3lab/materialLibrary';
import {
  ROOT_FOLLOW_GRANULAR_CHARACTER_PRESETS,
  ROOT_FOLLOW_GRANULAR_LIMITS,
  analyzeRootFollowGranularAudioProfile,
  applyRootFollowGranularPowerMode,
  blendRootFollowGranularSettings,
  cloneRootFollowElectronFragmentPreset,
  estimateRootFollowGranularDensity,
  formatRootFollowGranularDensityIndex,
  formatRootFollowGranularPowerLabel,
  formatRootFollowGranularPresetLabel,
  formatRootFollowGranularProfileLine,
  normalizeRootFollowGranularSettings,
  parseRootFollowGranularAudioProfile,
  type RootFollowGranularPowerMode,
  type RootFollowGranularPresetName,
  type RootFollowGranularSettings,
} from '../../rootFollow/rootFollowGranularSettings';

function markCustomGranularSettings(patch: Partial<RootFollowGranularSettings>, current: RootFollowGranularSettings): RootFollowGranularSettings {
  return normalizeRootFollowGranularSettings({ ...current, ...patch, preset: 'custom', powerMode: 'custom' }, current.preset === 'grainy' ? 'grainy' : 'flowing');
}

const ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY = 'xensonar.rootFollow.granular.customSlot.v1';
const GRANULAR_CHARACTER_HINTS: Record<RootFollowGranularPresetName, string> = {
  smooth: 'Lange Fenster, kontrollierte Überlappung, wenig Jitter: ruhige, fast synthetische Kontinuität.',
  flowing: 'Stabiler Basis-Slice für tragende Root-Follow-Loops.',
  grainy: 'Fragmentierter Slice mit stärkerer Artikulation und hörbarer Körnung.',
};
const GRANULAR_POWER_HINTS: Record<Exclude<RootFollowGranularPowerMode, 'custom'>, string> = {
  safe: 'Weniger Ereignisdichte, robuster Startpunkt für Live-Betrieb.',
  balanced: 'Mittlere Dichte: direkter Hörvergleich ohne harte Überlast-Tendenz.',
  rich: 'Dichterer Körper für mehr Auflösung und Präsenz.',
  edge: 'Kantenbereich: musikalisch reizvoll, aber bewusster zu prüfen.',
};
const GRANULAR_QUALITY_HINTS: Record<RootFollowGranularSettings['qualityMode'], string> = {
  base: 'Basis glättet kohärenter und hält Loops zusammenhängender.',
  fragment: 'Fragment hält Transienten und Bruchkanten bewusster fest.',
};

export function RootFollowGranularManagerDialog({
  settings,
  analysisEntry,
  onPreset,
  onChange,
  onClose,
  onAuditionPitchHz,
  rootFollowPreviewActive = false,
  sideBySideRight = false,
}: {
  settings: RootFollowGranularSettings;
  analysisEntry?: MaterialEntry | null;
  onPreset: (mode: RootFollowGranularPresetName) => void;
  onChange: (settings: RootFollowGranularSettings) => void;
  onClose: () => void;
  onAuditionPitchHz?: (hz: number) => void;
  rootFollowPreviewActive?: boolean;
  sideBySideRight?: boolean;
}) {
  const resolved = normalizeRootFollowGranularSettings(settings, settings.preset === 'grainy' ? 'grainy' : 'flowing');
  const density = estimateRootFollowGranularDensity(resolved);
  const densityIndexLabel = formatRootFollowGranularDensityIndex(resolved);
  const [slotStatus, setSlotStatus] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const storedBridgeProfile = parseRootFollowGranularAudioProfile(analysisEntry?.rootFollowGranularProfile);
  const storedBridgeLine = formatRootFollowGranularProfileLine(storedBridgeProfile);

  const setNumeric = (
    key: 'windowMs' | 'stepMs' | 'leadMs' | 'startLeadMs' | 'microDensity' | 'sourceSpread' | 'jitter' | 'maxGrainsPerWindow',
    value: number,
  ) => {
    onChange(markCustomGranularSettings({ [key]: key === 'maxGrainsPerWindow' ? Math.round(value) : value }, resolved));
  };
  const setQualityMode = (qualityMode: RootFollowGranularSettings['qualityMode']) => {
    onChange(markCustomGranularSettings({ qualityMode }, resolved));
  };
  const setPowerMode = (powerMode: Exclude<RootFollowGranularPowerMode, 'custom'>) => {
    onChange(applyRootFollowGranularPowerMode(resolved, powerMode, resolved.preset === 'grainy' ? 'grainy' : 'flowing'));
  };
  const saveCustomSlot = () => {
    try {
      window.localStorage.setItem(ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY, JSON.stringify(resolved));
      setSlotStatus('Custom Slot gespeichert.');
      setAnalysisStatus('');
    } catch {
      setSlotStatus('Custom Slot konnte nicht gespeichert werden.');
    }
  };

  const applyElectronFragmentPreset = () => {
    onChange(cloneRootFollowElectronFragmentPreset());
    setSlotStatus('Electron-Fragment gesetzt.');
    setAnalysisStatus('');
  };
  const loadCustomSlot = () => {
    try {
      const raw = window.localStorage.getItem(ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY);
      if (!raw) {
        setSlotStatus('Noch kein Custom Slot gespeichert.');
        setAnalysisStatus('');
        return;
      }
      const loaded = normalizeRootFollowGranularSettings(JSON.parse(raw), resolved.preset === 'grainy' ? 'grainy' : 'flowing');
      onChange({ ...loaded, preset: 'custom' });
      setSlotStatus('Custom Slot geladen.');
      setAnalysisStatus('');
    } catch {
      setSlotStatus('Custom Slot konnte nicht geladen werden.');
    }
  };
  const applyStoredBridgeProfile = (mode: 'blend' | 'direct' = 'blend') => {
    if (!storedBridgeProfile) {
      setAnalysisStatus('Kein gespeichertes SpectralForge-/Carrier-Profil für diesen Loop gefunden.');
      setSlotStatus('');
      return;
    }
    const next = mode === 'direct'
      ? storedBridgeProfile.recommendedSettings
      : blendRootFollowGranularSettings(resolved, storedBridgeProfile.recommendedSettings, 0.62);
    onChange(next);
    setAnalysisStatus((mode === 'direct' ? 'Profil direkt übernommen. ' : 'Profil sanft eingemischt. ') + storedBridgeProfile.summary);
    setSlotStatus('');
  };
  const rootPitchHz = Math.max(27.5, Math.min(3520, Number.isFinite(analysisEntry?.rootHz ?? NaN) ? Number(analysisEntry?.rootHz) : 220));
  const handleAuditionPitchRailPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onAuditionPitchHz || !rootFollowPreviewActive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const normY = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
    // Bounded vertical rail: lower rail = zwei Oktaven unter Loop-Root, upper rail = zwei Oktaven darüber.
    const octaveOffset = (0.5 - normY) * 4;
    const hz = Math.max(27.5, Math.min(3520, rootPitchHz * Math.pow(2, octaveOffset)));
    onAuditionPitchHz(hz);
  };

  const analyzeActiveLoop = async () => {
    if (!analysisEntry) {
      setAnalysisStatus('Kein Root-Follow-Audiomaterial für Analyse gewählt.');
      setSlotStatus('');
      return;
    }
    setAnalysisBusy(true);
    setAnalysisStatus('Raw-Audio-Profil wird direkt für Root Follow abgeleitet …');
    setSlotStatus('');
    try {
      const profile = await analyzeRootFollowGranularAudioProfile({
        blob: analysisEntry.blob,
        durationSec: analysisEntry.durationSec,
        bars: analysisEntry.bars,
        name: analysisEntry.name,
        route: 'direct-root-follow-audio',
      });
      onChange(blendRootFollowGranularSettings(resolved, profile.recommendedSettings, 0.72));
      setAnalysisStatus('Raw-Audio-Fit eingemischt. ' + profile.summary);
    } catch {
      setAnalysisStatus('Analyse fehlgeschlagen; aktuelles Profil bleibt erhalten.');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const Slider = ({
    label,
    value,
    min,
    max,
    step,
    unit,
    onValue,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onValue: (value: number) => void;
  }) => (
    <label className="block">
      <div className="mb-1 flex justify-between text-xs text-violet-100/80"><span>{label}</span><span>{Number.isInteger(value) ? value : value.toFixed(2)}{unit ? ' ' + unit : ''}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onValue(Number(event.target.value))} className="w-full cursor-pointer accent-violet-500" />
    </label>
  );

  return (
    <div data-hotkey-scope="root-follow-granular-manager" className={`fixed inset-0 z-[142] flex ${sideBySideRight ? ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.rightOverlayClass : 'items-center justify-center bg-black/65 p-4'}`} onKeyDownCapture={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }}>
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-violet-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60 ${sideBySideRight ? ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.rightDialogClass : 'max-h-[calc(100vh-2rem)] max-w-5xl'}`}
        data-xensonar-granular-manager-pitch-audition-surface="bounded-rail"
        title={rootFollowPreviewActive ? 'Pitch-Bahn: vertikale Mausbewegung testet Tonhöhe.' : 'Root-Follow-Vorhören starten; danach testet die Pitch-Bahn die Tonhöhe.'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-violet-300/80"><span className="text-base leading-none" aria-hidden="true">🪭</span><span>Granular Manager</span></div>
            <div className="mt-1 text-base font-semibold text-violet-50">{formatRootFollowGranularPresetLabel(resolved)} · {formatRootFollowGranularPowerLabel(resolved.powerMode)} · Dichte {densityIndexLabel}</div>
            <div className="text-violet-100/65">Audio-/Sample-Elastik für Root Follow.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fenster schließen" className="rounded-full border border-violet-800/70 px-3 py-1 text-base font-bold leading-none text-violet-100 hover:bg-violet-950/40">×</button>
        </div>
        <div className="mt-4 grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[3.4rem_minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div
            className="flex min-h-[26rem] cursor-ns-resize select-none flex-col items-center justify-between rounded-xl border border-violet-700/70 bg-gradient-to-b from-violet-700/35 via-neutral-950 to-cyan-700/25 px-2 py-3 text-[9px] uppercase tracking-[0.18em] text-violet-100/75 shadow-inner shadow-black/70"
            data-xensonar-granular-manager-pitch-audition-rail="bounded"
            title={rootFollowPreviewActive ? 'Pitch-Bahn: oben höher, unten tiefer.' : 'Root-Follow-Vorhören starten; dann hier Pitch testen.'}
            onPointerDown={handleAuditionPitchRailPointer}
            onPointerMove={handleAuditionPitchRailPointer}
          >
            <span className="[writing-mode:vertical-rl] rotate-180">höher</span>
            <span className="h-full w-px rounded bg-violet-200/35" aria-hidden="true" />
            <span className="[writing-mode:vertical-rl] rotate-180">tiefer</span>
          </div>
          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            <div className="rounded border border-violet-900/50 bg-violet-950/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-violet-200/70">Klangcharakter</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                {ROOT_FOLLOW_GRANULAR_CHARACTER_PRESETS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    title={GRANULAR_CHARACTER_HINTS[mode]}
                    onClick={() => onPreset(mode)}
                    className={`rounded border px-3 py-2 ${resolved.preset === mode ? 'border-violet-300 bg-violet-950/50 text-violet-50' : 'border-violet-900/60 bg-black/25 text-violet-100/75 hover:bg-violet-950/25'}`}
                  >
                    {mode === 'smooth' ? 'Glatt' : mode === 'flowing' ? 'Fließend' : 'Körnig'}
                  </button>
                ))}
              </div>
              <div className="mt-2 rounded border border-neutral-800 bg-neutral-950/45 px-2 py-1 text-[10px] text-neutral-400" title="Hinweise zu den Klangcharakteren erscheinen beim Überfahren der Knöpfe.">
                Hover zeigt Details · aktiv: {formatRootFollowGranularPresetLabel(resolved)}
              </div>
            </div>
            <div className="rounded border border-violet-900/50 bg-violet-950/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-violet-200/70">Dichteprofil</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {(['safe', 'balanced', 'rich', 'edge'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    title={GRANULAR_POWER_HINTS[mode]}
                    onClick={() => setPowerMode(mode)}
                    className={`rounded border px-2 py-2 ${resolved.powerMode === mode ? 'border-violet-300 bg-violet-950/45 text-violet-50' : 'border-violet-900/50 bg-black/25 text-violet-100/70 hover:bg-violet-950/20'}`}
                  >
                    {formatRootFollowGranularPowerLabel(mode)}
                  </button>
                ))}
              </div>
              <div className="mt-2 rounded border border-neutral-800 bg-black/25 px-2 py-1 text-[10px] text-violet-100/60" title="Dichte beschreibt die innere Überlappung/Auflösung des Root-Follow-Granularpfads.">
                Dichte ×{density.toFixed(2)} · Index {densityIndexLabel}
              </div>
            </div>
            <div className="rounded border border-cyan-900/50 bg-cyan-950/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/75">Loopprofil</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <button type="button" title="Mischt das gespeicherte SpectralForge-/Carrier-Profil sanft in den aktuellen GM-Stand." onClick={() => applyStoredBridgeProfile('blend')} disabled={!storedBridgeProfile} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-2 text-cyan-50 hover:bg-cyan-950/45 disabled:cursor-not-allowed disabled:opacity-45">
                  Carrier-Profil einmischen
                </button>
                <button type="button" title="Setzt den GM direkt auf das gespeicherte Profil dieses Loops." onClick={() => applyStoredBridgeProfile('direct')} disabled={!storedBridgeProfile} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-2 text-cyan-50 hover:bg-cyan-950/45 disabled:cursor-not-allowed disabled:opacity-45">
                  Profil direkt setzen
                </button>
                <button type="button" title="Analysiert den aktuellen Root-Follow-Audioloop und schlägt GM-Reglerwerte vor." onClick={analyzeActiveLoop} disabled={analysisBusy || !analysisEntry} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-2 text-cyan-50 hover:bg-cyan-950/45 disabled:cursor-not-allowed disabled:opacity-45">
                  {analysisBusy ? 'Analysiert …' : 'Raw Audio fitten'}
                </button>
                <button type="button" title="Setzt den zurzeit stabileren Electron-Teststand: Fragment, lange Fenster, hoher Vorlauf." onClick={applyElectronFragmentPreset} className="rounded border border-violet-500/70 bg-violet-950/35 px-2 py-2 text-violet-50 hover:bg-violet-900/45">Electron-Fragment setzen</button>
                <button type="button" title="Speichert den aktuellen GM-Reglerstand lokal." onClick={saveCustomSlot} className="rounded border border-violet-800/60 bg-black/25 px-2 py-2 text-violet-100 hover:bg-violet-950/30">Custom speichern</button>
                <button type="button" title="Lädt den lokal gespeicherten GM-Reglerstand." onClick={loadCustomSlot} className="rounded border border-violet-800/60 bg-black/25 px-2 py-2 text-violet-100 hover:bg-violet-950/30">Custom laden</button>
              </div>
              {storedBridgeLine ? <div className="mt-2 rounded border border-cyan-900/55 bg-black/25 p-2 text-[10px] leading-relaxed text-cyan-100/75">{storedBridgeLine}</div> : null}
              {(analysisStatus || slotStatus) ? <div className="mt-2 text-[11px] leading-relaxed text-cyan-100/70">{analysisStatus || slotStatus}</div> : null}
            </div>
          </div>
          <div className="min-h-0 space-y-3 overflow-y-auto rounded border border-violet-900/50 bg-violet-950/10 p-3 pr-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-violet-200/70">Feinabstimmung</div>
              <div className="rounded border border-violet-900/60 px-2 py-1 text-[10px] uppercase tracking-widest text-violet-100/70">{resolved.qualityMode === 'fragment' ? 'Fragment' : 'Basis'}</div>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Slider label="Fenster" value={resolved.windowMs} min={ROOT_FOLLOW_GRANULAR_LIMITS.windowMs.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.windowMs.max} step={1} unit="ms" onValue={(value) => setNumeric('windowMs', value)} />
                <Slider label="Abstand" value={resolved.stepMs} min={ROOT_FOLLOW_GRANULAR_LIMITS.stepMs.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.stepMs.max} step={1} unit="ms" onValue={(value) => setNumeric('stepMs', value)} />
                <Slider label="Vorlauf" value={resolved.leadMs} min={ROOT_FOLLOW_GRANULAR_LIMITS.leadMs.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.leadMs.max} step={1} unit="ms" onValue={(value) => setNumeric('leadMs', value)} />
                <Slider label="Startpuffer" value={resolved.startLeadMs} min={ROOT_FOLLOW_GRANULAR_LIMITS.startLeadMs.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.startLeadMs.max} step={1} unit="ms" onValue={(value) => setNumeric('startLeadMs', value)} />
                <Slider label="Mikro-Dichte" value={resolved.microDensity} min={ROOT_FOLLOW_GRANULAR_LIMITS.microDensity.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.microDensity.max} step={0.01} onValue={(value) => setNumeric('microDensity', value)} />
                <Slider label="Quellfenster" value={resolved.sourceSpread} min={ROOT_FOLLOW_GRANULAR_LIMITS.sourceSpread.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.sourceSpread.max} step={0.01} onValue={(value) => setNumeric('sourceSpread', value)} />
                <Slider label="Jitter" value={resolved.jitter} min={ROOT_FOLLOW_GRANULAR_LIMITS.jitter.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.jitter.max} step={0.01} onValue={(value) => setNumeric('jitter', value)} />
                <Slider label="Körner/Fenster max." value={resolved.maxGrainsPerWindow} min={ROOT_FOLLOW_GRANULAR_LIMITS.maxGrainsPerWindow.min} max={ROOT_FOLLOW_GRANULAR_LIMITS.maxGrainsPerWindow.max} step={1} onValue={(value) => setNumeric('maxGrainsPerWindow', value)} />
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button type="button" title={GRANULAR_QUALITY_HINTS.base} onClick={() => setQualityMode('base')} className={`rounded border px-2 py-2 ${resolved.qualityMode === 'base' ? 'border-violet-300 bg-violet-950/45 text-violet-50' : 'border-violet-900/50 bg-black/25 text-violet-100/70 hover:bg-violet-950/20'}`}>Basis-Slice</button>
                  <button type="button" title={GRANULAR_QUALITY_HINTS.fragment} onClick={() => setQualityMode('fragment')} className={`rounded border px-2 py-2 ${resolved.qualityMode === 'fragment' ? 'border-violet-300 bg-violet-950/45 text-violet-50' : 'border-violet-900/50 bg-black/25 text-violet-100/70 hover:bg-violet-950/20'}`}>Fragment-Slice</button>
                </div>
                <div className="rounded border border-neutral-800 bg-neutral-950/45 px-2 py-1 text-[10px] text-neutral-400" title="Basis glättet, Fragment hält Kanten. Bei aktivem Vorhören testet die Pitch-Bahn verschiedene Tonhöhen.">
                  Hover: Details · Qualität {resolved.qualityMode === 'fragment' ? 'Fragment' : 'Basis'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
