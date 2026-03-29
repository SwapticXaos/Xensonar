import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { deleteForgeProject, loadForgeProject, saveForgeProject, useForgeProjectLibrary, type ForgeProjectMeta } from '../projectLibrary';

type SortMode = 'updated-desc' | 'created-desc' | 'name-asc';

function formatDate(value: number): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ProjectLibraryPanel() {
  const createProjectSnapshot = useStore((s) => s.createProjectSnapshot);
  const loadProjectSnapshot = useStore((s) => s.loadProjectSnapshot);
  const materialExportName = useStore((s) => s.materialExport.name);
  const activeTool = useStore((s) => s.activeTool);
  const entries = useForgeProjectLibrary((s) => s.entries);

  const [projectName, setProjectName] = useState(materialExportName || 'spectral-forge-project');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('updated-desc');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && materialExportName) setProjectName(materialExportName);
  }, [materialExportName, selectedId]);

  const sortedEntries = useMemo(() => {
    const next = [...entries];
    switch (sortMode) {
      case 'name-asc':
        next.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
        break;
      case 'created-desc':
        next.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'updated-desc':
      default:
        next.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }
    return next;
  }, [entries, sortMode]);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Projektvorgang fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const saveNew = () => withBusy(async () => {
    const meta = await saveForgeProject({
      name: projectName,
      snapshot: createProjectSnapshot(),
    });
    setSelectedId(meta.id);
    setProjectName(meta.name);
  });

  const saveCurrent = () => withBusy(async () => {
    if (!selectedId) {
      await saveNew();
      return;
    }
    const meta = await saveForgeProject({
      id: selectedId,
      name: projectName,
      snapshot: createProjectSnapshot(),
    });
    setSelectedId(meta.id);
    setProjectName(meta.name);
  });

  const loadEntry = (entry: ForgeProjectMeta) => withBusy(async () => {
    const snapshot = await loadForgeProject(entry.id);
    loadProjectSnapshot(snapshot);
    setSelectedId(entry.id);
    setProjectName(entry.name);
  });

  const deleteEntry = (entry: ForgeProjectMeta) => withBusy(async () => {
    await deleteForgeProject(entry.id);
    if (selectedId === entry.id) {
      setSelectedId(null);
      setProjectName(materialExportName || 'spectral-forge-project');
    }
  });

  return (
    <section className="space-y-3 rounded border border-neutral-800 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Projektbibliothek</div>
          <div className="text-xs text-neutral-400">Forge-Zustände sichern, laden, sortieren und löschen.</div>
        </div>
        <div className="text-[10px] text-cyan-300">Tool: {activeTool}</div>
      </div>

      <label className="block space-y-1 text-xs text-neutral-400">
        <span className="uppercase tracking-[0.2em] text-neutral-500">Projektname</span>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
        />
      </label>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <button type="button" disabled={busy} onClick={saveNew} className="border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50">
          Als neues Projekt sichern
        </button>
        <button type="button" disabled={busy} onClick={saveCurrent} className="border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">
          Ausgewähltes aktualisieren
        </button>
      </div>

      <label className="flex items-center justify-between gap-2 text-xs text-neutral-400">
        <span className="uppercase tracking-[0.2em] text-neutral-500">Sortierung</span>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
          <option value="updated-desc">zuletzt geändert</option>
          <option value="created-desc">zuletzt erstellt</option>
          <option value="name-asc">Name A–Z</option>
        </select>
      </label>

      {error && <div className="rounded border border-red-900/70 bg-red-950/40 px-2 py-1 text-[11px] text-red-200">{error}</div>}

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {sortedEntries.length === 0 && (
          <div className="rounded border border-dashed border-neutral-800 px-3 py-3 text-[11px] text-neutral-500">
            Noch keine Forge-Projekte gespeichert.
          </div>
        )}
        {sortedEntries.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <div key={entry.id} className={`rounded border p-2 ${selected ? 'border-cyan-600/70 bg-cyan-950/20' : 'border-neutral-800 bg-neutral-950/40'}`}>
              <div className="space-y-2">
                <button type="button" onClick={() => void loadEntry(entry)} className="block w-full text-left">
                  <div className="text-sm text-neutral-100">{entry.name}</div>
                  <div className="mt-1 text-[10px] text-neutral-500">{entry.bars} Takte · {entry.bpm} BPM · Tool {entry.activeTool}</div>
                </button>
                <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                  <span>erstellt {formatDate(entry.createdAt)}</span>
                  <span>geändert {formatDate(entry.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-end">
                  <button type="button" onClick={() => void deleteEntry(entry)} className="rounded border border-red-900/70 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-950/40">
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
