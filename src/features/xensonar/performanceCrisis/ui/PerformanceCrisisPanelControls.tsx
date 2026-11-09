import { PERFORMANCE_CRISIS_PRESETS } from "../performanceCrisisPresetRegistry";
import type {
  CrisisQuantizationGridSelection,
  CrisisQuantizationModeSelection,
  PerformanceCrisisPresetId,
} from "../performanceCrisisTypes";
import {
  QUANTIZATION_GRID_OPTIONS,
  QUANTIZATION_MODE_OPTIONS,
  clampSegmentsPerBar,
  coerceQuantizationGridValue,
  coerceQuantizationModeValue,
  formatQuantizationGridLabel,
} from "../performanceCrisisPanelModel";

export type TruthStatus = "wirksam" | "projektion" | "vormerkung";

const TRUTH_STATUS_CLASS: Record<TruthStatus, string> = {
  wirksam: "border-emerald-500/35 bg-emerald-950/20 text-emerald-100",
  projektion: "border-sky-500/30 bg-sky-950/15 text-sky-100",
  vormerkung: "border-amber-500/30 bg-amber-950/15 text-amber-100",
};

export function TruthPill({ status }: { status: TruthStatus }) {
  const label =
    status === "wirksam"
      ? "wirksam"
      : status === "projektion"
        ? "nur nach Übernahme"
        : "Vormerkung";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${TRUTH_STATUS_CLASS[status]}`}
      data-crisis-truth-status={status}
    >
      {label}
    </span>
  );
}

export function TruthLine({
  status,
  title,
  children,
}: {
  status: TruthStatus;
  title: string;
  children: string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-[11px] leading-relaxed ${TRUTH_STATUS_CLASS[status]}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-[0.18em]">
          {title}
        </span>
        <TruthPill status={status} />
      </div>
      <div>{children}</div>
    </div>
  );
}

export type PolicyLineValue = string | number | boolean;

export type PolicyLineItem = {
  label: string;
  value: PolicyLineValue;
  key?: string;
};

export function PolicyLine({
  label,
  value,
}: {
  label: string;
  value: PolicyLineValue;
}) {
  return (
    <div className="rounded border border-neutral-800 bg-black/35 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-neutral-200">
        {typeof value === "boolean" ? (value ? "ja" : "nein") : value}
      </div>
    </div>
  );
}



export function PolicyLineGrid({
  lines,
  className,
}: {
  lines: readonly PolicyLineItem[];
  className: string;
}) {
  return (
    <div className={className}>
      {lines.map((line) => (
        <PolicyLine
          key={line.key ?? line.label}
          label={line.label}
          value={line.value}
        />
      ))}
    </div>
  );
}

export function PresetSelect({
  value,
  presetIds,
  label,
  onChange,
  formatOptionLabel,
}: {
  value: PerformanceCrisisPresetId;
  presetIds: readonly PerformanceCrisisPresetId[];
  label: string;
  onChange: (presetId: PerformanceCrisisPresetId) => void;
  formatOptionLabel?: (presetId: PerformanceCrisisPresetId) => string;
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value as PerformanceCrisisPresetId)
      }
      className="rounded-lg border border-violet-500/40 bg-black px-3 py-2 text-xs text-violet-100"
      aria-label={label}
    >
      {presetIds.map((presetId) => {
        const preset = PERFORMANCE_CRISIS_PRESETS[presetId];
        return (
          <option key={presetId} value={presetId}>
            {formatOptionLabel?.(presetId) ?? preset.label}
          </option>
        );
      })}
    </select>
  );
}

export function QuantizationControls({
  title,
  mode,
  grid,
  customSegments,
  onModeChange,
  onGridChange,
  onCustomSegmentsChange,
}: {
  title: string;
  mode: CrisisQuantizationModeSelection;
  grid: CrisisQuantizationGridSelection;
  customSegments: number;
  onModeChange: (mode: CrisisQuantizationModeSelection) => void;
  onGridChange: (grid: CrisisQuantizationGridSelection) => void;
  onCustomSegmentsChange: (segments: number) => void;
}) {
  return (
    <div
      className="rounded-lg border border-neutral-800 bg-black/20 p-2 text-[11px] text-neutral-400"
      data-crisis-quantization-controls={title}
    >
      <div className="mb-2 uppercase tracking-[0.18em] text-neutral-500">
        {title}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            Modus
          </span>
          <select
            value={coerceQuantizationModeValue(mode)}
            onChange={(event) =>
              onModeChange(
                event.target.value as CrisisQuantizationModeSelection,
              )
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-neutral-200"
          >
            {QUANTIZATION_MODE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            Raster
          </span>
          <select
            value={coerceQuantizationGridValue(grid)}
            onChange={(event) =>
              onGridChange(
                event.target.value as CrisisQuantizationGridSelection,
              )
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-neutral-200"
          >
            {QUANTIZATION_GRID_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            other: Taktsegmente
          </span>
          <input
            type="number"
            min={1}
            max={256}
            value={customSegments}
            onChange={(event) =>
              onCustomSegmentsChange(
                clampSegmentsPerBar(Number(event.target.value)),
              )
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-neutral-200"
          />
        </label>
      </div>
    </div>
  );
}

export function ParticleCanonicalQuantizationControls({
  mode,
  canonicalGrid,
  onModeChange,
}: {
  mode: CrisisQuantizationModeSelection;
  canonicalGrid: CrisisQuantizationGridSelection;
  onModeChange: (mode: CrisisQuantizationModeSelection) => void;
}) {
  return (
    <div
      className="rounded-lg border border-neutral-800 bg-black/20 p-2 text-[11px] text-neutral-400"
      data-particle-time-under-pressure="zeit-echo-canonical-grid"
    >
      <div className="mb-2 uppercase tracking-[0.18em] text-neutral-500">
        Partikel-Zeit unter Druck
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            Krisenmodus
          </span>
          <select
            value={coerceQuantizationModeValue(mode)}
            onChange={(event) =>
              onModeChange(
                event.target.value as CrisisQuantizationModeSelection,
              )
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-neutral-200"
          >
            {QUANTIZATION_MODE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded border border-neutral-800 bg-neutral-950/55 p-2">
          <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            Raster aus Zeit &amp; Echo
          </div>
          <div className="text-neutral-200">
            {formatQuantizationGridLabel(canonicalGrid)}
          </div>
          <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            Kein zweites Partikel-Raster im Krisenmanager: Fallback/Strikt
            benutzt dieselbe Partikel-Zeit, die oben in Zeit &amp; Echo steht.
          </div>
        </div>
      </div>
    </div>
  );
}
