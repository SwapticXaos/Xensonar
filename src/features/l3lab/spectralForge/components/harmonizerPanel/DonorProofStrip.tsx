import type { DonorProofKind } from '../../donorV2/donorHearingPlayback';

export type DonorProofSelection = DonorProofKind | 'carrier';

export function DonorProofStrip({
  ready, active, similarity, eventCount, onSelect,
}: {
  ready: boolean;
  active: DonorProofSelection | null;
  similarity?: number;
  eventCount?: number;
  onSelect?: (kind: DonorProofSelection) => void;
}) {
  const entries: Array<[DonorProofSelection, string, string]> = [
    ['original', 'Original', 'Markierter Donor-Klangkörper'],
    ['reconstruction', 'Modell', 'Rekonstruktion ohne Carrier'],
    ['transposed', '+7', 'Rekonstruktion sieben Halbtöne höher'],
    ['carrier', 'Figur', 'Donor-Körper in der gemalten Figur'],
  ];
  return (
    <div className="mt-2 rounded border border-violet-900/60 bg-black/25 p-2" aria-label="Donor-Vergleichsstrecke">
      <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400">
        <span>Original → Modell → Ton → Figur</span>
        {Number.isFinite(similarity) ? <span title="Spektrale Rekonstruktionsähnlichkeit">{Math.round((similarity ?? 0) * 100)}%</span> : null}
      </div>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {entries.map(([kind, label, title]) => (
          <button key={kind} type="button" disabled={!ready || !onSelect}
            aria-pressed={active === kind} title={title}
            onClick={() => onSelect?.(kind)}
            className={`min-h-8 rounded border px-1 text-[10px] ${active === kind ? 'border-violet-300 bg-violet-800 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-violet-600'} disabled:cursor-not-allowed disabled:opacity-40`}>
            {label}
          </button>
        ))}
      </div>
      {(eventCount ?? 0) > 1 ? <div className="mt-1 text-[10px] text-amber-200">Stärkster von {eventCount} Klangkörpern verwendet</div> : null}
    </div>
  );
}
