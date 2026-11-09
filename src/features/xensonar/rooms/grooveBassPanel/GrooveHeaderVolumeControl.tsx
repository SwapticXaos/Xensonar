export function GrooveHeaderVolumeControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded border border-neutral-800 bg-black/25 px-2 py-1 text-[10px] leading-tight text-neutral-300">
      <div className="mb-1 flex items-center justify-between gap-2"><span>{label}</span><span className="text-neutral-500">{Math.round(value * 100)}%</span></div>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(parseFloat(event.target.value))} className="w-full cursor-pointer accent-fuchsia-500" />
    </label>
  );
}

