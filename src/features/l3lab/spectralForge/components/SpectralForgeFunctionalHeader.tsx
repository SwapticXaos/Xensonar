export type SpectralForgeFunctionalHeaderProps = {
  bars: number;
  guideSegments: number;
  backLabel: string;
  showImageImport: boolean;
  onBarsChange: (value: number) => void;
  onGuideSegmentsChange: (value: number) => void;
  onBack: () => void;
  onOpenImageImport: () => void;
};

function clampSpectralMeterValue(
  value: number,
  min: number,
  max: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function SpectralForgeMeterNumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300">
      <span className="uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => {
          const raw = event.currentTarget.value.trim();
          if (raw === "") return;
          const nextValue = Number(raw);
          if (!Number.isFinite(nextValue)) return;
          onChange(nextValue);
        }}
        className="h-6 w-12 rounded border border-neutral-700 bg-black px-1.5 text-right font-mono text-[11px] text-emerald-100"
      />
    </label>
  );
}

export default function SpectralForgeFunctionalHeader({
  bars,
  guideSegments,
  backLabel,
  showImageImport,
  onBarsChange,
  onGuideSegmentsChange,
  onBack,
  onOpenImageImport,
}: SpectralForgeFunctionalHeaderProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300"
      data-xensonar-spectralforge-functional-header="true"
    >
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1"
        aria-label="Arbeitsfolge"
      >
        <span className="font-semibold text-neutral-100">SpectralForge</span>
        <ol className="flex flex-wrap items-center gap-1 text-[10px] text-neutral-400">
          {["Zeichnen", "Klangmaterial", "Hören", "Ausgabe"].map(
            (step, index) => (
              <li key={step} className="flex items-center gap-1">
                <span aria-hidden="true" className="text-violet-400">
                  {index + 1}
                </span>
                {step}
                {index < 3 && (
                  <span aria-hidden="true" className="px-1 text-neutral-600">
                    →
                  </span>
                )}
              </li>
            ),
          )}
        </ol>
      </div>
      <SpectralForgeMeterNumberControl
        label="Takte"
        value={bars}
        min={1}
        max={16}
        onChange={(value) =>
          onBarsChange(clampSpectralMeterValue(value, 1, 16, bars))
        }
      />
      <SpectralForgeMeterNumberControl
        label="Taktsegmente"
        value={guideSegments}
        min={1}
        max={16}
        onChange={(value) =>
          onGuideSegmentsChange(
            clampSpectralMeterValue(value, 1, 16, guideSegments),
          )
        }
      />
      <button
        type="button"
        onClick={onBack}
        className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900"
      >
        {backLabel}
      </button>
      {showImageImport ? (
        <button
          type="button"
          onClick={onOpenImageImport}
          className="border border-fuchsia-700 bg-fuchsia-950/35 px-3 py-1.5 text-fuchsia-100 hover:bg-fuchsia-900/35"
          title="Eigenen Bildimport für SpectralForge öffnen"
        >
          Bild importieren
        </button>
      ) : null}
    </div>
  );
}
