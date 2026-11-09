import { useEffect, type MutableRefObject } from "react";
import type { GlobalShortcutHandler } from "./useInputRouter";

type CopyWorldRefLike = { copyWorld: () => void; copyLink?: () => void } | null;

export type UseGlobalShortcutsArgs<RoomId extends string> = {
  /** Ref to install the global shortcut handler; useInputRouter calls it before room dispatch (vision §8 single listener). */
  handlerRef: MutableRefObject<GlobalShortcutHandler | null>;
  topNavRooms: readonly { id: RoomId }[];
  setRoom: (room: RoomId) => void;
  /** When set, "?" (no modifiers) toggles legend; avoids duplicate keydown listener (vision §8). */
  legendToggleRef?: MutableRefObject<(() => void) | null>;
  /** When set, any key not handled by shortcuts dismisses first-run hint; avoids duplicate keydown (vision §8). */
  firstRunDismissRef?: MutableRefObject<(() => void) | null>;
  copyWorldRef?: MutableRefObject<CopyWorldRefLike>;
  /** When provided, Ctrl+Shift+S runs Surprise me (load random world). */
  surpriseWorldRef?: MutableRefObject<(() => void) | null>;
  /** When provided, Ctrl+Shift+R runs Surprise scene (load random scene and open Synth). */
  onSurpriseScene?: () => void;
  /** When provided, Ctrl+Shift+T runs Surprise similar (random scene in same mood/tuning family). */
  onSurpriseSimilarScene?: () => void;
  /** When provided, Ctrl+Shift+G runs Surprise goal (random practice goal, world-first, then scene). */
  onSurpriseGoal?: () => void;
  /** When provided, Ctrl+Shift+F runs Surprise flow (random training flow, world-first, then scene). */
  onSurpriseFlow?: () => void;
  /** When provided, Ctrl+Shift+Right runs setlist next (performance setlist). */
  setlistNext?: () => void;
  /** When provided, Ctrl+Shift+Left runs setlist prev (performance setlist). */
  setlistPrev?: () => void;
  /** When provided, Ctrl+Shift+A adds current harmonic world to setlist (vision §2 §3 §5). */
  onAddCurrentToSetlistRef?: MutableRefObject<(() => void) | null>;
  /** When provided, Ctrl+Q cycles to next quantize/groove preset (vision §3 §5). */
  onCycleQuantizeNext?: () => void;
  /** When provided, Ctrl+Shift+Q cycles to previous quantize/groove preset. */
  onCycleQuantizePrev?: () => void;
  /** When provided, Ctrl+Shift+N loads next scene in current practice goal and opens Synth (vision §3 §5). */
  onNextInGoal?: () => void;
  /** When provided, Ctrl+Shift+Down loads next Resonance scene in catalog order (vision §5 discoverability). */
  onNextScene?: () => void;
  /** When provided, Ctrl+Shift+Up loads previous Resonance scene in catalog order. */
  onPrevScene?: () => void;
  /** When set by Resonance room, Ctrl+Shift+1/2/3 jump to pinned signature interval 1/2/3 (vision §3 harmonic first-class). */
  signatureShortcutRef?: MutableRefObject<{ goToSignatureIndex: (i: number) => void } | null>;
  /** When provided, Ctrl+Alt+1..9 jump to Resonance scene 1–9 by catalog index (vision §5 discoverability). */
  onSceneJumpByIndex?: (oneBasedIndex: number) => void;
};

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  const tag = el?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function useGlobalShortcuts<RoomId extends string>({
  handlerRef,
  topNavRooms,
  setRoom,
  legendToggleRef,
  firstRunDismissRef,
  copyWorldRef,
  surpriseWorldRef,
  onSurpriseScene,
  onSurpriseSimilarScene,
  onSurpriseGoal,
  onSurpriseFlow,
  setlistNext,
  setlistPrev,
  onAddCurrentToSetlistRef,
  onCycleQuantizeNext,
  onCycleQuantizePrev,
  onNextInGoal,
  onNextScene,
  onPrevScene,
  signatureShortcutRef,
  onSceneJumpByIndex,
}: UseGlobalShortcutsArgs<RoomId>) {
  useEffect(() => {
    const onKeyDown: GlobalShortcutHandler = (e) => {
      if (isEditableTarget(e.target)) return false;

      if (e.ctrlKey && e.altKey && !e.shiftKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const oneBased = e.key.charCodeAt(0) - 48;
        onSceneJumpByIndex?.(oneBased);
        return true;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        legendToggleRef?.current?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        onNextInGoal?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        onNextScene?.();
        return true;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        onPrevScene?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "Q") {
        e.preventDefault();
        onCycleQuantizePrev?.();
        return true;
      }
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        onCycleQuantizeNext?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        copyWorldRef?.current?.copyWorld?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        copyWorldRef?.current?.copyLink?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        surpriseWorldRef?.current?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        onSurpriseScene?.();
        return true;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        onSurpriseSimilarScene?.();
        return true;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        onSurpriseGoal?.();
        return true;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        onSurpriseFlow?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        setlistNext?.();
        return true;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "ArrowLeft") {
        e.preventDefault();
        setlistPrev?.();
        return true;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        onAddCurrentToSetlistRef?.current?.();
        return true;
      }

      if (e.ctrlKey && e.shiftKey && (e.key === "1" || e.key === "2" || e.key === "3")) {
        e.preventDefault();
        const i = e.key === "1" ? 0 : e.key === "2" ? 1 : 2;
        signatureShortcutRef?.current?.goToSignatureIndex(i);
        return true;
      }

      if (e.altKey) {
        const k = e.key;
        if (k >= "1" && k <= "9") {
          const idx = k.charCodeAt(0) - 49;
          const entry = topNavRooms[idx];
          if (entry) {
            e.preventDefault();
            setRoom(entry.id);
            return true;
          }
        } else if (k === "0") {
          const entry = topNavRooms[9];
          if (entry) {
            e.preventDefault();
            setRoom(entry.id);
            return true;
          }
        } else if (k === "-") {
          const entry = topNavRooms[10];
          if (entry) {
            e.preventDefault();
            setRoom(entry.id);
            return true;
          }
        }
      }

      if (firstRunDismissRef?.current) {
        firstRunDismissRef.current();
        return true;
      }
      return false;
    };

    handlerRef.current = onKeyDown;
    return () => {
      handlerRef.current = null;
    };
  }, [handlerRef, topNavRooms, setRoom, legendToggleRef, firstRunDismissRef, copyWorldRef, surpriseWorldRef, onSurpriseScene, onSurpriseSimilarScene, setlistNext, setlistPrev, onAddCurrentToSetlistRef, onCycleQuantizeNext, onCycleQuantizePrev, onNextInGoal, onNextScene, onPrevScene, signatureShortcutRef, onSceneJumpByIndex]);
}

