import { useEffect, useState } from "react";
import { SegmentPatternGrid } from "../SegmentPatternGrid";
import {
  formatRootFollowImpulseRasterBeatRatioSummary,
  formatRootFollowImpulseRasterClockModeLabel,
  isRootFollowImpulseRasterAllMuted,
  isRootFollowImpulseRasterBypass,
  normalizeRootFollowImpulseRasterValue,
  normalizeRootFollowImpulseRasterPattern,
  previewRootFollowImpulseRasterCycleGroups,
  type RootFollowImpulseRasterClockMode,
} from "../../rootFollow/rootFollowImpulseRasterPolicy";
import {
  countActiveSegmentPatternSteps,
  resizeSegmentPatternPreservingMutedTail,
} from "../../rhythmSegmentPattern";

const ROOT_FOLLOW_IMPULSRASTER_PATTERN_COLUMNS = 16;
const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_COLUMNS = 32;
const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MIN_BARS = 4;
const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MAX_BARS = 16;
const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_DEFAULT_BARS = 4;

function normalizeRootFollowImpulseRasterPreviewBars(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : ROOT_FOLLOW_IMPULSRASTER_PREVIEW_DEFAULT_BARS;
  if (!Number.isFinite(numeric))
    return ROOT_FOLLOW_IMPULSRASTER_PREVIEW_DEFAULT_BARS;
  return Math.max(
    ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MIN_BARS,
    Math.min(
      ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MAX_BARS,
      Math.round(numeric),
    ),
  );
}

export function RootFollowImpulseRasterControls({
  cycleDiv,
  counterDiv,
  pattern,
  clockMode,
  onCycleDivChange,
  onCounterDivChange,
  onPatternChange,
  onClockModeChange,
}: {
  cycleDiv: number;
  counterDiv: number;
  pattern: number[];
  clockMode: RootFollowImpulseRasterClockMode;
  onCycleDivChange: (value: number) => void;
  onCounterDivChange: (value: number) => void;
  onPatternChange: (value: number[]) => void;
  onClockModeChange: (value: RootFollowImpulseRasterClockMode) => void;
}) {
  const safeCycleDiv = normalizeRootFollowImpulseRasterValue(cycleDiv);
  const safeCounterDiv = normalizeRootFollowImpulseRasterValue(counterDiv);
  const normalizedPattern = normalizeRootFollowImpulseRasterPattern(pattern, {
    counterDiv: safeCounterDiv,
    everyFallback: safeCounterDiv,
  });
  const activeCount = countActiveSegmentPatternSteps(
    normalizedPattern,
    safeCounterDiv,
  );
  const impulsePolicy = {
    every: safeCounterDiv,
    cycleDiv: safeCycleDiv,
    counterDiv: safeCounterDiv,
    clockMode,
    pattern: normalizedPattern,
  };
  const isBypass = isRootFollowImpulseRasterBypass(impulsePolicy);
  const isAllMuted = isRootFollowImpulseRasterAllMuted(impulsePolicy);
  const [expanded, setExpanded] = useState(!isBypass);
  const [previewBars, setPreviewBars] = useState(
    ROOT_FOLLOW_IMPULSRASTER_PREVIEW_DEFAULT_BARS,
  );
  useEffect(() => {
    if (!isBypass) setExpanded(true);
  }, [isBypass]);
  const previewGroups = previewRootFollowImpulseRasterCycleGroups({
    cycleDiv: safeCycleDiv,
    counterDiv: safeCounterDiv,
    pattern: normalizedPattern,
    cycles: previewBars,
  });
  const driftsAgainstCycle =
    safeCycleDiv > 1 && safeCounterDiv > 1 && safeCycleDiv !== safeCounterDiv;
  const clockModeLabel = formatRootFollowImpulseRasterClockModeLabel(clockMode);
  const summaryText = isBypass
    ? "Durchgehend — Sync"
    : isAllMuted
      ? `${safeCycleDiv}:${safeCounterDiv} · stumm`
      : `${safeCycleDiv}:${safeCounterDiv} · ${activeCount}/${safeCounterDiv} aktiv`;
  const ratioHelpText = `${formatRootFollowImpulseRasterBeatRatioSummary({
    cycleDiv: safeCycleDiv,
    counterDiv: safeCounterDiv,
    pattern: normalizedPattern,
    clockMode,
  })} · Mute-Pattern: Figur läuft im ganzen Root-Follow-Takt, Segmentmuster macht Teile leise. Stauchend: Figur wird je aktivem Segment verdichtet.`;
  const commitCycleDiv = (raw: string) => {
    const nextCycleDiv = normalizeRootFollowImpulseRasterValue(raw);
    onCycleDivChange(nextCycleDiv);
  };
  const commitCounterDiv = (raw: string) => {
    const nextCounterDiv = normalizeRootFollowImpulseRasterValue(raw);
    onCounterDivChange(nextCounterDiv);
    onPatternChange(
      resizeSegmentPatternPreservingMutedTail(
        normalizedPattern,
        nextCounterDiv,
      ),
    );
  };
  const commitCounterEqualsCycle = () => {
    onCounterDivChange(safeCycleDiv);
    onPatternChange(
      resizeSegmentPatternPreservingMutedTail(normalizedPattern, safeCycleDiv),
    );
  };
  const commitAll = () =>
    onPatternChange(Array.from({ length: safeCounterDiv }, () => 1));
  const commitOff = () =>
    onPatternChange(Array.from({ length: safeCounterDiv }, () => 0));
  const commitSinglePulse = () =>
    onPatternChange(
      Array.from({ length: safeCounterDiv }, (_, index) =>
        index === safeCounterDiv - 1 ? 1 : 0,
      ),
    );
  const commitAlternating = () =>
    onPatternChange(
      Array.from({ length: safeCounterDiv }, (_, index) =>
        index % 2 === 0 ? 1 : 0,
      ),
    );
  const presets = [
    ["Alle", commitAll],
    ["Stumm", commitOff],
    ["1 Impuls", commitSinglePulse],
    ["Wechsel", commitAlternating],
    ["Sync", commitCounterEqualsCycle],
  ] as const;
  const clockModeOptions = [
    ["fragment-compress", "Stauchend", "Figur verdichtet in jeden Slot"],
    ["mute-pattern", "Mute-Pattern", "Figur läuft voll, Slots maskieren"],
  ] as const;

  return (
    <div
      data-xensonar-root-follow-impulsraster-near-takt-interpretation="true"
      data-xensonar-root-follow-impulsraster-segment-pattern="true"
      data-xensonar-root-follow-impulsraster-beat-ratio="true"
      data-xensonar-root-follow-impulsraster-compact-front-end="true"
      data-xensonar-root-follow-impulsraster-overview-contained={
        expanded ? "true" : "collapsed"
      }
      title={ratioHelpText}
      className={`relative min-w-0 max-w-full rounded border p-2 text-[11px] text-violet-100/75 ${
        expanded
          ? "z-30 overflow-visible border-violet-600/70 bg-neutral-950/95 shadow-xl shadow-black/45"
          : "z-10 overflow-hidden border-violet-800/55 bg-violet-950/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/70">
            Impulsraster
          </div>
          <div className="mt-0.5 text-[10px] text-violet-100/45">
            {summaryText}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded border border-violet-800/50 px-2 py-0.5 text-[10px] text-violet-300/70 transition hover:bg-violet-950/40"
          aria-expanded={expanded}
          data-xensonar-root-follow-impulsraster-expand-toggle="true"
        >
          {expanded ? "Einklappen" : "Bearbeiten"}
        </button>
      </div>

      {expanded ? (
        <div
          className="mt-2 min-w-0 space-y-2"
          data-xensonar-root-follow-impulsraster-expanded-overview="true"
        >
          <div
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(2.5rem,auto)] items-end gap-2"
            data-xensonar-root-follow-impulsraster-ratio-row="true"
            title={ratioHelpText}
          >
            <label className="grid flex-1 gap-1 text-[10px] uppercase tracking-[0.12em] text-violet-100/55">
              <span>Beat durch</span>
              <input
                type="number"
                min={1}
                max={64}
                step={1}
                value={safeCycleDiv}
                onChange={(event) => commitCycleDiv(event.target.value)}
                className="w-full rounded border border-violet-800/65 bg-black/35 px-2 py-1 text-center text-violet-50 outline-none focus:border-violet-400"
                aria-label="Root Follow Impulsraster Basis-Takt Beat durch"
              />
            </label>
            <div className="pb-1.5 text-sm text-violet-300/50 select-none">
              :
            </div>
            <label className="grid flex-1 gap-1 text-[10px] uppercase tracking-[0.12em] text-violet-100/55">
              <span>Root-Follow</span>
              <input
                type="number"
                min={1}
                max={64}
                step={1}
                value={safeCounterDiv}
                onChange={(event) => commitCounterDiv(event.target.value)}
                className="w-full rounded border border-violet-800/65 bg-black/35 px-2 py-1 text-center text-violet-50 outline-none focus:border-violet-400"
                aria-label="Root Follow Impulsraster Root-Follow-Takt Verhältnis"
              />
            </label>
            <div className="min-w-[2.5rem] pb-1 text-right font-mono text-[11px] text-violet-200/60">
              {safeCycleDiv}/{safeCounterDiv}
            </div>
          </div>

          <div
            className="flex flex-wrap gap-1"
            data-xensonar-root-follow-impulsraster-presets="compact-flex"
          >
            {presets.map(([label, action]) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className="rounded border border-violet-900/60 bg-black/25 px-2.5 py-0.5 text-[10px] text-violet-200/65 transition hover:bg-violet-950/40"
              >
                {label}
              </button>
            ))}
          </div>

          <SegmentPatternGrid
            label="Root Follow Taktmuster"
            steps={normalizedPattern}
            tone="violet"
            maxColumns={ROOT_FOLLOW_IMPULSRASTER_PATTERN_COLUMNS}
            onChange={(steps) =>
              onPatternChange(
                normalizeRootFollowImpulseRasterPattern(steps, {
                  counterDiv: safeCounterDiv,
                  everyFallback: safeCounterDiv,
                }),
              )
            }
          />

          <div
            className="grid gap-1 rounded border border-violet-900/45 bg-black/15 p-2"
            data-xensonar-root-follow-lesart-no-overlap="true"
          >
            <span
              className="text-[10px] uppercase tracking-[0.14em] text-violet-100/55"
              title={`${clockModeLabel}${driftsAgainstCycle ? " · phasenwandert gegen Beat" : " · kongruent"}`}
            >
              Lesart
            </span>
            <div
              className="flex gap-1.5"
              data-xensonar-root-follow-impulsraster-clock-mode-toggle-group="true"
            >
              {clockModeOptions.map(([value, label, title]) => (
                <button
                  key={value}
                  type="button"
                  title={title}
                  onClick={() => onClockModeChange(value)}
                  data-xensonar-root-follow-impulsraster-clock-mode-select="true"
                  data-xensonar-root-follow-impulsraster-clock-mode-toggle="true"
                  className={`flex-1 rounded border py-1 text-xs transition ${
                    clockMode === value
                      ? "border-violet-400 bg-violet-700/45 text-violet-50"
                      : "border-violet-900/60 bg-black/20 text-violet-300/50 hover:bg-violet-900/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>{" "}
          </div>

          <div
            className="min-w-0 max-w-full space-y-1 overflow-hidden rounded border border-violet-900/55 bg-black/25 px-2 py-1"
            data-xensonar-root-follow-impulsraster-pip-preview="contained-grid"
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className="text-[10px] text-violet-100/45"
                title="Polyrhythmische Vorschau: mindestens vier Beat-Takte, damit Phasenwanderung erkennbar bleibt. Mehr Takte zeigen längere Muster, ohne die Segmentlogik selbst zu verändern."
              >
                Vorschau · Beat-Takte
              </div>
              <label
                className="inline-flex shrink-0 items-center gap-1 text-[10px] text-violet-100/45"
                title="Anzahl der Beat-Takte in der sichtbaren Vorschau. Mindestens 4, maximal 16."
              >
                <span>Takte</span>
                <input
                  type="number"
                  min={ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MIN_BARS}
                  max={ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MAX_BARS}
                  step={1}
                  value={previewBars}
                  onChange={(event) =>
                    setPreviewBars(
                      normalizeRootFollowImpulseRasterPreviewBars(
                        event.target.value,
                      ),
                    )
                  }
                  className="w-12 rounded border border-violet-900/60 bg-black/35 px-1 py-0.5 text-center text-[10px] text-violet-100 outline-none focus:border-violet-400"
                  aria-label="Root Follow Impulsraster Vorschau-Taktzahl"
                  data-xensonar-root-follow-impulsraster-preview-bars-input="true"
                />
              </label>
            </div>
            <div className="grid min-w-0 gap-2">
              {previewGroups.map((group, groupIndex) => {
                const previewColumns = Math.min(
                  ROOT_FOLLOW_IMPULSRASTER_PREVIEW_COLUMNS,
                  Math.max(1, group.length),
                );
                return (
                  <div
                    key={`${group}-${groupIndex}`}
                    className="grid max-w-full gap-0.5"
                    style={{
                      gridTemplateColumns: `repeat(${previewColumns}, minmax(0, 0.75rem))`,
                    }}
                    data-xensonar-root-follow-impulsraster-preview-group="wrapped"
                  >
                    {group.split("").map((step, stepIndex) => (
                      <div
                        key={`${groupIndex}-${stepIndex}-${step}`}
                        className={`h-3 w-3 rounded-sm ${
                          step === "X"
                            ? "border border-violet-300/65 bg-violet-500/85"
                            : "border border-violet-800/30 bg-violet-950/60"
                        }`}
                        title={`Takt ${groupIndex + 1}, Slot ${stepIndex + 1}: ${step === "X" ? "hörbar" : "stumm"}`}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
