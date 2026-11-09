import { DonorHearingButton } from './harmonizerPanel/DonorHearingButton';
import { DonorProofStrip, type DonorProofSelection } from './harmonizerPanel/DonorProofStrip';
import { useEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useStore } from '../state/store';
import type { HarmonizerType, WaveformMix } from '../state/store';
import type { ColorMapName } from '../utils/colorMap';
import { audioEngine } from '../audio/AudioEngine';
import { resolveCarrierIntegralMachine } from '../integral';
import { machineUi } from './carrierIntegralVerwalten/carrierIntegralMachineUi';
import { SPECTRAL_FORGE_BASIS_HEARING_OPTIONS } from './harmonizerPanel/spectralForgeBasisHearingModes';
import { DirectRendererReferencePanel } from './harmonizerPanel/DirectRendererReferencePanel';
import { useBasisHearingAudition } from './harmonizerPanel/useBasisHearingAudition';


const blurRangeOnPointerUp = (e: ReactPointerEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

const rangeInputProps = {
  onPointerUp: blurRangeOnPointerUp,
  onMouseUp: (e: ReactMouseEvent<HTMLInputElement>) => e.currentTarget.blur(),
};

const waveformPresets: { label: string; mix: WaveformMix }[] = [
  { label: '∿ Sinus', mix: { sine: 1, sawtooth: 0, square: 0, triangle: 0 } },
  { label: '⩘ Sägezahn', mix: { sine: 0, sawtooth: 1, square: 0, triangle: 0 } },
  { label: '⊓ Rechteck', mix: { sine: 0, sawtooth: 0, square: 1, triangle: 0 } },
  { label: '△ Dreieck', mix: { sine: 0, sawtooth: 0, square: 0, triangle: 1 } },
  { label: '🎛️ Warm', mix: { sine: 0.6, sawtooth: 0.3, square: 0, triangle: 0.1 } },
  { label: '🔔 Voll', mix: { sine: 0.25, sawtooth: 0.25, square: 0.25, triangle: 0.25 } },
];

type DonorHearingProps = {
  donorReady?: boolean;
  donorProofReady?: boolean;
  donorSelected?: boolean;
  donorPhase?: 'idle' | 'rendering' | 'playing' | 'error';
  donorError?: string | null;
  onDonorPreview?: () => void;
  onOtherHearing?: () => void;
  donorProofActive?: DonorProofSelection | null;
  donorSimilarity?: number;
  donorEventCount?: number;
  onDonorProof?: (kind: DonorProofSelection) => void;
};
export default function HarmonizerPanel({ donorReady = false, donorProofReady = false, donorSelected = false, donorPhase = 'idle', donorError, onDonorPreview, onOtherHearing, donorProofActive = null, donorSimilarity, donorEventCount, onDonorProof }: DonorHearingProps) {
  const applyHarmonizer = useStore(s => s.applyHarmonizer);
  const synthMode = useStore(s => s.synthMode);
  const setSynthMode = useStore(s => s.setSynthMode);
  const colorMapName = useStore(s => s.colorMapName);
  const setColorMapName = useStore(s => s.setColorMapName);
  const clearCanvas = useStore(s => s.clearCanvas);
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const undoStack = useStore(s => s.undoStack);
  const redoStack = useStore(s => s.redoStack);
  const sourceAssetContext = useStore(s => s.sourceAssetContext);
  const resetForgeMainPath = useStore(s => s.resetForgeMainPath);
  const waveformMix = useStore(s => s.waveformMix);
  const setWaveformMix = useStore(s => s.setWaveformMix);
  const showGrainLayer = useStore(s => s.showGrainLayer);
  const setShowGrainLayer = useStore(s => s.setShowGrainLayer);

  const [overtoneCount, setOvertoneCount] = useState(6);
  const [overtoneDecay, setOvertoneDecay] = useState(0.5);
  const [intervalSemitones, setIntervalSemitones] = useState(7);
  const [intervalAmount, setIntervalAmount] = useState(0.7);
  const [inharmonicPartials, setInharmonicPartials] = useState(5);
  const [inharmonicSpread, setInharmonicSpread] = useState(1.4);
  const [blurRadius, setBlurRadius] = useState(3);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggleSection = (section: string) => setExpandedSection(prev => prev === section ? null : section);
  const {
    cancelPendingAudition,
    selectAndPreviewHearingOption,
    resolveOptionUi,
  } = useBasisHearingAudition();

  useEffect(() => {
    if (donorPhase === 'rendering') cancelPendingAudition(false);
  }, [donorPhase, cancelPendingAudition]);

  const harmonizers: { type: HarmonizerType; label: string; icon: string; params: Record<string, number> }[] = [
    {
      type: 'overtones',
      label: 'Obertöne',
      icon: '🔔',
      params: { harmonics: overtoneCount, decay: overtoneDecay },
    },
    {
      type: 'intervals',
      label: 'Intervall',
      icon: '🎼',
      params: { semitones: intervalSemitones, amount: intervalAmount },
    },
    {
      type: 'inharmonic',
      label: 'Inharmonisch',
      icon: '🔩',
      params: { partials: inharmonicPartials, spread: inharmonicSpread, decay: overtoneDecay },
    },
    {
      type: 'spectralBlur',
      label: 'Spectral Blur',
      icon: '🌫️',
      params: { radius: blurRadius },
    },
  ];

  const colorMapOptions: { id: ColorMapName; label: string }[] = [
    { id: 'magma', label: '🟣 Magma' },
    { id: 'hot', label: '🔥 Hot' },
    { id: 'ice', label: '🧊 Ice' },
    { id: 'phosphor', label: '💚 Phosphor' },
    { id: 'rainbow', label: '🌈 Rainbow' },
  ];



  const handleWaveformChange = (key: keyof WaveformMix, value: number) => {
    setWaveformMix({ [key]: value });
    audioEngine.invalidateBuffer();
  };

  const handleWaveformPreset = (mix: WaveformMix) => {
    setWaveformMix(mix);
    audioEngine.invalidateBuffer();
  };

  const undoLabel = sourceAssetContext === 'forge3_main' ? 'Undo: Hauptpfad' : 'Undo: Werkbank';
  const trashLabel = 'Werkbank leeren';

  return (
    <div className="w-56 shrink-0 bg-gray-950 border-l border-gray-700 flex flex-col overflow-y-auto text-xs [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300 [&_input:focus-visible]:outline [&_input:focus-visible]:outline-cyan-300" aria-label="Hörweisen und Klanggestaltung">
      {/* Undo/Redo + Clear */}
      <div className="p-2 border-b border-gray-800 flex gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="flex-1 h-7 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300"
          title={`${undoLabel} (Ctrl+Z)`}
        >
          ↶ {sourceAssetContext === 'forge3_main' ? 'Hauptpfad' : 'Werkbank'}
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="flex-1 h-7 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
        <button
          onClick={clearCanvas}
          className="h-7 px-2 rounded bg-red-900/50 hover:bg-red-800 text-red-300"
          aria-label="Werkbank leeren"
          title="Werkbank leeren"
        >
          🗑️
        </button>
        <button
          onClick={resetForgeMainPath}
          className="h-7 px-2 rounded bg-amber-900/50 hover:bg-amber-800 text-amber-200"
          aria-label="Forge-Hauptpfad zurücksetzen"
          title="Forge-Hauptpfad zurücksetzen"
        >
          ⟲
        </button>
      </div>

      <div className="px-2 pb-2 flex flex-wrap gap-1 border-b border-gray-800">
        <span className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400">{undoLabel}</span>
        <span className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400">Papierkorb: {trashLabel}</span>
        {sourceAssetContext === 'forge3_main' ? (
          <span className="rounded border border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-200">Reset: Forge-Hauptpfad</span>
        ) : null}
        {sourceAssetContext === 'forge3_main' ? (
          <span className="rounded border border-fuchsia-500/40 px-2 py-0.5 text-[10px] text-fuchsia-300">Forge-Quelle aktiv</span>
        ) : null}
      </div>

      {/* Carrier Hearing Modes */}
      <div
        className="p-2 border-b border-gray-800"
        data-spectral-forge-basis-hearing-modes="carrier-integral"
      >
        <h2 className="font-semibold text-fuchsia-100">Hörweisen</h2>
        <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">Eine Figur, verschiedene Klangkörper. Antippen zum Hören.</p>
          <div className="mt-2 rounded-lg border border-fuchsia-900/35 bg-black/20 p-2">
            <div className="grid grid-cols-1 gap-1">
              {SPECTRAL_FORGE_BASIS_HEARING_OPTIONS.map(option => {
                const machine = resolveCarrierIntegralMachine(option.machineId);
                const ui = machineUi(option.machineId);
                const title = option.summary
                  ? `${option.label} · ${option.summary}`
                  : `${machine.label} · ${machine.summary}`;
                const { visuallyActive: basisActive, pending, statusLabel, progressPercent, phase } = resolveOptionUi(option);
                const visuallyActive = basisActive && !donorSelected && donorPhase !== 'rendering' && donorPhase !== 'playing';
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => { onOtherHearing?.(); selectAndPreviewHearingOption(option); }}
                    aria-pressed={visuallyActive}
                    aria-label={`${option.label}: ${statusLabel}`}
                    className={`min-h-10 rounded-lg border px-2 py-2 text-left transition ${visuallyActive ? ui.active : 'border-neutral-800 bg-gray-900/80 text-gray-300 hover:border-neutral-500/70 hover:bg-gray-800/70'} ${pending ? 'ring-1 ring-lime-300/45' : ''}`}
                    title={title}
                    data-spectral-forge-basis-hearing-mode={option.machineId}
                    data-spectral-forge-basis-hearing-option={option.id}
                    data-spectral-forge-basis-hearing-profile={option.harmonicXploreProfileId ?? ''}
                    data-spectral-forge-basis-hearing-active={visuallyActive ? 'true' : 'false'}
                    data-spectral-forge-basis-hearing-phase={phase}
                    data-spectral-forge-basis-hearing-progress={progressPercent}
                    data-spectral-forge-basis-hearing-click-previews="true"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] ${ui.chip}`}>{ui.glyph}</span>
                        <span className="text-[11px] font-semibold text-neutral-100">{option.label}</span>
                      </span>
                      <span className={`text-[10px] ${pending ? 'text-lime-200' : 'text-neutral-500'}`}>{statusLabel}</span>
                    </div>
                  </button>
                );
              })}
              <DonorHearingButton
                ready={donorReady}
                selected={donorSelected}
                phase={donorPhase}
                error={donorError}
                onPreview={onDonorPreview ? () => { cancelPendingAudition(); onDonorPreview(); } : undefined}
              />
              <DonorProofStrip ready={donorProofReady} active={donorProofActive} similarity={donorSimilarity} eventCount={donorEventCount} onSelect={onDonorProof} />
            </div>
          </div>
      </div>

      {/* Waveform Mix */}
      <div className="p-2 border-b border-gray-800">
        <button
          onClick={() => toggleSection('waveform')}
          aria-expanded={expandedSection === 'waveform'}
          className="text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1"
        >
          <span className={`transition-transform ${expandedSection === 'waveform' ? 'rotate-90' : ''}`}>▶</span>
          🔊 Wellenform
        </button>

        {expandedSection === 'waveform' && (
          <div className="flex flex-col gap-2 mt-2">
            {/* Presets */}
            <div className="flex flex-wrap gap-1">
              {waveformPresets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleWaveformPreset(p.mix)}
                  className="h-6 px-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px]"
                  title={p.label}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <label className="flex items-center gap-1">
              <span className="text-gray-500 w-12">Sinus</span>
              <input type="range" min={0} max={1} step={0.05} value={waveformMix.sine}
                onChange={e => handleWaveformChange('sine', Number(e.target.value))}
                className="flex-1 accent-blue-400" {...rangeInputProps} />
              <span className="w-8 text-gray-400 font-mono text-right">{(waveformMix.sine * 100).toFixed(0)}%</span>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-gray-500 w-12">Säge</span>
              <input type="range" min={0} max={1} step={0.05} value={waveformMix.sawtooth}
                onChange={e => handleWaveformChange('sawtooth', Number(e.target.value))}
                className="flex-1 accent-orange-400" {...rangeInputProps} />
              <span className="w-8 text-gray-400 font-mono text-right">{(waveformMix.sawtooth * 100).toFixed(0)}%</span>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-gray-500 w-12">Rechteck</span>
              <input type="range" min={0} max={1} step={0.05} value={waveformMix.square}
                onChange={e => handleWaveformChange('square', Number(e.target.value))}
                className="flex-1 accent-green-400" {...rangeInputProps} />
              <span className="w-8 text-gray-400 font-mono text-right">{(waveformMix.square * 100).toFixed(0)}%</span>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-gray-500 w-12">Dreieck</span>
              <input type="range" min={0} max={1} step={0.05} value={waveformMix.triangle}
                onChange={e => handleWaveformChange('triangle', Number(e.target.value))}
                className="flex-1 accent-pink-400" {...rangeInputProps} />
              <span className="w-8 text-gray-400 font-mono text-right">{(waveformMix.triangle * 100).toFixed(0)}%</span>
            </label>
          </div>
        )}
      </div>

      <DirectRendererReferencePanel
        expanded={expandedSection === 'legacy-renderer'}
        onToggle={() => toggleSection('legacy-renderer')}
        synthMode={synthMode}
        setSynthMode={setSynthMode}
        showGrainLayer={showGrainLayer}
        setShowGrainLayer={setShowGrainLayer}
      />

      {/* Color Map */}
      <div className="p-2 border-b border-gray-800">
        <div className="text-gray-500 font-semibold mb-1.5">🎨 Farbpalette</div>
        <div className="flex flex-col gap-1">
          {colorMapOptions.map(cm => (
            <button
              key={cm.id}
              onClick={() => setColorMapName(cm.id)}
              aria-pressed={colorMapName === cm.id}
              className={`h-6 rounded text-left px-2 transition-colors
                ${colorMapName === cm.id
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {cm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Harmonizers */}
      <div className="p-2 border-b border-gray-800">
        <button
          onClick={() => toggleSection('harmonizer')}
          aria-expanded={expandedSection === 'harmonizer'}
          className="text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1"
        >
          <span className={`transition-transform ${expandedSection === 'harmonizer' ? 'rotate-90' : ''}`}>▶</span>
          🎵 Material-Operatoren
        </button>

        {expandedSection === 'harmonizer' && (
          <div className="flex flex-col gap-2 mt-2">
            {harmonizers.map(h => (
              <div key={h.type} className="bg-gray-800/50 rounded p-2">
                <button
                  onClick={() => applyHarmonizer(h.type, h.params)}
                  className="w-full h-7 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium mb-1.5 flex items-center justify-center gap-1"
                >
                  {h.icon} {h.label} anwenden
                </button>

                {h.type === 'overtones' && (
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500 w-14">Anzahl</span>
                      <input type="range" min={1} max={16} value={overtoneCount}
                        onChange={e => setOvertoneCount(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                      <span className="w-5 text-gray-400 font-mono text-right">{overtoneCount}</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500 w-14">Decay</span>
                      <input type="range" min={0.1} max={0.95} step={0.05} value={overtoneDecay}
                        onChange={e => setOvertoneDecay(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                      <span className="w-8 text-gray-400 font-mono text-right">{(overtoneDecay * 100).toFixed(0)}%</span>
                    </label>
                  </div>
                )}

                {h.type === 'intervals' && (
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500 w-14">Halbtöne</span>
                      <input type="range" min={1} max={24} value={intervalSemitones}
                        onChange={e => setIntervalSemitones(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                      <span className="w-5 text-gray-400 font-mono text-right">{intervalSemitones}</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500 w-14">Stärke</span>
                      <input type="range" min={0.1} max={1} step={0.05} value={intervalAmount}
                        onChange={e => setIntervalAmount(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                      <span className="w-8 text-gray-400 font-mono text-right">{(intervalAmount * 100).toFixed(0)}%</span>
                    </label>
                  </div>
                )}

                {h.type === 'inharmonic' && (
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500 w-14">Partials</span>
                      <input type="range" min={2} max={12} value={inharmonicPartials}
                        onChange={e => setInharmonicPartials(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                      <span className="w-5 text-gray-400 font-mono text-right">{inharmonicPartials}</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500 w-14">Spread</span>
                      <input type="range" min={1.05} max={2.5} step={0.05} value={inharmonicSpread}
                        onChange={e => setInharmonicSpread(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                      <span className="w-8 text-gray-400 font-mono text-right">{inharmonicSpread.toFixed(2)}</span>
                    </label>
                  </div>
                )}

                {h.type === 'spectralBlur' && (
                  <label className="flex items-center gap-1">
                    <span className="text-gray-500 w-14">Radius</span>
                    <input type="range" min={1} max={10} value={blurRadius}
                      onChange={e => setBlurRadius(Number(e.target.value))}
                      className="flex-1 accent-amber-500" />
                    <span className="w-5 text-gray-400 font-mono text-right">{blurRadius}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="p-2 text-[10px] text-gray-600 leading-relaxed">
        <div className="font-semibold text-gray-500 mb-1">⌨️ Shortcuts</div>
        <div>B/H/L/A/N/S/F/T/M = Werkzeuge</div>
        <div>X = Radier-Modus</div>
        <div>T + Rechtsklick = Stempel-Presets</div>
        <div>Pfeile = Stempel X/Y stretchen</div>
        <div>Q / E = Stempel drehen</div>
        <div>G = Körnungsebene umschalten</div>
        <div>Mausrad = Zoom</div>
        <div>Shift+Rad = Nur Y-Zoom</div>
        <div>Alt+Drag = Pan</div>
        <div>Doppelklick = Vorhören</div>
        <div>Ctrl+Z / Ctrl+Y = Undo/Redo</div>
        <div>Space = Play/Stop</div>
        <div>Rechtsklick = Abbrechen</div>
      </div>
    </div>
  );
}
