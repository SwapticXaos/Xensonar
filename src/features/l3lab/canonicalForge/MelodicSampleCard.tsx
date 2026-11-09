import type * as React from 'react';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { formatMelodicSampleCardSummary } from './sampleDisplayText';

export type MelodicSampleCardProps = {
  sample: SavedMelodicSampleMeta;
  deleteMode: boolean;
  onDelete: (sampleId: string) => void;
  onOpenContextMenu: (sampleId: string, x: number, y: number) => void;
  onDragStart?: (sampleId: string) => void;
  onDragEnd?: () => void;
};

function seedSampleDrag(event: React.DragEvent<HTMLButtonElement>, sampleId: string) {
  event.dataTransfer.setData('application/xensonar-sample-id', sampleId);
  event.dataTransfer.setData('text/x-xensonar-sample-id', sampleId);
  event.dataTransfer.setData('text/plain', sampleId);
  event.dataTransfer.effectAllowed = 'copy';
}

export function MelodicSampleCard({
  sample,
  deleteMode,
  onDelete,
  onOpenContextMenu,
  onDragStart,
  onDragEnd,
}: MelodicSampleCardProps) {
  return (
    <button
      type="button"
      draggable={!deleteMode}
      onClick={(event) => {
        if (!deleteMode) return;
        event.preventDefault();
        event.stopPropagation();
        onDelete(sample.id);
      }}
      onDragStart={(event) => {
        if (deleteMode) {
          event.preventDefault();
          return;
        }
        onDragStart?.(sample.id);
        seedSampleDrag(event, sample.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (deleteMode) return;
        onOpenContextMenu(sample.id, event.clientX, event.clientY);
      }}
      className={`rounded border px-2 py-1.5 text-left ${deleteMode ? 'border-red-800 bg-red-950/20 text-red-100 hover:border-red-500' : 'border-neutral-800 bg-black/30 hover:border-neutral-700'}`}
      title={deleteMode ? 'Löschmodus aktiv · Klick entfernt dieses Sample' : 'Rechtsklick für Metadaten oder Bearbeiten · per Drag & Drop auf Instrument 1–4 ziehbar'}
    >
      <div className="font-medium text-neutral-200">{sample.name}</div>
      <div className="text-[10px] text-neutral-500">
        {formatMelodicSampleCardSummary(sample)}
      </div>
    </button>
  );
}
