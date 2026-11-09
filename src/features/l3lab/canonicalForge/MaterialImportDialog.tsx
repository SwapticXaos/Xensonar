import { CARRIER_INTEGRAL_PINK_VARIANTS } from './carrierIntegralPinkLaneBridge';
import type { CarrierIntegralPinkVariant } from './loopDrumDomain';
import { materialImportEntryUsesCarrierModeMenu, resolveCarrierMelodicImportModeAvailability, resolveCarrierMelodicImportModeAvailabilityMap } from './materialImportChannel';
import type { MaterialImportEntrySummary, MaterialImportLane } from './materialImportChannel';

type Props = {
  open: boolean;
  busy: boolean;
  entries: MaterialImportEntrySummary[];
  selectedId: string;
  anchorDraft: string;
  roundedAnchorPreview: { label: string; hz: number } | null;
  audioPaintVariant: CarrierIntegralPinkVariant;
  onAudioPaintVariantChange: (value: CarrierIntegralPinkVariant) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onAnchorDraftChange: (value: string) => void;
  onConfirm: () => Promise<void> | void;
  onRepairAudioPaintEntry?: (id: string) => Promise<void> | void;
  onEditAudioPaintEntry?: (id: string) => Promise<void> | void;
  actionMessage?: string | null;
};

const IMPORT_LANE_ORDER: Array<{ lane: MaterialImportLane; title: string; empty: string; hint: string }> = [
  {
    lane: 'audio-paint',
    title: 'Carrier-Feld / Hörfeld',
    empty: 'Noch keine aktive Carrier-Feldstruktur aus SpectralForge registriert.',
    hint: 'Fretless-Feld, zerstreut und monoton erzeugen strukturierte pinke Carrier-Figuren.',
  },
  {
    lane: 'raw-audio',
    title: 'Raw Audio',
    empty: 'Noch kein gerenderter Raw-Audio-Materialkörper vorhanden.',
    hint: 'Gerenderte Carrier- oder WAV-Körper als pinke Sample-/Materialbasis einsetzen.',
  },
];

export function MaterialImportDialog({
  open,
  busy,
  entries,
  selectedId,
  anchorDraft,
  roundedAnchorPreview,
  audioPaintVariant,
  onAudioPaintVariantChange,
  onClose,
  onSelect,
  onAnchorDraftChange,
  onConfirm,
  onRepairAudioPaintEntry,
  onEditAudioPaintEntry,
  actionMessage,
}: Props) {
  if (!open) return null;
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;
  const selectedHasCarrierModes = materialImportEntryUsesCarrierModeMenu(selectedEntry);
  const modeAvailabilityById = resolveCarrierMelodicImportModeAvailabilityMap(selectedEntry);
  const selectedMode = selectedHasCarrierModes ? audioPaintVariant : 'grained';
  const selectedModeAvailability = resolveCarrierMelodicImportModeAvailability(selectedEntry, selectedMode);
  const selectedModeIsRawAudio = selectedModeAvailability.kind === 'raw-audio';
  const selectedModeReady = selectedModeAvailability.ready;
  const selectedModeReason = selectedModeAvailability.reason ?? null;
  const confirmLabel = 'An Melodic Loop senden';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onClick={() => { if (!busy) onClose(); }}>
      <div className="w-full max-w-7xl rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80">Materialspur importieren</div>
            <div className="mt-1 text-base font-semibold text-fuchsia-50">Importkanal wählen</div>
            <div className="mt-1 text-fuchsia-100/75">Wähle den Carrier-/Materialkörper und dann den pinke-Spur-Modus: Fretless-Feld, zerstreut, Raw Audio oder monoton.</div>
          </div>
          <button type="button" onClick={() => { if (!busy) onClose(); }} className="rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40">×</button>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.36fr)]" data-xensonar-material-import-dialog-layout="lanes-left-controls-right" data-xensonar-material-import-selects-disabled="true">
          <div className="grid gap-4 lg:grid-cols-2" data-xensonar-material-import-lanes="side-by-side">
            {IMPORT_LANE_ORDER.map((group) => {
              const groupEntries = entries.filter((entry) => entry.lane === group.lane);
              const isWorkingReferenceLane = group.lane === 'raw-audio';
              return (
                <div key={group.lane} className={`rounded border p-3 ${isWorkingReferenceLane ? 'border-emerald-800/50 bg-emerald-950/10' : 'border-fuchsia-900/50 bg-fuchsia-950/20'}`} data-xensonar-material-import-lane={group.lane}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`mb-1 text-[10px] uppercase tracking-[0.25em] ${isWorkingReferenceLane ? 'text-emerald-100/75' : 'text-fuchsia-200/70'}`}>{group.title}</div>
                      <div className="mb-2 text-[10px] leading-relaxed text-fuchsia-100/60">{group.hint}</div>
                    </div>
                    {isWorkingReferenceLane ? (
                      <span className="shrink-0 rounded-full border border-emerald-700/50 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-emerald-100/75">aktiv</span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-fuchsia-800/50 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-fuchsia-100/60">Labor</span>
                    )}
                  </div>
                  <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                    {groupEntries.length === 0 ? (
                      <div className="rounded border border-dashed border-fuchsia-900/50 px-3 py-3 text-[11px] text-fuchsia-100/70">{group.empty}</div>
                    ) : groupEntries.map((entry, index) => {
                      const isSelected = entry.id === selectedId;
                      const isRepairableAudioPaint = entry.lane === 'audio-paint' && !entry.transferReady;
                      return (
                        <div
                          key={entry.id}
                          className={`rounded-xl border px-3 py-2 text-left transition ${!entry.transferReady ? 'opacity-90' : ''} ${isSelected ? 'border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-50' : 'border-neutral-800 bg-black/20 text-neutral-200 hover:bg-neutral-900/80'}`}
                          data-xensonar-material-import-audio-paint-repair={isRepairableAudioPaint ? 'visible' : undefined}
                        >
                          <button
                            type="button"
                            aria-disabled={!entry.transferReady}
                            disabled={busy}
                            onClick={() => onSelect(entry.id)}
                            className="w-full text-left disabled:cursor-not-allowed"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{entry.name}</div>
                              <div className="text-[10px] text-neutral-500">Platz {index + 1} · {entry.bars} Takte · {entry.role} · {entry.renderMode}</div>
                              {!entry.transferReady && entry.disabledReason ? (
                                <div className="mt-1 text-[10px] text-amber-200/80">{entry.disabledReason}</div>
                              ) : null}
                            </div>
                          </button>
                          {isRepairableAudioPaint ? (
                            <div className="mt-2 flex flex-wrap gap-2 border-t border-fuchsia-900/35 pt-2">
                              <button
                                type="button"
                                disabled={busy || !entry.canRebuildAudioPaint || !onRepairAudioPaintEntry}
                                onClick={() => void onRepairAudioPaintEntry?.(entry.id)}
                                className="rounded border border-pink-600/80 bg-pink-950/35 px-2.5 py-1 text-[10px] font-semibold text-pink-100 hover:bg-pink-900/35 disabled:cursor-not-allowed disabled:opacity-35"
                                title="Fretless-Pinkspur-Plan aus dem gespeicherten SpectralForge-Projekt neu berechnen und ohne Raumwechsel einsetzen."
                              >
                                Importieren
                              </button>
                              <button
                                type="button"
                                disabled={busy || !entry.canEditAudioPaint || !onEditAudioPaintEntry}
                                onClick={() => void onEditAudioPaintEntry?.(entry.id)}
                                className="rounded border border-cyan-700/80 bg-cyan-950/25 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-900/30 disabled:cursor-not-allowed disabled:opacity-35"
                                title="Figur in SpectralForge und in der Labor-Bibliothek öffnen."
                              >
                                Bearbeiten
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <aside className="flex flex-col gap-3" data-xensonar-material-import-controls="right-column">
            <div className="rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Vorläufige Startlage</div>
              <div className="mt-1 text-[10px] leading-relaxed text-fuchsia-100/75">Legt nur fest, wo die neue Spur zunächst erscheint. Der erste Drag oder Klick wählt die Anker-Griffstufe. Bei Raw Audio ist genau dort das unveränderte Roh-Audio ohne granulare Pitch-Modulation zu hören; danach bleibt normales Dragging vollständig aktiv.</div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={anchorDraft}
                  onChange={(event) => onAnchorDraftChange(event.target.value)}
                  placeholder="z. B. 55"
                  className="w-full rounded border border-fuchsia-900/60 bg-black/30 px-2 py-2 text-fuchsia-50"
                />
                <span className="text-xs text-fuchsia-100/75">Hz</span>
              </div>
              <div className="mt-2 rounded border border-fuchsia-900/40 bg-black/20 px-3 py-2 text-[10px] text-fuchsia-100/75">
                {roundedAnchorPreview ? `Startlage im Raster: ${roundedAnchorPreview.label} · ${roundedAnchorPreview.hz.toFixed(2)} Hz` : 'Noch kein aktives Pitch-Raster vorhanden.'}
              </div>
            </div>
            {selectedHasCarrierModes ? (
              <label className="block rounded border border-pink-900/50 bg-pink-950/20 p-3" data-xensonar-material-import-audio-paint-variant="true">
                <span className="text-[10px] uppercase tracking-[0.25em] text-pink-200/70">Pinke-Spur-Modus</span>
                <select
                  value={audioPaintVariant}
                  onChange={(event) => onAudioPaintVariantChange(event.currentTarget.value as CarrierIntegralPinkVariant)}
                  className="mt-2 w-full rounded border border-pink-900/70 bg-black/40 px-2 py-2 text-pink-50"
                >
                  {CARRIER_INTEGRAL_PINK_VARIANTS.map((variant) => {
                    const availability = modeAvailabilityById[variant.id];
                    const disabledBySelectedEntry = !availability.ready;
                    return (
                      <option key={variant.id} value={variant.id} disabled={!variant.enabled || disabledBySelectedEntry}>
                        {variant.label}{variant.enabled && !disabledBySelectedEntry ? '' : ' · nicht verfügbar'}
                      </option>
                    );
                  })}
                </select>
                <span className="mt-1 block text-[10px] text-pink-100/60">
                  {CARRIER_INTEGRAL_PINK_VARIANTS.find((variant) => variant.id === audioPaintVariant)?.description ?? 'Pinkspur-Modus'}
                </span>
              </label>
            ) : (
              <div className="rounded border border-emerald-900/45 bg-emerald-950/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-100/75">Raw-Audio Pfad</div>
                <div className="mt-1 text-[10px] leading-relaxed text-emerald-50/65">Dieser Eintrag nutzt den Materialspur-Importvertrag.</div>
              </div>
            )}
            <div className="flex flex-col gap-2 rounded border border-fuchsia-900/40 bg-fuchsia-950/20 p-3">
              {actionMessage ? (
                <div className="rounded border border-amber-800/60 bg-amber-950/25 px-2 py-1.5 text-[10px] text-amber-100" data-xensonar-material-import-action-message="true">{actionMessage}</div>
              ) : null}
              <div className="text-[10px] leading-relaxed text-fuchsia-100/75">
                {selectedModeReason
                  ? selectedModeReason
                  : selectedHasCarrierModes
                    ? selectedModeIsRawAudio
                      ? 'Raw Audio übernimmt den gerenderten Klangkörper als pinke Sample-/Materialspur.'
                      : 'Dieser Modus schreibt eine strukturierte pinke Carrier-Figur in den Melodic Loop.'
                    : 'Raw-Audio wird als Materialbasis importiert; längere Materialien erweitern die Taktzahl.'}
              </div>
              {selectedEntry ? (
                <div className="text-[10px] text-fuchsia-100/55">{selectedEntry.bpm.toFixed(1)} BPM · {selectedEntry.bars} Takte</div>
              ) : null}
              <button
                type="button"
                disabled={!selectedEntry || !selectedModeReady || busy}
                onClick={() => void onConfirm()}
                className="mt-auto w-full rounded border border-fuchsia-700 bg-fuchsia-950/35 px-3 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-900/35 disabled:opacity-40"
              >
                {confirmLabel}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
