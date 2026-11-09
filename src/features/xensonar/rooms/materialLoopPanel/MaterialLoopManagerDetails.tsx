import type { MaterialEntry } from '../../../l3lab/materialLibrary';
import {
  formatRootFollowGranularDensityIndex,
  formatRootFollowGranularPowerLabel,
  formatRootFollowGranularPresetLabel,
  type RootFollowGranularSettings,
} from '../../rootFollow/rootFollowGranularSettings';
import {
  formatRootFollowImpulseRasterBeatRatioSummary,
  formatRootFollowImpulseRasterClockModeLabel,
  type RootFollowImpulseRasterClockMode,
} from '../../rootFollow/rootFollowImpulseRasterPolicy';
import { RootFollowImpulseRasterControls } from './RootFollowImpulseRasterControls';
import {
  HotkeyModeControls,
  TimeModeSelect,
} from './materialLoopPanelControls';
import type {
  MaterialLoopTimeMode,
  ResonanceHotkeyMode,
} from './materialLoopPanelTypes';

function describeInterpretation(mode: MaterialLoopTimeMode) {
  return mode === 'normal' ? 'Normal' : mode === 'double' ? 'Double Time' : 'Half Time';
}

export function MaterialManagerDetails(props: {
  materialLoopActive: boolean;
  materialLoopSyncToBeat: boolean;
  materialLoopTimeMode: MaterialLoopTimeMode;
  resonanceHotkeyMode: ResonanceHotkeyMode;
  selectedLoopMaterial: MaterialEntry | null;
  effectiveLoopMyzelGroupLabel: string;
  materialLoopUiStatus: string;
  quantizeBpm: number;
  referenceBpm: number;
  formatMaterialLoopBars: (bars: number | null | undefined) => string;
  getEffectiveMaterialLoopBars: (entry: { bars: number } | null, mode: MaterialLoopTimeMode) => number;
  onMaterialLoopActiveChange: (value: boolean) => void;
  onMaterialLoopSyncToBeatChange: (value: boolean) => void;
  onMaterialLoopTimeModeChange: (value: MaterialLoopTimeMode) => void;
  onResonanceHotkeyModeChange: (value: ResonanceHotkeyMode) => void;
}) {
  const interpretedModeLabel = describeInterpretation(props.materialLoopTimeMode);
  return (
    <div className="rounded border border-cyan-900/50 bg-cyan-950/10 p-3 space-y-3">
      <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/75">Materialspur Steuerung</div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 font-semibold">
        <input type="checkbox" checked={props.materialLoopActive} onChange={(event) => props.onMaterialLoopActiveChange(event.target.checked)} />
        Materialspur Aktiv
      </label>
      <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
        <input type="checkbox" checked={props.materialLoopSyncToBeat} onChange={(event) => props.onMaterialLoopSyncToBeatChange(event.target.checked)} />
        am Taktstart an Beat koppeln
      </label>
      <TimeModeSelect label="Takt-Interpretation" value={props.materialLoopTimeMode} onChange={props.onMaterialLoopTimeModeChange} />
      <HotkeyModeControls resonanceHotkeyMode={props.resonanceHotkeyMode} onResonanceHotkeyModeChange={props.onResonanceHotkeyModeChange} />
      <div className="rounded border border-neutral-800 bg-neutral-950/70 p-2 text-[11px] leading-relaxed text-neutral-500">
        <div>Interpretation: <span className="text-cyan-300">{interpretedModeLabel}</span> · wirksam {props.formatMaterialLoopBars(props.getEffectiveMaterialLoopBars(props.selectedLoopMaterial, props.materialLoopTimeMode))} Takte bei {Math.round(props.quantizeBpm || props.referenceBpm)} BPM</div>
        <div className="mt-1">Myzel Gruppe: <span className="text-cyan-300">{props.effectiveLoopMyzelGroupLabel}</span></div>
        {props.materialLoopUiStatus ? <div className="mt-1 text-cyan-200/80">{props.materialLoopUiStatus}</div> : null}
      </div>
    </div>
  );
}

export function RootFollowManagerTools(props: {
  rootFollowGranularSettings: RootFollowGranularSettings;
  resonanceHotkeyMode: ResonanceHotkeyMode;
  onOpenGranularManager: () => void;
  onResonanceHotkeyModeChange: (value: ResonanceHotkeyMode) => void;
}) {
  const densityIndex = formatRootFollowGranularDensityIndex(props.rootFollowGranularSettings);
  return (
    <div className="space-y-3">
      <button type="button" onClick={props.onOpenGranularManager} className="flex w-full items-center justify-between gap-2 rounded border border-violet-700/70 bg-violet-950/25 px-3 py-2 text-left text-sm text-violet-50 hover:bg-violet-950/35">
        <span className="inline-flex items-center gap-2"><span aria-hidden="true">🪭</span><span>Granular Manager</span></span>
        <span className="text-[11px] text-violet-100/65">{formatRootFollowGranularPresetLabel(props.rootFollowGranularSettings)} · {formatRootFollowGranularPowerLabel(props.rootFollowGranularSettings.powerMode)} · Dichte {densityIndex}</span>
      </button>
      <HotkeyModeControls resonanceHotkeyMode={props.resonanceHotkeyMode} onResonanceHotkeyModeChange={props.onResonanceHotkeyModeChange} />
    </div>
  );
}

export function RootFollowManagerDetails(props: {
  rootFollowLoopActive: boolean;
  rootFollowLoopTimeMode: MaterialLoopTimeMode;
  rootFollowImpulsRasterEvery: number;
  rootFollowImpulsRasterCycleDiv: number;
  rootFollowImpulsRasterClockMode: RootFollowImpulseRasterClockMode;
  rootFollowImpulsRasterPattern: number[];
  rootFollowPreviewActive: boolean;
  selectedRootFollowLoop: MaterialEntry | null;
  managedRootFollowLoopMaterial: MaterialEntry | null;
  rootFollowLoopUiStatus: string;
  rootFollowGranularSettings: RootFollowGranularSettings;
  quantizeBpm: number;
  referenceBpm: number;
  formatMaterialLoopBars: (bars: number | null | undefined) => string;
  getEffectiveMaterialLoopBars: (entry: { bars: number } | null, mode: MaterialLoopTimeMode) => number;
  onRootFollowLoopActiveChange: (value: boolean) => void;
  onRootFollowLoopTimeModeChange: (value: MaterialLoopTimeMode) => void;
  onRootFollowImpulsRasterCycleDivChange: (value: number) => void;
  onRootFollowImpulsRasterEveryChange: (value: number) => void;
  onRootFollowImpulsRasterPatternChange: (value: number[]) => void;
  onRootFollowImpulsRasterClockModeChange: (value: RootFollowImpulseRasterClockMode) => void;
  onRootFollowPreviewToggle: () => void;
}) {
  const modeLabel = describeInterpretation(props.rootFollowLoopTimeMode);
  const densityIndex = formatRootFollowGranularDensityIndex(props.rootFollowGranularSettings);
  const granulationLabel = `${formatRootFollowGranularPresetLabel(props.rootFollowGranularSettings)} · ${formatRootFollowGranularPowerLabel(props.rootFollowGranularSettings.powerMode)} · ${props.rootFollowGranularSettings.windowMs}/${props.rootFollowGranularSettings.stepMs} ms`;
  const impulseSummary = formatRootFollowImpulseRasterBeatRatioSummary({
    cycleDiv: props.rootFollowImpulsRasterCycleDiv,
    counterDiv: props.rootFollowImpulsRasterEvery,
    pattern: props.rootFollowImpulsRasterPattern,
    clockMode: props.rootFollowImpulsRasterClockMode,
  });
  const hoverSummary = `Interpretation: ${modeLabel} · Impulsraster: ${impulseSummary} · Lesart: ${formatRootFollowImpulseRasterClockModeLabel(props.rootFollowImpulsRasterClockMode)} · Klangcharakter: ${granulationLabel} · wirksam ${props.formatMaterialLoopBars(props.getEffectiveMaterialLoopBars(props.selectedRootFollowLoop, props.rootFollowLoopTimeMode))} Takte bei ${Math.round(props.quantizeBpm || props.referenceBpm)} BPM`;
  return (
    <div className="min-w-0 max-w-full rounded border border-violet-900/50 bg-violet-950/10 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2"><div className="text-[10px] uppercase tracking-[0.25em] text-violet-200/75">Root Follow Steuerung</div><button type="button" onClick={props.onRootFollowPreviewToggle} disabled={!props.managedRootFollowLoopMaterial && !props.selectedRootFollowLoop} className={`rounded border px-2.5 py-1 text-xs transition ${props.rootFollowPreviewActive ? 'border-amber-400/80 bg-amber-950/35 text-amber-100 hover:bg-amber-900/35' : 'border-violet-600/80 bg-violet-900/30 text-violet-50 hover:bg-violet-800/35'} disabled:cursor-not-allowed disabled:border-violet-950/70 disabled:bg-black/20 disabled:text-violet-100/30`} data-xensonar-root-follow-preview-button="true" aria-pressed={props.rootFollowPreviewActive} title="Root-Follow-Fenster mit aktuellem Takt-/Impulsraster vorhören">{props.rootFollowPreviewActive ? 'Stopp' : 'Vorhören'}</button></div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-violet-100 font-semibold"><input type="checkbox" checked={props.rootFollowLoopActive} onChange={(event) => props.onRootFollowLoopActiveChange(event.target.checked)} />Root Follow Loop Aktiv</label>
      <div className="grid gap-2">
        <TimeModeSelect label="Takt-Interpretation" value={props.rootFollowLoopTimeMode} onChange={props.onRootFollowLoopTimeModeChange} tone="violet" />
        <RootFollowImpulseRasterControls cycleDiv={props.rootFollowImpulsRasterCycleDiv} counterDiv={props.rootFollowImpulsRasterEvery} pattern={props.rootFollowImpulsRasterPattern} clockMode={props.rootFollowImpulsRasterClockMode} onCycleDivChange={props.onRootFollowImpulsRasterCycleDivChange} onCounterDivChange={props.onRootFollowImpulsRasterEveryChange} onPatternChange={props.onRootFollowImpulsRasterPatternChange} onClockModeChange={props.onRootFollowImpulsRasterClockModeChange} />
      </div>
      <div className="rounded border border-violet-900/50 bg-black/25 p-2 text-[11px] leading-relaxed text-violet-100/70" title={hoverSummary} data-xensonar-rfl-detail-summary="hover-compact">
        <div className="truncate">Status · <span className="text-violet-300">{modeLabel}</span> ·<span className="text-violet-300"> {props.rootFollowImpulsRasterCycleDiv}:{props.rootFollowImpulsRasterEvery}</span> ·<span className="text-violet-300"> {formatRootFollowImpulseRasterClockModeLabel(props.rootFollowImpulsRasterClockMode)}</span> ·<span className="text-violet-300"> Dichte {densityIndex}</span></div>
        {props.rootFollowLoopUiStatus ? <div className="mt-1 truncate text-violet-200/80">{props.rootFollowLoopUiStatus}</div> : null}
      </div>
    </div>
  );
}
