import { useState } from 'react';
import { WaveStarterHoldPatternEditorSlot } from './WaveStarterHoldPatternEditorSlot';
import { EntrophonUnifiedSoundPanel } from './EntrophonUnifiedSoundPanel';
import { ResonanceMetaPresetWheelPanel, type MetaPresetWheelPreset } from './ResonanceMetaPresetWheelPanel';
import type { OvertoneMixerTarget, ResonanceSoundPaletteNParams, UpdateResonanceNParams } from './resonancePanelTypedContracts';

export type ResonanceSoundPalettePanelProps = {
  nParamsUI: ResonanceSoundPaletteNParams;
  updateNParams: UpdateResonanceNParams;
  dronePresets: Array<{ value: string; label: string }>;
  particlePresets: Array<{ value: string; label: string }>;
  waveSoundPresets: Array<{ value: string; label: string; groupId?: string }>;
  waveTimbreGradientPresets: Array<{ value: string; label: string }>;
  waveVolumeGradientPresets: Array<{ value: string; label: string }>;
  particleGradientPresets: Array<{ value: string; label: string }>;
  waveOvertoneModes: Array<{ value: string; label: string }>;
  waveOvertoneArpRates: number[];
  waveOvertoneArpPatterns: Array<{ value: string; label: string }>;
  droneJiOvertones: Array<{ label: string }>;
  waveOvertoneMixPresets: Array<{ value: string; label: string }>;
  waveDecayPresets: Array<{ value: string; label: string }>;
  metaPresets: MetaPresetWheelPreset[];
  mandalaDotPositions: Array<{ id: string; cx: number; cy: number }>;
  mandalaPresetColors: Record<string, string>;
  mandalaRandomizingPresetId: string | null;
  rouletteIsSpinning: boolean;
  highlightedMandalaPresetId: string | null;
  activeMetaPreset: { label: string; description: string } | null;
  activeMetaPresetId: string | null;
  sessionMetaOverrides: Record<string, { preset?: unknown }>;
  activeParticleNodes: Array<{ label: string }>;
  agentKeys: string[];
  particleVolumeMax: number;
  waveSoundPreset: string;
  waveSoundEnabled: boolean;
  setWaveSoundEnabled: (value: boolean) => void;
  waveSoundVolume: number;
  setWaveSoundVolume: (value: number) => void;
  activeOvertoneMixer: OvertoneMixerTarget;
  setActiveOvertoneMixer: (value: OvertoneMixerTarget) => void;
  selectedWaveOvertonePreset: string;
  setSelectedWaveOvertonePreset: (value: string) => void;
  onDronePresetChange: (value: string) => void;
  particleSampleProfileMode: 'current_db_v2' | 'legacy_90_40';
  onParticleSampleProfileModeChange: (value: 'current_db_v2' | 'legacy_90_40') => void;
  onParticlePresetChange: (value: string) => void;
  onWaveSoundPresetChange: (value: string) => void;
  onApplyWaveOvertonePreset: (value: string) => void;
  onSetWaveOvertone: (label: string, value: number) => void;
  onSetDroneOvertone: (label: string, value: number) => void;
  onToggleNexusAgent: (index: number) => void;
  onSetNexusAgentVolume: (index: number, value: number) => void;
  onRandomizeMetaPreset: (presetId: string) => void;
  onApplyMetaPreset: (presetId: string) => void;
  onStartMetaPresetRoulette: () => void;
  hexToRgba: (hex: string, alpha: number) => string;
};

export function ResonanceSoundPalettePanel({
  nParamsUI,
  updateNParams,
  dronePresets,
  particlePresets,
  waveSoundPresets,
  waveTimbreGradientPresets,
  waveVolumeGradientPresets,
  particleGradientPresets,
  waveOvertoneModes,
  waveOvertoneArpRates,
  waveOvertoneArpPatterns,
  droneJiOvertones,
  waveOvertoneMixPresets,
  waveDecayPresets,
  metaPresets,
  mandalaDotPositions,
  mandalaPresetColors,
  mandalaRandomizingPresetId,
  rouletteIsSpinning,
  highlightedMandalaPresetId,
  activeMetaPreset,
  activeMetaPresetId,
  sessionMetaOverrides,
  activeParticleNodes,
  agentKeys,
  particleVolumeMax,
  waveSoundPreset,
  waveSoundEnabled,
  setWaveSoundEnabled,
  waveSoundVolume,
  setWaveSoundVolume,
  activeOvertoneMixer,
  setActiveOvertoneMixer,
  selectedWaveOvertonePreset,
  setSelectedWaveOvertonePreset,
  onDronePresetChange,
  particleSampleProfileMode,
  onParticleSampleProfileModeChange,
  onParticlePresetChange,
  onWaveSoundPresetChange,
  onApplyWaveOvertonePreset,
  onSetWaveOvertone,
  onSetDroneOvertone,
  onToggleNexusAgent,
  onSetNexusAgentVolume,
  onRandomizeMetaPreset,
  onApplyMetaPreset,
  onStartMetaPresetRoulette,
  hexToRgba,
}: ResonanceSoundPalettePanelProps) {
  const [holdPatternEditorOpen, setHoldPatternEditorOpen] = useState<"wellenstart" | "klaviatur" | null>(null);
  const waveSynthSoundPresets = waveSoundPresets.filter((preset) => preset.groupId !== 'samples');
  const waveSampleSoundPresets = waveSoundPresets.filter((preset) => preset.groupId === 'samples');
  const renderWaveSoundOptions = () => (
    <>
      <optgroup label="Synth Sounds">
        {waveSynthSoundPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
      </optgroup>
      {waveSampleSoundPresets.length > 0 && (
        <optgroup label="Samples">
          {waveSampleSoundPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
        </optgroup>
      )}
    </>
  );



  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-start bg-neutral-900/50 p-4 border border-neutral-800">
      <div className="flex flex-col gap-4">
        <EntrophonUnifiedSoundPanel gridBase={nParamsUI.gridBase} gridTuning={nParamsUI.gridTuning} waveSoundPreset={waveSoundPreset} />

        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Drone Sound</label>
            <select value={nParamsUI.dronePreset} onChange={(e) => onDronePresetChange(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
              {dronePresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Wellenstart Sound</label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
              <select
                value={waveSoundPreset}
                onChange={(e) => {
                  onWaveSoundPresetChange(e.target.value);
                  updateNParams({ waveStarterHoldSoundPreset: e.target.value });
                }}
                className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300"
              >
                {renderWaveSoundOptions()}
              </select>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={waveSoundEnabled} onChange={(e) => setWaveSoundEnabled(e.target.checked)} /><span className="text-xs text-neutral-400">An</span></label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Partikel Sound</label>
            <select value={nParamsUI.particlePreset} onChange={(e) => onParticlePresetChange(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
              {particlePresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
            </select>
            <label className="block text-[11px] text-neutral-500 mt-2 mb-1">Sample-Partikel-Modus</label>
            <select value={particleSampleProfileMode} onChange={(e) => onParticleSampleProfileModeChange(e.target.value as 'current_db_v2' | 'legacy_90_40')} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-xs text-neutral-300">
              <option value="current_db_v2">Aktuell (DB-v2 / entkoppelt bis 0,8 s)</option>
              <option value="legacy_90_40">Legacy 90.40 (alte kurze Partikelhülle)</option>
            </select>
            <div className="mt-1 text-[10px] text-neutral-500">Schaltet nur Sample-Partikel um, nicht Wellenstarter oder Melodic Loop.</div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Klaviatur Sound</label>
            <select
              value={nParamsUI.keyboardHoldSoundPreset ?? waveSoundPreset}
              onChange={(e) => updateNParams({ keyboardHoldSoundPreset: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300"
            >
              {renderWaveSoundOptions()}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <WaveStarterHoldPatternEditorSlot
              title="Enter-Hold Muster"
              laneLabel="Enter"
              segments={nParamsUI.waveStarterHoldSegments ?? 24}
              customSegments={nParamsUI.waveStarterHoldCustomSegments ?? 48}
              referenceBars={nParamsUI.waveStarterHoldReferenceBars ?? 1}
              patternSteps={nParamsUI.waveStarterHoldPatternSteps}
              open={holdPatternEditorOpen === "wellenstart"}
              onToggle={() => setHoldPatternEditorOpen((open) => open === "wellenstart" ? null : "wellenstart")}
              onSegmentsChange={(segments) => updateNParams({ waveStarterHoldSegments: segments })}
              onCustomSegmentsChange={(segments) => updateNParams({ waveStarterHoldCustomSegments: segments })}
              onReferenceBarsChange={(bars) => updateNParams({ waveStarterHoldReferenceBars: bars })}
              onPatternChange={(steps) => updateNParams({ waveStarterHoldPatternSteps: steps })}
            />
            <WaveStarterHoldPatternEditorSlot
              title="Klaviatur-Hold Muster"
              laneLabel="Klaviatur"
              segments={nParamsUI.keyboardHoldSegments ?? 24}
              customSegments={nParamsUI.keyboardHoldCustomSegments ?? 48}
              referenceBars={nParamsUI.keyboardHoldReferenceBars ?? 1}
              patternSteps={nParamsUI.keyboardHoldPatternSteps}
              open={holdPatternEditorOpen === "klaviatur"}
              onToggle={() => setHoldPatternEditorOpen((open) => open === "klaviatur" ? null : "klaviatur")}
              onSegmentsChange={(segments) => updateNParams({ keyboardHoldSegments: segments })}
              onCustomSegmentsChange={(segments) => updateNParams({ keyboardHoldCustomSegments: segments })}
              onReferenceBarsChange={(bars) => updateNParams({ keyboardHoldReferenceBars: bars })}
              onPatternChange={(steps) => updateNParams({ keyboardHoldPatternSteps: steps })}
            />
          </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2 rounded-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.waveTimbreGradientEnabled} onChange={(e) => updateNParams({ waveTimbreGradientEnabled: e.target.checked })} />Wellenstarter Timbre-Gradient X</label>
              <span className={`text-[10px] uppercase tracking-widest ${nParamsUI.waveTimbreGradientEnabled ? "text-cyan-300" : "text-neutral-500"}`}>{nParamsUI.waveTimbreGradientEnabled ? "aktiv" : "inaktiv"}</span>
            </div>
            <select value={nParamsUI.waveTimbreGradientX} onChange={(e) => updateNParams({ waveTimbreGradientX: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
              {waveTimbreGradientPresets.map((preset) => <option key={`wave-grad-${preset.value}`} value={preset.value}>{preset.label}</option>)}
            </select>
            <div className="mt-1 text-[10px] text-neutral-500">Reagiert auf die X-Achse von Wellenstarter und Klaviatur.</div>
          </div>
          <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2 rounded-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.waveVolumeGradientEnabled} onChange={(e) => updateNParams({ waveVolumeGradientEnabled: e.target.checked })} />Wellenstarter Lautstärke-Gradient X</label>
              <span className={`text-[10px] uppercase tracking-widest ${nParamsUI.waveVolumeGradientEnabled ? "text-cyan-300" : "text-neutral-500"}`}>{nParamsUI.waveVolumeGradientEnabled ? "aktiv" : "inaktiv"}</span>
            </div>
            <select value={nParamsUI.waveVolumeGradientX} onChange={(e) => updateNParams({ waveVolumeGradientX: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
              {waveVolumeGradientPresets.map((preset) => <option key={`wave-vol-grad-${preset.value}`} value={preset.value}>{preset.label}</option>)}
            </select>
            <div className="mt-1 text-[10px] text-neutral-500">Optionaler X-Lautstärkeverlauf: links leiser oder rechts leiser.</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Partikel Farbgradient X</label>
            <select value={nParamsUI.particleGradientX} onChange={(e) => updateNParams({ particleGradientX: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
              {particleGradientPresets.map((preset) => <option key={`x-${preset.value}`} value={preset.value}>{preset.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Partikel Farbgradient Y</label>
            <select value={nParamsUI.particleGradientY} onChange={(e) => updateNParams({ particleGradientY: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
              {particleGradientPresets.map((preset) => <option key={`y-${preset.value}`} value={preset.value}>{preset.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-1">Wellenstart Lautstärke: {(waveSoundVolume * 100).toFixed(0)}%</label>
          <input type="range" min="0" max="0.5" step="0.01" value={waveSoundVolume} onChange={(e) => setWaveSoundVolume(parseFloat(e.target.value))} className="w-full cursor-pointer" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.waveOvertonesEnabled} onChange={(e) => updateNParams({ waveOvertonesEnabled: e.target.checked })} />Wellenstarter Obertöne aktiv</label>

        {activeOvertoneMixer === "waves" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Oberton-Modus</label>
              <select value={nParamsUI.waveOvertoneMode} onChange={(e) => updateNParams({ waveOvertoneMode: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                {waveOvertoneModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Arp Raster</label>
              <select value={String(nParamsUI.waveOvertoneArpRate)} onChange={(e) => updateNParams({ waveOvertoneArpRate: parseInt(e.target.value, 10) })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                {waveOvertoneArpRates.map((rate) => <option key={`wave-overtone-arp-${rate}`} value={rate}>{rate}stel</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Arp Muster</label>
              <select value={nParamsUI.waveOvertoneArpPattern} onChange={(e) => updateNParams({ waveOvertoneArpPattern: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                {waveOvertoneArpPatterns.map((pattern) => <option key={pattern.value} value={pattern.value}>{pattern.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Arp Schritte: {nParamsUI.waveOvertoneArpSteps}</label>
              <input type="range" min="2" max="16" step="1" value={nParamsUI.waveOvertoneArpSteps} onChange={(e) => updateNParams({ waveOvertoneArpSteps: parseInt(e.target.value, 10) })} className="w-full cursor-pointer" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-neutral-400 mb-1">{activeOvertoneMixer === "drone" ? "Drone Oberton Wellenform" : "Wellenstarter Oberton Wellenform"}</label>
          <select
            value={activeOvertoneMixer === "drone" ? nParamsUI.droneOvertoneWaveform : nParamsUI.waveOvertoneWaveform}
            onChange={(e) => updateNParams(activeOvertoneMixer === "drone" ? { droneOvertoneWaveform: e.target.value } : { waveOvertoneWaveform: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300"
          >
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400 uppercase tracking-widest">
          <button type="button" onClick={() => setActiveOvertoneMixer("drone")} className={`px-2 py-1 border ${activeOvertoneMixer === "drone" ? "border-fuchsia-400 text-fuchsia-200 bg-fuchsia-950/30" : "border-neutral-700 text-neutral-400"}`}>Drone Mixer</button>
          <button type="button" onClick={() => setActiveOvertoneMixer("waves")} className={`px-2 py-1 border ${activeOvertoneMixer === "waves" ? "border-cyan-400 text-cyan-200 bg-cyan-950/30" : "border-neutral-700 text-neutral-400"}`}>Wellenstarter Mixer</button>
        </div>

        {activeOvertoneMixer === "waves" && (
          <div className="bg-black/30 p-2 border border-neutral-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Wellenstarter-Obertöne</div>
              <span className={`text-[10px] uppercase tracking-widest ${nParamsUI.waveOvertonesEnabled ? "text-cyan-300" : "text-neutral-500"}`}>
                {nParamsUI.waveOvertonesEnabled ? `aktiv · ${nParamsUI.waveOvertoneMode}` : "inaktiv"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Global-Level: {Math.round((nParamsUI.waveOvertoneGlobalLevel ?? 1) * 100)}%</label>
                <input type="range" min="0" max="2.5" step="0.01" value={nParamsUI.waveOvertoneGlobalLevel ?? 1} onChange={(e) => updateNParams({ waveOvertoneGlobalLevel: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Mix-Preset</label>
                <div className="flex items-center gap-2">
                  <select value={selectedWaveOvertonePreset} onChange={(e) => setSelectedWaveOvertonePreset(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                    {waveOvertoneMixPresets.map((preset) => <option key={`wave-overtone-preset-${preset.value}`} value={preset.value}>{preset.label}</option>)}
                  </select>
                  <button type="button" onClick={() => onApplyWaveOvertonePreset(selectedWaveOvertonePreset)} className="px-2 py-1 border border-cyan-700 text-cyan-200 bg-cyan-950/30 text-xs">Laden</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-1 max-h-32 overflow-y-auto pr-1">
              {droneJiOvertones.map((node) => (
                <div key={`wave-${node.label}`} className="flex items-center gap-1 bg-neutral-950 px-1 py-0.5 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 w-7">{node.label}</span>
                  <input type="range" min="0" max="1" step="0.01" value={nParamsUI.waveOvertones[node.label] || 0} onChange={(e) => onSetWaveOvertone(node.label, parseFloat(e.target.value))} className="h-1 w-full cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-neutral-400 mb-1">Wellenradius: {(nParamsUI.waveRadius ?? 1).toFixed(2)}x</label>
          <input type="range" min="0.35" max="2.2" step="0.01" value={nParamsUI.waveRadius ?? 1} onChange={(e) => updateNParams({ waveRadius: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Wellendecay</label>
          <select value={nParamsUI.waveDecay ?? "linear"} onChange={(e) => updateNParams({ waveDecay: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
            {waveDecayPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
        </div>

        {activeOvertoneMixer === "drone" && (
          <div className="bg-black/30 p-2 border border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2">Drone-JI Obertöne (Mischpult)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-1 max-h-32 overflow-y-auto pr-1">
              {droneJiOvertones.map((node) => (
                <div key={node.label} className="flex items-center gap-1 bg-neutral-950 px-1 py-0.5 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 w-7">{node.label}</span>
                  <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneJIOvertones[node.label] || 0} onChange={(e) => onSetDroneOvertone(node.label, parseFloat(e.target.value))} className="h-1 w-full cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-neutral-400">Partikel Lautstärke (Agent Pings)</label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
              <input type="checkbox" checked={nParamsUI.particleMute} onChange={(e) => updateNParams({ particleMute: e.target.checked, agentEnabled: activeParticleNodes.map(() => !e.target.checked) })} />
              Mute
            </label>
          </div>
          <input type="range" min="0" max={particleVolumeMax} step="0.01" value={nParamsUI.particleVolume} onChange={(e) => updateNParams({ particleVolume: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
        </div>
      </div>

      <div>
        <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">{nParamsUI.resonanceHotkeyMode === "particle-classic" ? "Partikel einzeln schalten (Legacy manuell aktiv: A S D F G H J K L Ö Ä # -)" : nParamsUI.resonanceHotkeyMode === "root-follow" ? "Partikel einzeln schalten (Classic-Hotkeys gerade aus; Root-Follow-Loop-Hotkeys sind aktiv)" : "Partikel einzeln schalten (Classic-Hotkeys gerade aus; Materialspur-Hotkeys sind aktiv)"}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeParticleNodes.map((node, idx) => {
            const enabled = nParamsUI.agentEnabled[idx] ?? true;
            const volume = nParamsUI.agentVolumes[idx] ?? 1;
            return (
              <div key={node.label} className="border border-amber-500/50 bg-amber-950/10 px-2 py-1 text-left text-xs flex items-center gap-2 text-amber-100">
                <button type="button" onClick={() => onToggleNexusAgent(idx)} className={`inline-block h-4 w-4 border ${enabled ? "bg-emerald-400 border-emerald-200" : "bg-neutral-900 border-emerald-600"}`} aria-label={`${node.label} toggeln`} />
                <span className="min-w-10 text-amber-100">{node.label}</span>
                <input type="range" min="0" max="1.5" step="0.01" value={volume} onChange={(e) => onSetNexusAgentVolume(idx, parseFloat(e.target.value))} className="h-1 flex-1 cursor-pointer" aria-label={`${node.label} Lautstaerke`} />
                <span className="w-4 text-right font-semibold uppercase text-amber-200">{agentKeys[idx] ?? "-"}</span>
              </div>
            );
          })}
        </div>
        <ResonanceMetaPresetWheelPanel
          metaPresets={metaPresets}
          mandalaDotPositions={mandalaDotPositions}
          mandalaPresetColors={mandalaPresetColors}
          mandalaRandomizingPresetId={mandalaRandomizingPresetId}
          rouletteIsSpinning={rouletteIsSpinning}
          highlightedMandalaPresetId={highlightedMandalaPresetId}
          activeMetaPreset={activeMetaPreset}
          activeMetaPresetId={activeMetaPresetId}
          sessionMetaOverrides={sessionMetaOverrides}
          onRandomizeMetaPreset={onRandomizeMetaPreset}
          onApplyMetaPreset={onApplyMetaPreset}
          onStartMetaPresetRoulette={onStartMetaPresetRoulette}
          hexToRgba={hexToRgba}
        />
      </div>
    </div>
  );
}
