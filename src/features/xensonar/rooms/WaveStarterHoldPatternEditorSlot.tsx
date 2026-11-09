import { useEffect, useMemo, useState } from "react";
import {
  WAVE_STARTER_HOLD_SEGMENT_OPTIONS,
  isDefaultWaveStarterHoldSegment,
  normalizeWaveStarterHoldPatternSteps,
} from "../input/waveStarterHoldSegmentClock";
import { ResonanceInlineEditorSlot } from "./ResonanceInlineEditorSlot";
import { SegmentPatternGrid } from "./SegmentPatternGrid";

export type WaveStarterHoldPatternEditorSlotProps = {
  title: string;
  laneLabel: string;
  segments: number;
  customSegments: number;
  referenceBars: number;
  patternSteps: number[] | undefined;
  open: boolean;
  onToggle: () => void;
  onSegmentsChange: (segments: number) => void;
  onCustomSegmentsChange: (segments: number) => void;
  onReferenceBarsChange: (bars: number) => void;
  onPatternChange: (steps: number[]) => void;
};

const clampHoldSegments = (value: number) =>
  Math.max(1, Math.min(256, Math.round(Number.isFinite(value) ? value : 24)));

function buildAllOnPattern(segments: number) {
  return Array.from({ length: clampHoldSegments(segments) }, () => 1);
}

function buildDelayedPattern(segments: number) {
  return buildAllOnPattern(segments).map((value, index) => (index >= 1 && index <= 4 ? 0 : value));
}

function buildAllOffPattern(segments: number) {
  return Array.from({ length: clampHoldSegments(segments) }, () => 0);
}

function buildGallopPattern(segments: number) {
  return buildAllOnPattern(segments).map((_, index) => {
    const phase = index % 6;
    return phase === 0 || phase === 2 || phase === 3 ? 1 : 0;
  });
}

function buildAfterbeatPattern(segments: number) {
  return buildAllOnPattern(segments).map((_, index) => (index % 2 === 1 ? 1 : 0));
}

export function WaveStarterHoldPatternEditorSlot({
  title,
  laneLabel,
  segments,
  customSegments,
  referenceBars,
  patternSteps,
  open,
  onToggle,
  onSegmentsChange,
  onCustomSegmentsChange,
  onReferenceBarsChange,
  onPatternChange,
}: WaveStarterHoldPatternEditorSlotProps) {
  const [draftSegments, setDraftSegments] = useState(clampHoldSegments(segments));
  const [draftCustomSegments, setDraftCustomSegments] = useState(clampHoldSegments(customSegments));
  const [draftReferenceBars, setDraftReferenceBars] = useState(() => Math.max(0.125, Math.min(16, Number.isFinite(referenceBars) ? referenceBars : 1)));
  const [draftSteps, setDraftSteps] = useState<number[]>(() =>
    normalizeWaveStarterHoldPatternSteps(patternSteps, clampHoldSegments(segments)),
  );

  useEffect(() => {
    const safeSegments = clampHoldSegments(segments);
    setDraftSegments(safeSegments);
    setDraftSteps(normalizeWaveStarterHoldPatternSteps(patternSteps, safeSegments));
  }, [segments, patternSteps]);

  useEffect(() => {
    setDraftCustomSegments(clampHoldSegments(customSegments));
  }, [customSegments]);

  useEffect(() => {
    setDraftReferenceBars(Math.max(0.125, Math.min(16, Number.isFinite(referenceBars) ? referenceBars : 1)));
  }, [referenceBars]);

  const activeCount = useMemo(
    () => draftSteps.reduce((sum, step) => sum + (step === 0 ? 0 : 1), 0),
    [draftSteps],
  );
  const selectedIsDefault = isDefaultWaveStarterHoldSegment(draftSegments);
  const selectValue = selectedIsDefault ? String(draftSegments) : "other";

  const commitPattern = (steps: number[]) => {
    const normalized = normalizeWaveStarterHoldPatternSteps(steps, draftSegments);
    setDraftSteps(normalized);
    onPatternChange(normalized);
  };

  const commitSegments = (nextSegments: number) => {
    const safeSegments = clampHoldSegments(nextSegments);
    setDraftSegments(safeSegments);
    const normalized = normalizeWaveStarterHoldPatternSteps(draftSteps, safeSegments);
    setDraftSteps(normalized);
    onSegmentsChange(safeSegments);
    onPatternChange(normalized);
  };

  const commitCustomSegments = (nextSegments: number) => {
    const safeSegments = clampHoldSegments(nextSegments);
    setDraftCustomSegments(safeSegments);
    onCustomSegmentsChange(safeSegments);
    commitSegments(safeSegments);
  };

  const commitReferenceBars = (nextBars: number) => {
    const safeBars = Math.max(0.125, Math.min(16, Number.isFinite(nextBars) ? nextBars : 1));
    setDraftReferenceBars(safeBars);
    onReferenceBarsChange(safeBars);
  };

  return (
    <ResonanceInlineEditorSlot title={title} open={open} onToggle={onToggle}>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button type="button" onClick={() => commitPattern(buildAllOnPattern(draftSegments))} className="rounded border border-emerald-700 bg-emerald-950/30 px-2 py-2 text-xs text-emerald-100 hover:bg-emerald-900/40">Alle</button>
          <button type="button" onClick={() => commitPattern(buildAllOffPattern(draftSegments))} className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900">Aus</button>
          <button type="button" onClick={() => commitPattern(buildDelayedPattern(draftSegments))} className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900">verzögert</button>
          <button type="button" onClick={() => commitPattern(buildGallopPattern(draftSegments))} className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900">Gallopp</button>
          <button type="button" onClick={() => commitPattern(buildAfterbeatPattern(draftSegments))} className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900">Nachschlag</button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">Slots</label>
            <select
              value={selectValue}
              onChange={(event) => {
                if (event.target.value === "other") {
                  commitSegments(draftCustomSegments || 48);
                  return;
                }
                commitSegments(parseInt(event.target.value, 10));
              }}
              className="w-full border border-neutral-700 bg-neutral-950 p-1 text-xs text-neutral-300"
            >
              {WAVE_STARTER_HOLD_SEGMENT_OPTIONS.map((option) => (
                <option key={`${laneLabel}-${option}`} value={option}>{option}</option>
              ))}
              <option value="other">other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">Andere</label>
            <input
              type="number"
              min={1}
              max={256}
              step={1}
              value={draftCustomSegments}
              onChange={(event) => commitCustomSegments(parseInt(event.target.value || "1", 10))}
              className="w-full border border-neutral-700 bg-neutral-950 p-1 text-xs text-neutral-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">Takte</label>
            <input
              type="number"
              min={0.125}
              max={16}
              step={0.125}
              value={draftReferenceBars}
              onChange={(event) => commitReferenceBars(parseFloat(event.target.value || "1"))}
              className="w-full border border-neutral-700 bg-neutral-950 p-1 text-xs text-neutral-300"
              title="Bezugsdauer in Takten"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span>{laneLabel}</span>
          <span>{activeCount}/{draftSteps.length} aktiv · {draftReferenceBars} T.</span>
        </div>
        <SegmentPatternGrid
          label={laneLabel}
          steps={draftSteps}
          tone="neutral"
          onChange={(steps) => commitPattern(steps)}
        />
      </div>
    </ResonanceInlineEditorSlot>
  );
}
