import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useStore } from '../state/store';
import type { FormantVowel } from '../state/store';
import { toolDomainLabel } from '../tools/toolDomains';
import {
  MORPH_MODE_OPTIONS,
  resolveDisplayToolDomain,
  resolveGrainLabel,
  resolveSpecialToolHelp,
  resolveToolDomain,
  resolveToolLabel,
  shouldShowBrushHardness,
} from './toolSettings/toolSettingsUiModel';

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
  const sourceAssetContext = useStore(s => s.sourceAssetContext);
  const forge3EditTarget = useStore(s => s.forge3EditTarget);
  const setForge3EditTarget = useStore(s => s.setForge3EditTarget);

  const showGrain = synthMode === 'granular' || showGrainLayer;
  const brushSizeMax = activeTool === 'morph' ? spectralData.height : 80;
  const toolDomain = resolveToolDomain(activeTool);
  const displayToolDomain = resolveDisplayToolDomain({ activeTool, forge3EditTarget });
  const specialToolHelp = resolveSpecialToolHelp({ activeTool, eraseMode: toolSettings.eraseMode });

  return (
    <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center gap-6 text-xs text-gray-300 flex-wrap">
      <span className="text-purple-400 font-semibold">{resolveToolLabel(activeTool, { eraseMode: toolSettings.eraseMode })}</span>
      <span className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400" title="Zeigt, welche Ebene dieses Werkzeug im aktuellen Forge-3-Zustand tatsächlich beeinflusst.">{toolDomainLabel(displayToolDomain)}</span>

      {/* Erase mode indicator */}
      {toolSettings.eraseMode && (
        <span className="text-red-400 font-bold flex items-center gap-1 bg-red-900/40 px-2 py-0.5 rounded">
          ⊖ Radier-Modus
        </span>
      )}

      {sourceAssetContext === 'forge3_main' && toolDomain === 'workbench_plus_body' && (
        <div className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1">
          <span className="text-[10px] text-cyan-200/80">Werkzeug-Ziel</span>
          <button
            onClick={() => setForge3EditTarget('workbench')}
            className={`h-6 rounded px-2 text-[10px] ${forge3EditTarget === 'workbench' ? 'bg-cyan-700 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
            title="Wirkt nur auf die Werkbank; die Quelle bleibt dabei unverändert."
          >
            Werkbank
          </button>
          <button
            onClick={() => setForge3EditTarget('linked_body')}
            className={`h-6 rounded px-2 text-[10px] ${forge3EditTarget === 'linked_body' ? 'bg-cyan-700 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
            title="Wirkt auf Werkbank und Quelle zugleich."
          >
            Werkbank + Quelle
          </button>
        </div>
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
      {shouldShowBrushHardness(activeTool) && (
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
            {MORPH_MODE_OPTIONS.map(m => (
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


      {specialToolHelp && (
        <span className="text-[10px] text-cyan-300/80">
          {specialToolHelp}
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
            {resolveGrainLabel(toolSettings.grainSize)}
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
