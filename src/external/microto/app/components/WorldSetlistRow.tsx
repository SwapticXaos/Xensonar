import type { HarmonicWorld } from "../../domain/harmonicWorld";
import type { WorldSetlist } from "../../domain/worldSetlist";
import { exportMatchesWorld } from "../../domain/harmonicWorld";
import { SETLIST_ADD_ACTION, SETLIST_ADD_BUTTON_LABEL } from "../copy";

type WorldSetlistRowProps = {
  harmonicWorld: HarmonicWorld | null;
  setlist: WorldSetlist | null | undefined;
  onSetlistPrev?: () => void;
  onSetlistNext?: () => void;
  onSetlistSlotSelect?: (index: number) => void;
  onRemoveFromSetlist?: (index: number) => void;
  onAddCurrentToSetlist?: (world: HarmonicWorld) => void;
};

export function WorldSetlistRow({
  harmonicWorld,
  setlist,
  onSetlistPrev,
  onSetlistNext,
  onSetlistSlotSelect,
  onRemoveFromSetlist,
  onAddCurrentToSetlist,
}: WorldSetlistRowProps) {
  if (!setlist) return null;

  const hasSlots = setlist.slots.length > 0;
  const canAddCurrent = Boolean(harmonicWorld && onAddCurrentToSetlist && setlist.slots.length < 8);

  return (
    <>
      {hasSlots && (
        <div className="mt-1 flex flex-wrap gap-1 items-center">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Setlist</span>
          <button
            type="button"
            onClick={onSetlistPrev}
            className="px-1.5 py-0.5 border border-cyan-800 text-[9px] text-cyan-300 hover:border-cyan-500 hover:bg-cyan-900/40 disabled:opacity-40 disabled:pointer-events-none"
            title="Previous setlist slot (Ctrl+Shift+Left)"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={onSetlistNext}
            className="px-1.5 py-0.5 border border-cyan-800 text-[9px] text-cyan-300 hover:border-cyan-500 hover:bg-cyan-900/40 disabled:opacity-40 disabled:pointer-events-none"
            title="Next setlist slot (Ctrl+Shift+Right)"
          >
            ▶
          </button>
          {setlist.slots.map((slot, index) => {
            const isActive = !!harmonicWorld && exportMatchesWorld(slot, harmonicWorld);
            return (
              <div
                key={`setlist-${index}-${slot.exportedAt ?? slot.id ?? ""}`}
                className="flex items-center gap-0.5"
              >
                <button
                  type="button"
                  onClick={() => onSetlistSlotSelect?.(index)}
                  className={`px-2 py-0.5 border text-[10px] ${
                    isActive
                      ? "border-cyan-400 text-cyan-200 bg-cyan-500/20"
                      : "border-cyan-800 text-cyan-200 hover:border-cyan-500 hover:bg-cyan-900/40"
                  }`}
                  title={`${slot.label ?? slot.id ?? "Slot"} — click to load`}
                >
                  {index + 1}. {slot.label ?? slot.id ?? "World"}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFromSetlist?.(index)}
                  className="px-1 py-0.5 border border-cyan-800 text-[9px] text-cyan-300 hover:border-cyan-500 hover:bg-cyan-900/60"
                  title="Remove from setlist"
                  aria-label="Remove from setlist"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      {canAddCurrent && (
        <div className="flex gap-1 items-center">
          <button
            type="button"
            onClick={() => harmonicWorld && onAddCurrentToSetlist?.(harmonicWorld)}
            className="px-2 py-0.5 border border-cyan-700 text-[10px] text-cyan-200 hover:border-cyan-500 hover:bg-cyan-900/40"
            title={`${SETLIST_ADD_ACTION} (up to 8)`}
            aria-label={SETLIST_ADD_BUTTON_LABEL}
          >
            {SETLIST_ADD_BUTTON_LABEL}
          </button>
          {setlist.slots.length === 0 && (
            <span className="text-[9px] text-neutral-500">
              Build a setlist, then use ◀ ▶ or Ctrl+Shift+←/→ to step through.
            </span>
          )}
        </div>
      )}
    </>
  );
}

