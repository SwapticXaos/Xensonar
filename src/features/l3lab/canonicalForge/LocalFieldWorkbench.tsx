import * as React from 'react';
import type { LoopComposerState, LoopNoteEvent } from './loopDrumDomain';
import { ensureLocalFieldState, type LocalFieldModuleState } from './localField';
import { LocalFieldEditorPanel } from './LocalFieldEditorPanel';

type Props = {
  selectedNote: LoopNoteEvent;
  onMutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string) => void;
  title?: string;
  description?: string;
  statusDescription?: string;
};

export function LocalFieldWorkbench({
  selectedNote,
  onMutateLoopComposer,
  title = 'Lokaler Editor',
  description = 'Tonhöhe und Lautstärke haben in diesem Block eigene Kurven. Du wechselst im Editor nur die Ansicht, nicht dieselbe gespeicherte Linie.',
  statusDescription = 'Tonhöhe und Lautstärke starten jeweils auf ihrer eigenen Null-Linie. Malen und Morph / Warp greifen immer nur die gerade sichtbare Kurve dieses Blocks an.',
}: Props) {
  const commitField = React.useCallback((nextField: LocalFieldModuleState, statusMessage?: string) => {
    onMutateLoopComposer((draft) => {
      const note = draft.notes.find((entry) => entry.id === selectedNote.id);
      if (!note) return;
      note.localField = ensureLocalFieldState(nextField);
    }, statusMessage);
  }, [onMutateLoopComposer, selectedNote.id]);

  return (
    <LocalFieldEditorPanel
      historyKey={selectedNote.id}
      fieldInput={selectedNote.localField}
      title={title}
      description={description}
      statusDescription={statusDescription}
      onCommit={commitField}
    />
  );
}
