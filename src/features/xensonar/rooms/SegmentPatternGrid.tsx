import { normalizeSegmentPatternSteps } from '../rhythmSegmentPattern';

type SegmentPatternGridTone = 'neutral' | 'violet';

type SegmentPatternGridProps = {
  label: string;
  steps: readonly number[];
  tone?: SegmentPatternGridTone;
  maxColumns?: number;
  onChange: (steps: number[]) => void;
};

const toneClasses = {
  neutral: {
    on: 'border-emerald-500 bg-emerald-800/60 text-emerald-100',
    off: 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:bg-neutral-800',
  },
  violet: {
    on: 'border-violet-400 bg-violet-700/55 text-violet-50',
    off: 'border-violet-900/70 bg-violet-950/35 text-violet-300/45 hover:bg-violet-900/45',
  },
} as const;

export function SegmentPatternGrid({
  label,
  steps,
  tone = 'neutral',
  maxColumns = 16,
  onChange,
}: SegmentPatternGridProps) {
  const normalized = normalizeSegmentPatternSteps(steps, steps.length || 1);
  const classes = toneClasses[tone];
  const columns = Math.min(maxColumns, Math.max(1, normalized.length));
  const buttonHeight =
    normalized.length <= 4 ? 'h-8' : normalized.length <= 8 ? 'h-7' : 'h-6';
  return (
    <div
      data-xensonar-shared-segment-pattern-grid="true"
      className="grid min-w-0 max-w-full gap-1 rounded border border-neutral-800 bg-neutral-950/60 p-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {normalized.map((isOn, index) => (
        <button
          key={`${label}-${normalized.length}-${index}`}
          type="button"
          onClick={() => {
            const next = normalized.map((value, stepIndex) => (stepIndex === index ? (value === 0 ? 1 : 0) : value));
            onChange(next);
          }}
          className={`${buttonHeight} rounded border text-center text-[10px] leading-none transition flex items-center justify-center ${isOn !== 0 ? classes.on : classes.off}`}
          aria-label={`${label} Segment ${index + 1}: ${isOn !== 0 ? 'an' : 'aus'}`}
          title={`Segment ${index + 1} ${isOn !== 0 ? 'deaktivieren' : 'aktivieren'}`}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
