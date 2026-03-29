import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useStore } from '../state/store';
import type { HarmonizerType, WaveformMix } from '../state/store';
import type { ColorMapName } from '../utils/colorMap';
import { audioEngine } from '../audio/AudioEngine';


const blurRangeOnPointerUp = (e: ReactPointerEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

const rangeInputProps = {
  tabIndex: -1,
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

export default function HarmonizerPanel() {
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

  const [expandedSection, setExpandedSection] = useState<string | null>('waveform');

  const toggleSection = (s: string) => setExpandedSection(prev => prev === s ? null : s);

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

  const synthModes: { id: 'additive' | 'ifft' | 'granular' | 'glyph'; label: string; desc: string }[] = [
    { id: 'additive', label: 'Additiv', desc: 'Sinus-Oszillatoren' },
    { id: 'ifft', label: 'IFFT', desc: 'Inverse FFT' },
    { id: 'granular', label: 'Granular', desc: 'Korn-Synthese' },
    { id: 'glyph', label: 'Glyph', desc: 'Linien-/Ereignisleser' },
  ];

  const handleWaveformChange = (key: keyof WaveformMix, value: number) => {
    setWaveformMix({ [key]: value });
    audioEngine.invalidateBuffer();
  };

  const handleWaveformPreset = (mix: WaveformMix) => {
    setWaveformMix(mix);
    audioEngine.invalidateBuffer();
  };

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 flex flex-col overflow-y-auto text-xs">
      {/* Undo/Redo + Clear */}
      <div className="p-2 border-b border-gray-800 flex gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="flex-1 h-7 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
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
          title="Alles löschen"
        >
          🗑️
        </button>
      </div>

      {/* Waveform Mix */}
      <div className="p-2 border-b border-gray-800">
        <button
          onClick={() => toggleSection('waveform')}
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

      {/* Synth Mode */}
      <div className="p-2 border-b border-gray-800">
        <div className="text-gray-500 font-semibold mb-1.5">⚙️ Render-Modus</div>
        <div className="flex flex-col gap-1">
          {synthModes.map(m => (
            <button
              key={m.id}
              onClick={() => { setSynthMode(m.id); audioEngine.invalidateBuffer(); }}
              className={`h-8 rounded text-xs font-medium transition-colors flex items-center justify-between px-2
                ${synthMode === m.id
                  ? m.id === 'granular'
                    ? 'bg-cyan-700 text-white ring-1 ring-cyan-400'
                    : 'bg-green-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              <span>{m.label}</span>
              <span className="text-[10px] opacity-60">{m.desc}</span>
            </button>
          ))}
        </div>

        {/* Grain layer toggle */}
        <div className="mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showGrainLayer}
              onChange={e => setShowGrainLayer(e.target.checked)}
              className="accent-cyan-500"
            />
            <span className="text-gray-400">
              🌾 Körnung-Ebene anzeigen
            </span>
          </label>
          {(showGrainLayer || synthMode === 'granular') && (
            <div className="mt-1.5 text-[10px] text-gray-500 leading-relaxed bg-gray-800/50 p-1.5 rounded">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span>Kurz = Rauschen/Clicks</span>
              </div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
                <span>Mittel = Textur</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
                <span>Lang = Tonal/Smooth</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Map */}
      <div className="p-2 border-b border-gray-800">
        <div className="text-gray-500 font-semibold mb-1.5">🎨 Farbpalette</div>
        <div className="flex flex-col gap-1">
          {colorMapOptions.map(cm => (
            <button
              key={cm.id}
              onClick={() => setColorMapName(cm.id)}
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
