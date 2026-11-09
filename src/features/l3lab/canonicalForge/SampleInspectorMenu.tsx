import * as React from 'react';
import type { LocalFieldModuleState } from './localField';
import { LocalFieldEditorPanel } from './LocalFieldEditorPanel';
import { describeMelodicSamplePitchAnchor, type SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { useSampleInspectorMenuPosition } from './useSampleInspectorMenuPosition';
import {
  getSampleEnvelopeEditorCopy,
  parseOptionalPositiveHzDraft,
  parsePositiveSecondsDraft,
  type SampleEnvelopeEditorTarget,
  type SampleInspectorSection,
  type SampleTempoModeDraft,
} from './sampleInspectorMenuActions';
import { formatSampleTempoSummary } from './sampleDisplayText';

type SampleInspectorMenuProps = {
  sample: SavedMelodicSampleMeta;
  menuRef: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  sampleBaseHzDraft: string;
  sampleDurationDraft: string;
  sampleTempoModeDraft: SampleTempoModeDraft;
  onClose: () => void;
  onSampleBaseHzDraftChange: (value: string) => void;
  onSampleDurationDraftChange: (value: string) => void;
  onSampleTempoModeDraftChange: (value: SampleTempoModeDraft) => void;
  onDeleteSample: (sampleId: string) => void;
  onRenameSample: (sampleId: string, name: string) => void;
  onUpdateMelodicSampleBaseHz: (sampleId: string, baseHz: number | null) => void;
  onUpdateMelodicSampleEnvelope: (sampleId: string, target: 'volumeEnvelope' | 'pitchEnvelope', field: LocalFieldModuleState | null) => void;
  onPreviewMelodicSampleReferencePitch: (sampleId: string, overrideBaseHz?: number | null) => Promise<void> | void;
  onSetMelodicSampleTempoProfile: (sampleId: string, options: { tempoPitchLinked: boolean; playbackDurationSec: number | null }) => void;
  onPreviewMelodicSampleTempoProfile: (sampleId: string, playbackDurationSec: number) => Promise<void> | void;
};

export function SampleInspectorMenu({
  sample,
  menuRef,
  x,
  y,
  sampleBaseHzDraft,
  sampleDurationDraft,
  sampleTempoModeDraft,
  onClose,
  onSampleBaseHzDraftChange,
  onSampleDurationDraftChange,
  onSampleTempoModeDraftChange,
  onDeleteSample,
  onRenameSample,
  onUpdateMelodicSampleBaseHz,
  onUpdateMelodicSampleEnvelope,
  onPreviewMelodicSampleReferencePitch,
  onSetMelodicSampleTempoProfile,
  onPreviewMelodicSampleTempoProfile,
}: SampleInspectorMenuProps) {
  const [section, setSection] = React.useState<SampleInspectorSection>('meta');
  const [sampleNameDraft, setSampleNameDraft] = React.useState(sample.name);

  React.useEffect(() => {
    setSampleNameDraft(sample.name);
  }, [sample.id, sample.name]);
  const [editorTarget, setEditorTarget] = React.useState<SampleEnvelopeEditorTarget>('volume');

  React.useEffect(() => {
    setSection('meta');
    setEditorTarget('volume');
  }, [sample.id]);

  const fallbackMenuWidth = section === 'edit' ? 860 : 740;
  const editorCopy = getSampleEnvelopeEditorCopy(editorTarget);
  const menuPosition = useSampleInspectorMenuPosition({
    menuRef,
    anchorX: x,
    anchorY: y,
    fallbackMenuWidth,
    repositionKeys: [section, sample.id],
  });

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 rounded border border-neutral-700 bg-neutral-950/95 p-3 shadow-2xl ${section === 'edit' ? 'min-w-[720px] max-w-[min(92vw,980px)]' : 'min-w-[560px] max-w-[min(94vw,740px)]'}`}
      style={{ left: menuPosition.left, top: menuPosition.top, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Sample-Inspector</div>
          <div className="mt-1 text-sm font-semibold text-neutral-100">{sample.name}</div>
          <div className="mt-1 text-[11px] text-neutral-500">Bibliotheksbezogene Bearbeitungen bleiben am Sample selbst hängen und laufen damit über Projekte hinweg konsistent mit. Song-spezifische Glissandi oder nur für einen Block gedachte Variationen bleiben besser im Block-Menü als lokales Feld.</div>
        </div>
        <button type="button" className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-900" onClick={onClose}>Schließen</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <button
          type="button"
          className={`rounded border px-2 py-1 ${section === 'meta' ? 'border-cyan-600 bg-cyan-950/35 text-cyan-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
          onClick={() => setSection('meta')}
        >
          Metadaten
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 ${section === 'edit' ? 'border-fuchsia-600 bg-fuchsia-950/35 text-fuchsia-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
          onClick={() => setSection('edit')}
        >
          Bearbeiten
        </button>
        <button
          type="button"
          className="rounded border border-emerald-700/70 px-2 py-1 text-emerald-100 hover:bg-emerald-950/30"
          onClick={() => void onPreviewMelodicSampleReferencePitch(sample.id, sample.baseHz ?? null)}
        >
          Vorhören
        </button>
      </div>

      {section === 'meta' ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded border border-neutral-800 bg-black/20 p-2 md:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Sample-Name</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={sampleNameDraft}
                onChange={(event) => setSampleNameDraft(event.target.value)}
                className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-100"
              />
              <button
                type="button"
                className="rounded border border-cyan-700/70 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-950/30"
                onClick={() => onRenameSample(sample.id, sampleNameDraft)}
              >
                Umbenennen
              </button>
            </div>
          </div>

          <div className="rounded border border-neutral-800 bg-black/20 p-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Pitchbasis / Pitchanker</div>
            <div className="mt-1 text-[11px] text-neutral-400">{describeMelodicSamplePitchAnchor(sample)}</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={sampleBaseHzDraft}
                onChange={(event) => onSampleBaseHzDraftChange(event.target.value)}
                placeholder="z. B. 220.00"
                className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-100"
              />
              <span className="text-xs text-neutral-500">Hz</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-900" onClick={() => {
                const nextBaseHz = parseOptionalPositiveHzDraft(sampleBaseHzDraft);
                if (nextBaseHz === undefined) return;
                onUpdateMelodicSampleBaseHz(sample.id, nextBaseHz);
                void onPreviewMelodicSampleReferencePitch(sample.id, nextBaseHz);
              }}>{sample.baseHzSource === 'manual' ? 'Pitchanker übernehmen & vorhören' : 'Pitchbasis übernehmen & vorhören'}</button>
              <button type="button" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900" onClick={() => {
                onSampleBaseHzDraftChange(sample.baseHz ? sample.baseHz.toFixed(2) : '');
                void onPreviewMelodicSampleReferencePitch(sample.id, sample.baseHz ?? null);
              }}>Aktuellen Zustand vorhören</button>
            </div>
          </div>

          <div className="mt-3 rounded border border-neutral-800 bg-black/20 p-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Playback-Profil dieses Samples</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs ${sampleTempoModeDraft === 'linked' ? 'border-violet-600 bg-violet-950/35 text-violet-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
                onClick={() => onSampleTempoModeDraftChange('linked')}
              >
                Pitch und Tempo gekoppelt
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs ${sampleTempoModeDraft === 'decoupled' ? 'border-cyan-600 bg-cyan-950/35 text-cyan-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
                onClick={() => onSampleTempoModeDraftChange('decoupled')}
              >
                Pitch stabil, Tempo frei
              </button>
            </div>
            {sampleTempoModeDraft === 'decoupled' ? (
              <div className="mt-3 space-y-2">
                <label className="block text-[11px] text-neutral-400">
                  Ziellänge in Sekunden
                  <input
                    type="text"
                    value={sampleDurationDraft}
                    onChange={(event) => onSampleDurationDraftChange(event.target.value)}
                    className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-100"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded border border-cyan-700/70 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-950/30" onClick={() => {
                    const seconds = parsePositiveSecondsDraft(sampleDurationDraft);
                    if (seconds === null) return;
                    void onPreviewMelodicSampleTempoProfile(sample.id, seconds);
                  }}>Tempo-Vorhören (3 Lagen)</button>
                  <button type="button" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-900" onClick={() => {
                    const seconds = parsePositiveSecondsDraft(sampleDurationDraft);
                    if (seconds === null) return;
                    onSetMelodicSampleTempoProfile(sample.id, { tempoPitchLinked: false, playbackDurationSec: seconds });
                  }}>Profil für dieses Sample übernehmen</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-900" onClick={() => onSetMelodicSampleTempoProfile(sample.id, { tempoPitchLinked: true, playbackDurationSec: null })}>Für dieses Sample gekoppelt übernehmen</button>
                <button type="button" className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900" onClick={() => void onPreviewMelodicSampleReferencePitch(sample.id, sample.baseHz ?? null)}>Gekoppelten Zustand vorhören</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 rounded border border-fuchsia-900/40 bg-fuchsia-950/15 px-3 py-2 text-[11px] text-fuchsia-100/78">
            <div className="uppercase tracking-[0.14em] text-fuchsia-300/80">Bearbeiten</div>
            <div className="mt-1">Hier veränderst du das Sample selbst. Alle Projekte, die dieses Sample benutzen, lesen dann dieselbe Hüllkurve. Für projekt- oder blockbezogene Spezialfälle bleibt das Block-Menü der bessere Ort.</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              className={`rounded border px-2 py-1 ${editorTarget === 'volume' ? 'border-fuchsia-600 bg-fuchsia-950/35 text-fuchsia-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
              onClick={() => setEditorTarget('volume')}
            >
              Hüllkurve Volume
            </button>
            <button
              type="button"
              className={`rounded border px-2 py-1 ${editorTarget === 'pitch' ? 'border-cyan-600 bg-cyan-950/35 text-cyan-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
              onClick={() => setEditorTarget('pitch')}
            >
              Hüllkurve Pitch
            </button>
          </div>
          <div className="mt-3">
            <LocalFieldEditorPanel
              historyKey={`${sample.id}:${editorTarget}`}
              fieldInput={editorTarget === 'volume' ? (sample.volumeEnvelope ?? null) : (sample.pitchEnvelope ?? null)}
              fixedTarget={editorCopy.fixedTarget}
              title={editorCopy.title}
              description={editorCopy.description}
              statusDescription={editorCopy.statusDescription}
              onCommit={(nextField) => onUpdateMelodicSampleEnvelope(sample.id, editorTarget === 'volume' ? 'volumeEnvelope' : 'pitchEnvelope', nextField)}
            />
          </div>
        </>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-neutral-500">{describeMelodicSamplePitchAnchor(sample)} · {formatSampleTempoSummary(sample)}</div>
        <button type="button" className="rounded border border-rose-700/70 px-2 py-1 text-xs text-rose-100 hover:bg-rose-950/30" onClick={() => { onDeleteSample(sample.id); onClose(); }}>Löschen</button>
      </div>
    </div>
  );
}
