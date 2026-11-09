/**
 * Composer tempo, volume, tuning, arrangement, form, and composer toggle for Jump Run Soundtrack.
 * Extracted from PlatformerControlPanel for LOC discipline and single responsibility.
 */

import type {
  PlatformerArrangementForm,
  PlatformerArrangementMode,
  PlatformerTuningMode,
} from "./platformerArrangement";
import type { PlatformerSectionBias } from "./platformerSectionBias";

export type PlatformerTunerPanelProps = {
  bpm: number;
  onBpmChange: (value: number) => void;
  masterVolume: number;
  onMasterVolumeChange: (value: number) => void;
  tuningMode: PlatformerTuningMode;
  onTuningModeChange: (value: PlatformerTuningMode) => void;
  arrangementMode: PlatformerArrangementMode;
  onArrangementModeChange: (value: PlatformerArrangementMode) => void;
  formMode: PlatformerArrangementForm;
  onFormModeChange: (value: PlatformerArrangementForm) => void;
  sectionBias: PlatformerSectionBias;
  onSectionBiasChange: (value: PlatformerSectionBias) => void;
  evolutionDepth: number;
  onEvolutionDepthChange: (value: number) => void;
  tempoFollow: number;
  onTempoFollowChange: (value: number) => void;
  composerOn: boolean;
  onComposerOnChange: (value: boolean) => void;
};

const selectClass = "w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-sm text-neutral-100";
const sliderClass = "w-full cursor-pointer";

export function PlatformerTunerPanel({
  bpm,
  onBpmChange,
  masterVolume,
  onMasterVolumeChange,
  tuningMode,
  onTuningModeChange,
  arrangementMode,
  onArrangementModeChange,
  formMode,
  onFormModeChange,
  sectionBias,
  onSectionBiasChange,
  evolutionDepth,
  onEvolutionDepthChange,
  tempoFollow,
  onTempoFollowChange,
  composerOn,
  onComposerOnChange,
}: PlatformerTunerPanelProps) {
  return (
    <>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Composer Tempo: {bpm} BPM</label>
        <input
          type="range"
          min="50"
          max="200"
          step="1"
          value={bpm}
          onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
          className={sliderClass}
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Master Volume: {(masterVolume * 100).toFixed(0)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterVolume}
          onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
          className={sliderClass}
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Tuning System</label>
        <select value={tuningMode} onChange={(e) => onTuningModeChange(e.target.value as PlatformerTuningMode)} className={selectClass}>
          <option value="12edo">12-EDO</option>
          <option value="19edo">19-EDO</option>
          <option value="22edo">22-EDO</option>
          <option value="ji">Just Intonation</option>
          <option value="bp">Bohlen-Pierce</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Arrangement Mode</label>
        <select value={arrangementMode} onChange={(e) => onArrangementModeChange(e.target.value as PlatformerArrangementMode)} className={selectClass}>
          <option value="balanced">Balanced</option>
          <option value="cinematic">Cinematic</option>
          <option value="percussive">Percussive</option>
          <option value="glitch">Glitch</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Form Engine</label>
        <select value={formMode} onChange={(e) => onFormModeChange(e.target.value as PlatformerArrangementForm)} className={selectClass}>
          <option value="auto">Auto</option>
          <option value="aaba">AABA</option>
          <option value="abab">ABAB</option>
          <option value="abca">ABCA</option>
          <option value="abcb">ABCB</option>
          <option value="abac">ABAC</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Section Bias</label>
        <select value={sectionBias} onChange={(e) => onSectionBiasChange(e.target.value as PlatformerSectionBias)} className={selectClass}>
          <option value="auto">Auto</option>
          <option value="A">A Focus</option>
          <option value="B">B Focus</option>
          <option value="C">C Focus</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Evolution Depth: {(evolutionDepth * 100).toFixed(0)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={evolutionDepth}
          onChange={(e) => onEvolutionDepthChange(parseFloat(e.target.value))}
          className={sliderClass}
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Target Tempo Follow: {(tempoFollow * 100).toFixed(0)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={tempoFollow}
          onChange={(e) => onTempoFollowChange(parseFloat(e.target.value))}
          className={sliderClass}
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Auto Motif Composer</label>
        <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={composerOn} onChange={(e) => onComposerOnChange(e.target.checked)} />
          Enabled
        </label>
      </div>
    </>
  );
}
