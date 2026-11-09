import { useEffect, useMemo, useState } from 'react';
import type { StampData } from '../audio/SpectralData';
import { deleteCustomStamp, saveCustomStamp, useCustomStampLibrary } from '../customStampLibrary';
import { useStore } from '../state/store';
import {
  CUSTOM_STAMP_LIBRARY_EMPTY_MESSAGE,
  formatCurrentStampSummary,
  formatCustomStampCountLabel,
  formatCustomStampEntryMeta,
  resolveCustomStampEntryClass,
  resolveCustomStampExpandGlyph,
  resolveSendStampButtonLabel,
} from './customStampLibrary/customStampLibraryUiModel';

interface CustomStampLibraryPanelProps {
  onSendStampAsMelodicSample?: (args: { name: string; stampData: StampData }) => Promise<void> | void;
}

export default function CustomStampLibraryPanel({ onSendStampAsMelodicSample }: CustomStampLibraryPanelProps) {
  const stampData = useStore((s) => s.stampData);
  const setStampData = useStore((s) => s.setStampData);
  const setStampPhase = useStore((s) => s.setStampPhase);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const resetStampTransform = useStore((s) => s.resetStampTransform);
  const entries = useCustomStampLibrary((state) => state.entries);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stampName, setStampName] = useState('custom-stamp');
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentFlash, setSentFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEntry = useMemo(() => entries.find((entry) => entry.id === selectedId) ?? null, [entries, selectedId]);

  useEffect(() => {
    if (selectedEntry) {
      setStampName(selectedEntry.name);
    }
  }, [selectedEntry]);

  useEffect(() => {
    if (!selectedId && entries.length > 0) setSelectedId(entries[0].id);
  }, [entries, selectedId]);

  useEffect(() => {
    if (!sentFlash) return undefined;
    const timeout = window.setTimeout(() => setSentFlash(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [sentFlash]);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stempelbibliothek fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const loadEntry = () => {
    if (!selectedEntry) return;
    setActiveTool('stamp');
    setStampData({
      width: selectedEntry.stamp.width,
      height: selectedEntry.stamp.height,
      data: selectedEntry.stamp.data.slice(),
      grainData: selectedEntry.stamp.grainData.slice(),
    });
    resetStampTransform();
    setStampPhase('stamping');
  };

  const saveNew = () => withBusy(async () => {
    if (!stampData) throw new Error('Es gibt aktuell keinen Stempel zum Sichern');
    const entry = await saveCustomStamp({ name: stampName, stamp: stampData });
    setSelectedId(entry.id);
    setStampName(entry.name);
  });

  const saveCurrent = () => withBusy(async () => {
    if (!stampData) throw new Error('Es gibt aktuell keinen Stempel zum Sichern');
    const entry = await saveCustomStamp({ id: selectedId ?? undefined, name: stampName, stamp: stampData });
    setSelectedId(entry.id);
    setStampName(entry.name);
  });

  const deleteEntry = () => withBusy(async () => {
    if (!selectedId) return;
    await deleteCustomStamp(selectedId);
    setSelectedId(null);
  });

  const sendStampAsMelodicSample = () => withBusy(async () => {
    if (!stampData) throw new Error('Es gibt aktuell keinen Stempel zum Senden');
    if (!onSendStampAsMelodicSample) throw new Error('Melodic-Loop-Sampleweg ist hier nicht verfügbar');
    await onSendStampAsMelodicSample({
      name: stampName,
      stampData,
    });
    setSentFlash(true);
  });

  return (
    <section
      className="space-y-2 rounded border border-neutral-800 bg-black/20 p-2"
      data-xensonar-custom-stamp-library-collapsible="true"
      data-xensonar-custom-stamp-library-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Custom-Stempelbibliothek</div>
          </div>
        <div className="flex items-center gap-2 text-[10px] text-cyan-300">
          <span>{formatCustomStampCountLabel(entries.length)}</span>
          <span className="rounded border border-neutral-700 px-1.5 py-0.5 text-neutral-300">{resolveCustomStampExpandGlyph(expanded)}</span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-2" data-xensonar-custom-stamp-library-body="true">
          <label className="block space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.2em] text-neutral-500">Stempelname</span>
            <input value={stampName} onChange={(e) => setStampName(e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
            <button type="button" disabled={busy || !stampData} onClick={() => void saveNew()} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50">aktuellen Stempel neu sichern</button>
            <button type="button" disabled={busy || !stampData || !onSendStampAsMelodicSample} onClick={() => void sendStampAsMelodicSample()} className="rounded border border-violet-700/70 bg-violet-950/30 px-2 py-1 text-violet-100 hover:bg-violet-900/30 disabled:opacity-50">{resolveSendStampButtonLabel(sentFlash)}</button>
            <button type="button" disabled={busy || !stampData} onClick={() => void saveCurrent()} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">ausgewählten überschreiben</button>
            <button type="button" disabled={!selectedEntry} onClick={loadEntry} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">in Stempelwerkzeug laden</button>
            <button type="button" disabled={busy || !selectedEntry} onClick={() => void deleteEntry()} className="rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-50">aus Datenbank löschen</button>
          </div>

          {stampData && (
            <div className="rounded border border-neutral-800 bg-neutral-950/40 px-2 py-1 text-[10px] text-neutral-500">
              {formatCurrentStampSummary(stampData)}
            </div>
          )}

          {error && <div className="rounded border border-red-900/70 bg-red-950/40 px-2 py-1 text-[11px] text-red-200">{error}</div>}

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {entries.length === 0 && (
              <div className="rounded border border-dashed border-neutral-800 px-3 py-3 text-[11px] text-neutral-500">
                {CUSTOM_STAMP_LIBRARY_EMPTY_MESSAGE}
              </div>
            )}
            {entries.map((entry) => {
              const selected = entry.id === selectedId;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`block w-full rounded border p-2 text-left ${resolveCustomStampEntryClass(selected)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm text-neutral-100">{entry.name}</div>
                      <div className="text-[10px] text-neutral-500">{formatCustomStampEntryMeta(entry)}</div>
                    </div>
                    <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] text-neutral-400">nur Forge</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
