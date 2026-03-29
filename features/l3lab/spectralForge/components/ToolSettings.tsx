import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useStore } from '../state/store';
import type { FormantVowel } from '../state/store';

const blurRangeOnPointerUp = (e: ReactPointerEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

const rangeInputProps = {
  tabIndex: -1,
  onPointerUp: blurRangeOnPointerUp,
  onMouseUp: (e: ReactMouseEvent<HTMLInputElement>) => e.currentTarget.blur(),
};

export default function ToolSettings() {
  const activeTool = useStore(s => s.activeTool);
  const toolSettings = useStore(s => s.toolSettings);
  const updateToolSettings = useStore(s => s.updateToolSettings);
  const stampPhase = useStore(s => s.stampPhase);
  const stampScaleX = useStore(s => s.stampScaleX);
  const stampScaleY = useStore(s => s.stampScaleY);
  const stampRotation = useStore(s => s.stampRotation);
  const stampFlipX = useStore(s => s.stampFlipX);
  const stampFlipY = useStore(s => s.stampFlipY);
  const setStampScale = useStore(s => s.setStampScale);
  const rotateStamp = useStore(s => s.rotateStamp);
  const toggleStampFlipX = useStore(s => s.toggleStampFlipX);
  const toggleStampFlipY = useStore(s => s.toggleStampFlipY);
  const resetStampTransform = useStore(s => s.resetStampTransform);
  const synthMode = useStore(s => s.synthMode);
  const showGrainLayer = useStore(s => s.showGrainLayer);
  const spectralData = useStore(s => s.spectralData);

  const showGrain = synthMode === 'granular' || showGrainLayer;
  const brushSizeMax = activeTool === 'morph' ? spectralData.height : 80;

  const toolLabel: Record<string, string> = {
    brush: '🖌️ Soft Brush',
    hardBrush: '✏️ Hard Brush',
    line: '📐 Linien-Tool',
    harmonicBrush: '🎵 Harmonic Brush',
    noiseBrush: '🌊 Noise Brush',
    spray: '💨 Spray',
    formant: '🗣️ Formant',
    stamp: '📋 Stempel',
    morph: '🌀 Verformen',
    smudge: '🫟 Wischfinger',
    dodgeBurn: toolSettings.eraseMode ? '🌘 Abdunkeln' : '☀️ Nachbelichten',
    blurSharpen: toolSettings.eraseMode ? '🪞 Schärfen' : '🪞 Weichzeichnen',
    delaySmear: '⟿ Delay Smear',
    threshold: toolSettings.eraseMode ? '🚪 Threshold öffnen' : '🚪 Threshold gate',
    sourceTrace: '🧬 Quellspur / Source Trace',
  };

  // Grain size label
  const grainLabel = (g: number) => {
    if (g < 0.2) return 'Noisy';
    if (g < 0.4) return 'Gritty';
    if (g < 0.6) return 'Neutral';
    if (g < 0.8) return 'Smooth';
    return 'Tonal';
  };

  return (
    <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center gap-6 text-xs text-gray-300 flex-wrap">
      <span className="text-purple-400 font-semibold">{toolLabel[activeTool] ?? activeTool}</span>

      {/* Erase mode indicator */}
      {toolSettings.eraseMode && (
        <span className="text-red-400 font-bold flex items-center gap-1 bg-red-900/40 px-2 py-0.5 rounded">
          ⊖ Radier-Modus
        </span>
      )}

      {/* Brush Size – always visible */}
      <label className="flex items-center gap-2">
        <span className="text-gray-500">Größe</span>
        <input
          type="range"
          min={1}
          max={brushSizeMax}
          step={1}
          value={toolSettings.brushSize}
          onChange={e => updateToolSettings({ brushSize: Number(e.target.value) })}
          className="w-24 accent-purple-500"
          {...rangeInputProps}
        />
        <span className="w-10 text-right font-mono">{toolSettings.brushSize}</span>
      </label>

      {/* Intensity – always visible */}
      <label className="flex items-center gap-2">
        <span className="text-gray-500">Intensität</span>
        <input
          type="range"
          min={0.01}
          max={1}
          step={0.01}
          value={toolSettings.intensity}
          onChange={e => updateToolSettings({ intensity: Number(e.target.value) })}
          className="w-24 accent-purple-500"
          {...rangeInputProps}
        />
        <span className="w-8 text-right font-mono">{(toolSettings.intensity * 100).toFixed(0)}%</span>
      </label>

      {/* Hardness – for brush-type tools */}
      {(['brush', 'harmonicBrush', 'line', 'noiseBrush', 'smudge', 'dodgeBurn', 'blurSharpen', 'delaySmear', 'threshold', 'sourceTrace'] as string[]).includes(activeTool) && (
        <label className="flex items-center gap-2">
          <span className="text-gray-500">Härte</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={toolSettings.hardness}
            onChange={e => updateToolSettings({ hardness: Number(e.target.value) })}
            className="w-20 accent-purple-500"
            {...rangeInputProps}
          />
          <span className="w-8 text-right font-mono">{(toolSettings.hardness * 100).toFixed(0)}%</span>
        </label>
      )}

      {/* Harmonic brush settings */}
      {activeTool === 'harmonicBrush' && (
        <>
          <label className="flex items-center gap-2">
            <span className="text-gray-500">Obertöne</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={toolSettings.numHarmonics}
              onChange={e => updateToolSettings({ numHarmonics: Number(e.target.value) })}
              className="w-20 accent-amber-500"
            onPointerUp={blurRangeOnPointerUp}
            />
            <span className="w-5 text-right font-mono">{toolSettings.numHarmonics}</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-gray-500">Decay</span>
            <input
              type="range"
              min={0.1}
              max={0.95}
              step={0.05}
              value={toolSettings.harmonicDecay}
              onChange={e => updateToolSettings({ harmonicDecay: Number(e.target.value) })}
              className="w-20 accent-amber-500"
            onPointerUp={blurRangeOnPointerUp}
            />
            <span className="w-8 text-right font-mono">{(toolSettings.harmonicDecay * 100).toFixed(0)}%</span>
          </label>
        </>
      )}

      {/* Spray density */}
      {activeTool === 'spray' && (
        <label className="flex items-center gap-2">
          <span className="text-gray-500">Dichte</span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={toolSettings.sprayDensity}
            onChange={e => updateToolSettings({ sprayDensity: Number(e.target.value) })}
            className="w-20 accent-cyan-500"
          />
          <span className="w-8 text-right font-mono">{(toolSettings.sprayDensity * 100).toFixed(0)}%</span>
        </label>
      )}

      {/* Formant vowel selector */}
      {activeTool === 'formant' && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 mr-1">Vokal</span>
          {(['a', 'e', 'i', 'o', 'u'] as FormantVowel[]).map(v => (
            <button
              key={v}
              onClick={() => updateToolSettings({ formantVowel: v })}
              className={`w-7 h-7 rounded font-bold text-sm uppercase
                ${toolSettings.formantVowel === v
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {activeTool === 'morph' && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 mr-1">Modus</span>
            {[
              { id: 'push', label: 'Verziehen' },
              { id: 'bloat', label: 'Woelben' },
              { id: 'pinch', label: 'Schrumpfen' },
              { id: 'twirlCW', label: 'Kreisel ↻' },
              { id: 'twirlCCW', label: 'Kreisel ↺' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => updateToolSettings({ morphMode: m.id as typeof toolSettings.morphMode })}
                className={`px-2 h-7 rounded text-[11px] ${toolSettings.morphMode === m.id ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-cyan-300/80">Radius kann bis zur vollen Spektrum-Höhe gehen</span>
        </>
      )}


      {(activeTool === 'smudge' || activeTool === 'dodgeBurn' || activeTool === 'blurSharpen' || activeTool === 'delaySmear' || activeTool === 'threshold' || activeTool === 'sourceTrace') && (
        <span className="text-[10px] text-cyan-300/80">
          {activeTool === 'smudge' && 'Intensität = Schub, Härte = Kantenhalt'}
          {activeTool === 'dodgeBurn' && (toolSettings.eraseMode ? 'Erase = Abdunkeln · Intensität = Druck' : 'Normal = Nachbelichten · Intensität = Druck')}
          {activeTool === 'blurSharpen' && (toolSettings.eraseMode ? 'Erase = Schärfen · Härte = Detailschutz' : 'Normal = Blur · Härte = Detailschutz')}
          {activeTool === 'delaySmear' && 'Intensität = Repeat-Level, Härte = Spurtreue'}
          {activeTool === 'threshold' && (toolSettings.eraseMode ? 'Erase = Material unterhalb des Gates wieder anheben' : 'Normal = leises Material lokal wegschneiden')}
          {activeTool === 'sourceTrace' && (toolSettings.eraseMode ? 'Erase = Spur der Quelle lokal aus dem Bild herausdünnen' : 'Originales Audiospektrum als hochaufgelöste Spur in die Fläche ziehen')}
        </span>
      )}

      {/* Körnungs-Slider – sichtbar im granularen Modus oder bei aktiver Körnungsebene */}
      {showGrain && (
        <label className="flex items-center gap-2">
          <span className="text-cyan-400">🌾 Körnung</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={toolSettings.grainSize}
            onChange={e => updateToolSettings({ grainSize: Number(e.target.value) })}
            className="w-24 accent-cyan-400"
            {...rangeInputProps}
          />
          <span className="w-14 text-right font-mono text-cyan-300">
            {grainLabel(toolSettings.grainSize)}
          </span>
        </label>
      )}

      {/* Stamp transform info */}
      {activeTool === 'stamp' && stampPhase === 'stamping' && (
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-mono">X: {(stampScaleX * 100).toFixed(0)}%</span>
          <span className="text-cyan-400 font-mono">Y: {(stampScaleY * 100).toFixed(0)}%</span>
          <span className="text-cyan-400 font-mono">Rot: {Math.round((stampRotation * 180) / Math.PI)}°</span>
          <span className="text-cyan-300 text-[11px]">{stampFlipX ? 'FlipX ' : ''}{stampFlipY ? 'FlipY' : ''}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setStampScale(stampScaleX + 0.1, stampScaleY)} className="h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300">X+</button>
            <button onClick={() => setStampScale(stampScaleX - 0.1, stampScaleY)} className="h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300">X-</button>
            <button onClick={() => setStampScale(stampScaleX, stampScaleY + 0.1)} className="h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300">Y+</button>
            <button onClick={() => setStampScale(stampScaleX, stampScaleY - 0.1)} className="h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300">Y-</button>
            <button onClick={() => rotateStamp(-Math.PI / 24)} className="h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300">⟲</button>
            <button onClick={() => rotateStamp(Math.PI / 24)} className="h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300">⟳</button>
            <button onClick={toggleStampFlipX} className={`h-6 px-2 rounded ${stampFlipX ? 'bg-cyan-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-cyan-300'}`}>⇋</button>
            <button onClick={toggleStampFlipY} className={`h-6 px-2 rounded ${stampFlipY ? 'bg-cyan-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-cyan-300'}`}>⇵</button>
            <button onClick={resetStampTransform} className="h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300">Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
