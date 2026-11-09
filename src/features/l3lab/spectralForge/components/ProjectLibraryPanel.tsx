import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { saveForgeProject } from '../projectLibrary';

export default function ProjectLibraryPanel() {
  const createProjectSnapshot = useStore((s) => s.createProjectSnapshot);
  const materialExportName = useStore((s) => s.materialExport.name);
  const [projectName, setProjectName] = useState(materialExportName || 'spectral-forge-project');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (materialExportName) setProjectName(materialExportName);
  }, [materialExportName]);

  const saveNew = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const meta = await saveForgeProject({ name: projectName, snapshot: createProjectSnapshot() });
      setProjectName(meta.name);
      setMessage('Gesichert · ' + meta.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Projekt konnte nicht gespeichert werden');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2 rounded border border-neutral-800 bg-black/20 p-2" data-xensonar-project-library-save-only="true">
      <label className="block space-y-1 text-[11px] text-neutral-400">
        <span className="uppercase tracking-[0.2em] text-neutral-500">Projektname</span>
        <input
          value={projectName}
          onChange={(event) => setProjectName(event.currentTarget.value)}
          className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveNew()}
        className="w-full rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50"
      >
        Als neues Projekt sichern
      </button>
      {message ? <div className="text-[10px] text-emerald-200">{message}</div> : null}
      {error ? <div className="text-[10px] text-red-200">{error}</div> : null}
    </section>
  );
}
