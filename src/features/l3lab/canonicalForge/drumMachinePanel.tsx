import type { MouseEventHandler, RefObject } from 'react';
import type { DrumViewportState, DrumVoiceId } from './loopDrumDomain';
import { DRUM_LANE_COLORS, DRUM_LANE_LABELS } from './loopDrumDomain';
import { DrumViewportNavigator } from './miniMapPanels';
import type { DrumLaneKitOverrides } from '../../xensonar/groove/drumKitRoutingTypes';
import type { DrumLaneChokeGroup, DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';

type LabeledOption = {
  value: string;
  label: string;
};

type DrumMachinePanelProps = {
  drumPatternOptions: readonly LabeledOption[];
  drumKitOptions: readonly LabeledOption[];
  drumPatternValue: string;
  drumKitValue: string;
  barsValue: number;
  segmentsPerBarValue: number;
  gridModeLabel: string;
  hitCount: number;
  stepCount: number;
  viewport: DrumViewportState;
  visiblePercent: number;
  drumCanvasWidth: number;
  drumViewportWrapperRef: RefObject<HTMLDivElement | null>;
  drumCanvasRef: RefObject<HTMLCanvasElement | null>;
  drumNavigatorRef: RefObject<HTMLDivElement | null>;
  drumNavigatorHitRatios: number[];
  selectedLaneId: DrumVoiceId;
  laneKitOverrides: DrumLaneKitOverrides;
  laneSettings: DrumLaneSettingsMap;
  onDrumPatternChange: (value: string) => void;
  onSelectLane: (laneId: DrumVoiceId) => void;
  onDrumKitChange: (value: string) => void;
  onLaneKitChange: (laneId: DrumVoiceId, value: string) => void;
  onLaneLevelChange: (laneId: DrumVoiceId, value: number) => void;
  onLaneDecayChange: (laneId: DrumVoiceId, value: number) => void;
  onLanePanChange: (laneId: DrumVoiceId, value: number) => void;
  onLaneChokeGroupChange: (laneId: DrumVoiceId, value: DrumLaneChokeGroup) => void;
  onBarsChange: (value: number) => void;
  onSegmentsPerBarChange: (value: number) => void;
  onResetToPreset: () => void;
  onRandomize: () => void;
  onClear: () => void;
  onPreview: () => void;
  onStopPreview: () => void;
  onSendToXensonar: () => void;
  onCanvasMouseDown: MouseEventHandler<HTMLCanvasElement>;
  onStartNavigatorDrag: (mode: 'pan' | 'start' | 'end', clientX: number) => void;
  onResetViewport: () => void;
};

const LANE_ORDER: DrumVoiceId[] = ['kick', 'snare', 'hatClosed', 'hatOpen', 'clap', 'perc'];

export function DrumMachinePanel({
  drumPatternOptions,
  drumKitOptions,
  drumPatternValue,
  drumKitValue,
  barsValue,
  segmentsPerBarValue,
  gridModeLabel,
  hitCount,
  stepCount,
  viewport,
  visiblePercent,
  drumCanvasWidth,
  drumViewportWrapperRef,
  drumCanvasRef,
  drumNavigatorRef,
  drumNavigatorHitRatios,
  selectedLaneId,
  laneKitOverrides,
  laneSettings,
  onDrumPatternChange,
  onSelectLane,
  onDrumKitChange,
  onLaneKitChange,
  onLaneLevelChange,
  onLaneDecayChange,
  onLanePanChange,
  onLaneChokeGroupChange,
  onBarsChange,
  onSegmentsPerBarChange,
  onResetToPreset,
  onRandomize,
  onClear,
  onPreview,
  onStopPreview,
  onSendToXensonar,
  onCanvasMouseDown,
  onStartNavigatorDrag,
  onResetViewport,
}: DrumMachinePanelProps) {
  const selectedLaneSettings = laneSettings[selectedLaneId];
  const selectedLaneKit = laneKitOverrides[selectedLaneId] ?? '';

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded border border-neutral-800 bg-black/40 p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_8rem_10rem_12rem]">
          <label className="space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.18em] text-neutral-500">Drum Pattern</span>
            <select value={drumPatternValue} onChange={(e) => onDrumPatternChange(e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">
              {drumPatternOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.18em] text-neutral-500">Drum Grundkit</span>
            <select value={drumKitValue} onChange={(e) => onDrumKitChange(e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">
              {drumKitOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.18em] text-neutral-500">Takte</span>
            <input type="number" min={1} max={16} value={barsValue} onChange={(e) => onBarsChange(Number(e.target.value))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" />
          </label>
          <label className="space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.18em] text-neutral-500">Segmente/Takt</span>
            <input type="number" min={1} max={32} value={segmentsPerBarValue} onChange={(e) => onSegmentsPerBarChange(Number(e.target.value))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" />
          </label>
          <div className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-300">
            <div>{gridModeLabel}</div>
            <div className="text-[11px] text-neutral-500">{hitCount} Hits · {stepCount} Slots</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={onResetToPreset} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Zum Preset zurück</button>
          <button type="button" onClick={onRandomize} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Random</button>
          <button type="button" onClick={onClear} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Leeren</button>
          <button type="button" onClick={onPreview} className="rounded border border-violet-700/70 px-3 py-2 text-violet-100 hover:bg-violet-950/30">Hören (Loop)</button>
          <button type="button" onClick={onStopPreview} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Stopp</button>
          <button type="button" onClick={onSendToXensonar} className="rounded border border-cyan-700/70 px-3 py-2 text-cyan-100 hover:bg-cyan-950/30">An Xensonar senden</button>
          <div className="ml-auto self-center text-[11px] text-neutral-500">Links Spur wählen, rechts pro Spur Klangkörper, Pegel, Decay, Pan und Choke setzen.</div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_22rem]">
          <div className="space-y-3">
            <div className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">Spuren / Inspector öffnen</div>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-2">
                {LANE_ORDER.map((laneId) => {
                  const active = laneId === selectedLaneId;
                  const color = DRUM_LANE_COLORS[laneId];
                  const laneKitLabel = drumKitOptions.find((entry) => entry.value === laneKitOverrides[laneId])?.label ?? 'wie Grundkit';
                  return (
                    <button
                      key={laneId}
                      type="button"
                      onClick={() => onSelectLane(laneId)}
                      className={`rounded border px-3 py-2 text-left transition ${active ? 'border-neutral-200 bg-neutral-800 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]' : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-850'}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span>{DRUM_LANE_LABELS[laneId]}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">{laneKitLabel}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={drumViewportWrapperRef} className="space-y-3 rounded border border-neutral-800 bg-black p-2">
              <canvas ref={drumCanvasRef} width={drumCanvasWidth} height={282} onMouseDown={onCanvasMouseDown} onContextMenu={(e) => e.preventDefault()} className="block w-full bg-black" style={{ height: '282px' }} />
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  <span>Viewport / Zoom</span>
                  <span>{visiblePercent}% sichtbar</span>
                </div>
                <DrumViewportNavigator
                  navigatorRef={drumNavigatorRef}
                  hitRatios={drumNavigatorHitRatios}
                  viewport={viewport}
                  onStartDrag={onStartNavigatorDrag}
                  onReset={onResetViewport}
                />
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Mausrad / 2-Finger-Zoom hier aktiv. Shift+Rad verschiebt horizontal.</span>
                  <button type="button" onClick={onResetViewport} className="rounded border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-900">Ganz zeigen</button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded border border-neutral-800 bg-neutral-950/70 p-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Lane Inspector</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-100">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DRUM_LANE_COLORS[selectedLaneId] }} />
                <span>{DRUM_LANE_LABELS[selectedLaneId]}</span>
              </div>
            </div>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="uppercase tracking-[0.18em] text-neutral-500">Soundquelle</span>
              <select value={selectedLaneKit} onChange={(e) => onLaneKitChange(selectedLaneId, e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">
                <option value="">wie Grundkit</option>
                {drumKitOptions.map((entry) => (
                  <option key={`${selectedLaneId}-${entry.value}`} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="flex items-center justify-between uppercase tracking-[0.18em] text-neutral-500"><span>Pegel</span><span>{selectedLaneSettings.level.toFixed(2)}</span></span>
              <input type="range" min={0} max={2} step={0.01} value={selectedLaneSettings.level} onChange={(e) => onLaneLevelChange(selectedLaneId, Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="flex items-center justify-between uppercase tracking-[0.18em] text-neutral-500"><span>Decay</span><span>{selectedLaneSettings.decay.toFixed(2)}×</span></span>
              <input type="range" min={0.25} max={2} step={0.01} value={selectedLaneSettings.decay} onChange={(e) => onLaneDecayChange(selectedLaneId, Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="flex items-center justify-between uppercase tracking-[0.18em] text-neutral-500"><span>Pan</span><span>{selectedLaneSettings.pan.toFixed(2)}</span></span>
              <input type="range" min={-1} max={1} step={0.01} value={selectedLaneSettings.pan} onChange={(e) => onLanePanChange(selectedLaneId, Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="uppercase tracking-[0.18em] text-neutral-500">Choke</span>
              <select value={selectedLaneSettings.chokeGroup} onChange={(e) => onLaneChokeGroupChange(selectedLaneId, e.target.value as DrumLaneChokeGroup)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">
                <option value="none">kein Choke</option>
                <option value="hat">HiHat-Gruppe</option>
              </select>
            </label>
            <div className="rounded border border-neutral-800 bg-black/40 px-3 py-2 text-[11px] leading-relaxed text-neutral-500">
              Diese Werte greifen in der Forge-Vorschau und werden beim Export mitgespeichert. Das globale Kit bleibt der Grundkörper; pro Spur kannst du davon abweichen.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
