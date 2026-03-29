import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteMaterialEntry, updateMaterialEntry, useMaterialLibrary, type MaterialRole } from '../../materialLibrary';
import { useStore } from '../state/store';

type SortMode = 'created-desc' | 'name-asc' | 'role';

function formatDate(value: number): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

const ROLE_LABELS: Record<MaterialRole, string> = {
  loop: 'Loop',
  waveMaterial: 'Wellenstarter-Material',
  particleExciter: 'Partikel-Exciter',
  droneTexture: 'Drone-Textur',
};

export default function MaterialLibraryPanel() {
  const entries = useMaterialLibrary((state) => state.entries);
  const updateMaterialExport = useStore((s) => s.updateMaterialExport);
  const materialExportName = useStore((s) => s.materialExport.name);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftRole, setDraftRole] = useState<MaterialRole>('loop');
  const [sortMode, setSortMode] = useState<SortMode>('created-desc');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sortedEntries = useMemo(() => {
    const next = [...entries];
    switch (sortMode) {
      case 'name-asc':
        next.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
        break;
      case 'role':
        next.sort((a, b) => a.role.localeCompare(b.role, 'de', { sensitivity: 'base' }) || b.createdAt - a.createdAt);
        break;
      case 'created-desc':
      default:
        next.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }
    return next;
  }, [entries, sortMode]);

  const selectedEntry = useMemo(() => entries.find((entry) => entry.id === selectedId) ?? null, [entries, selectedId]);

  useEffect(() => {
    if (!selectedEntry) return;
    setDraftName(selectedEntry.name);
    setDraftRole(selectedEntry.role);
  }, [selectedEntry]);

  useEffect(() => {
    if (!selectedId && entries.length > 0) {
      setSelectedId(entries[0].id);
    }
  }, [entries, selectedId]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Materialbibliothek fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const applyChanges = () => withBusy(async () => {
    if (!selectedId) return;
    await updateMaterialEntry(selectedId, { name: draftName, role: draftRole });
  });

  const adoptNameToCurrent = () => {
    if (!selectedEntry) return;
    updateMaterialExport({ name: selectedEntry.name, role: selectedEntry.role });
  };

  const useCurrentNameForSelected = () => withBusy(async () => {
    if (!selectedId) return;
    await updateMaterialEntry(selectedId, { name: materialExportName, role: draftRole });
  });

  const removeSelected = () => withBusy(async () => {
    if (!selectedId) return;
    await deleteMaterialEntry(selectedId);
    setSelectedId((prev) => (prev === selectedId ? null : prev));
  });

  const previewEntry = (blobUrl: string) => {
    if (audioRef.current && audioRef.current.src === blobUrl) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(blobUrl);
    audioRef.current = audio;
    void audio.play().catch(() => {});
  };

  return (
    <section className="space-y-3 rounded border border-neutral-800 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Materialdatenbank</div>
          <div className="text-xs text-neutral-400">Exportierte Forge-Ergebnisse umbenennen, umrollen und wiederfinden. Nur Rolle „Loop“ taucht in Room V als Materialspur auf.</div>
        </div>
        <div className="text-[10px] text-cyan-300">{entries.length} Einträge</div>
      </div>

      <label className="flex items-center justify-between gap-2 text-xs text-neutral-400">
        <span className="uppercase tracking-[0.2em] text-neutral-500">Sortierung</span>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
          <option value="created-desc">zuletzt exportiert</option>
          <option value="name-asc">Name A–Z</option>
          <option value="role">Rolle</option>
        </select>
      </label>

      {selectedEntry && (
        <div className="space-y-2 rounded border border-neutral-800 bg-neutral-950/40 p-2">
          <label className="block space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.2em] text-neutral-500">Materialname</span>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
          </label>
          <label className="block space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.2em] text-neutral-500">Rolle</span>
            <select value={draftRole} onChange={(e) => setDraftRole(e.target.value as MaterialRole)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
              {(Object.keys(ROLE_LABELS) as MaterialRole[]).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => void applyChanges()} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50">Änderungen sichern</button>
            <button type="button" disabled={busy} onClick={() => void useCurrentNameForSelected()} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">aktuellen Forge-Namen übernehmen</button>
            <button type="button" onClick={adoptNameToCurrent} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">Name → Forge-Feld</button>
            <button type="button" onClick={() => previewEntry(selectedEntry.blobUrl)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">vorhören</button>
            <button type="button" disabled={busy} onClick={() => void removeSelected()} className="col-span-2 rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-50">aus Datenbank löschen</button>
          </div>
          <div className="text-[10px] leading-relaxed text-neutral-500">
            {selectedEntry.bars} Takte · {Math.round(selectedEntry.bpm)} BPM · {ROLE_LABELS[selectedEntry.role]} · {selectedEntry.renderMode} · exportiert {formatDate(selectedEntry.createdAt)}
          </div>
        </div>
      )}

      {error && <div className="rounded border border-red-900/70 bg-red-950/40 px-2 py-1 text-[11px] text-red-200">{error}</div>}

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {sortedEntries.length === 0 && (
          <div className="rounded border border-dashed border-neutral-800 px-3 py-3 text-[11px] text-neutral-500">
            Noch keine exportierten Forge-Materialien in der Datenbank.
          </div>
        )}
        {sortedEntries.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedId(entry.id)}
              className={`block w-full rounded border p-2 text-left ${selected ? 'border-cyan-600/70 bg-cyan-950/20' : 'border-neutral-800 bg-neutral-950/40'}`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm text-neutral-100">{entry.name}</div>
                    <div className="mt-1 text-[10px] text-neutral-500">{ROLE_LABELS[entry.role]} · {entry.bars} Takte · {Math.round(entry.bpm)} BPM</div>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] ${entry.role === 'loop' ? 'bg-cyan-950/40 text-cyan-300' : 'bg-neutral-900 text-neutral-400'}`}>{entry.role === 'loop' ? 'Room V' : 'nur Forge'}</span>
                </div>
                <div className="text-[10px] text-neutral-500">exportiert {formatDate(entry.createdAt)} · {entry.renderMode}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
