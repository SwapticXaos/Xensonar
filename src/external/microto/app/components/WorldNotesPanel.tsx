import * as React from 'react';
import { useEffect, useState } from "react";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { getWorldNote, setWorldNote } from "../../domain/worldNotes";

type WorldNotesPanelProps = {
  world: HarmonicWorld | null | undefined;
};

export function WorldNotesPanel({ world }: WorldNotesPanelProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(getWorldNote(world ?? null));
  }, [world]);

  if (!world || (!world.id && !world.label)) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    setWorldNote(world, next);
  };

  return (
    <div className="mt-1 border border-neutral-800 bg-neutral-950/80 p-2 rounded-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[9px] uppercase tracking-widest text-neutral-500">
          World Notes
        </span>
        <span className="text-[9px] text-neutral-600 truncate max-w-[160px]">
          {world.label ?? world.id}
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        rows={2}
        placeholder="Jot down ideas, setlist notes, or performance cues for this world…"
        className="w-full bg-black/60 border border-neutral-800 text-[10px] text-neutral-200 rounded-sm px-1.5 py-1 resize-y min-h-[40px] focus:outline-none focus:border-neutral-500"
      />
    </div>
  );
}

