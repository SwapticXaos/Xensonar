import * as React from 'react';
/**
 * On-screen keyboard legend per room. Vision: "controls understandable from on-screen panels and keyboard legend."
 * Compact, non-intrusive; avoids modal dead-ends (project-vision.txt Quality Goals).
 * Press ? to toggle expanded (discoverability). Toggle is routed via legendToggleRef (vision §8 single keydown).
 */

import { useEffect, useRef, useState } from "react";
import type { Room } from "../roomRegistry";
import { ROOM_SHORTCUTS, GLOBAL_SHORTCUTS } from "../keyboardLegend";
import { SHORTCUTS_LEGEND_LABEL } from "../copy";

type KeyboardLegendProps = {
  room: Room;
  /** When set, register toggle here so global shortcut handler can call it (single keydown; vision §8). */
  legendToggleRef?: React.MutableRefObject<(() => void) | null>;
};

export function KeyboardLegend({ room, legendToggleRef }: KeyboardLegendProps) {
  const [expanded, setExpanded] = useState(false);
  const roomEntries = ROOM_SHORTCUTS[room] ?? [];
  const entries = [...GLOBAL_SHORTCUTS, ...roomEntries];
  const setExpandedRef = useRef(setExpanded);
  setExpandedRef.current = setExpanded;

  useEffect(() => {
    if (!legendToggleRef) return;
    legendToggleRef.current = () => setExpandedRef.current((prev) => !prev);
    return () => {
      legendToggleRef.current = null;
    };
  }, [legendToggleRef]);

  if (entries.length === 0) return null;

  return (
    <div className="border-b border-neutral-800 bg-neutral-900/50">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-4 py-1.5 flex items-center justify-between text-left text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-[11px] uppercase tracking-wider">{SHORTCUTS_LEGEND_LABEL}</span>
        <span className="text-neutral-500 text-[10px]">{expanded ? "▼" : "▶"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-2 pt-0 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400">
          {entries.map(({ keys, action }, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono border border-neutral-700">
                {keys}
              </kbd>
              <span>{action}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
