export function numberSlider(args: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  warning?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label
      className={`block rounded border px-2 py-1 ${args.warning ? "border-amber-700/70 bg-amber-950/20" : "border-neutral-800 bg-neutral-950/55"}`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className={args.warning ? "text-amber-100" : "text-neutral-400"}>
          {args.label}
        </span>
        <span
          className={
            args.warning
              ? "font-mono text-amber-100"
              : "font-mono text-cyan-200"
          }
        >
          {args.format ? args.format(args.value) : String(args.value)}
        </span>
      </div>
      <input
        type="range"
        min={args.min}
        max={args.max}
        step={args.step}
        value={args.value}
        onChange={(event) => args.onChange(Number(event.currentTarget.value))}
        className="mt-1 w-full accent-cyan-400"
      />
      {args.warning ? (
        <div className="mt-1 text-[9px] text-amber-200/80">Grenzbereich</div>
      ) : null}
    </label>
  );
}
