import { useEffect, type MutableRefObject } from 'react';

type StampTransformKeyHandler = (event: KeyboardEvent, scopeMode: 'strict' | 'fallback') => boolean;

function isEditableKeyboardTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element && (
    element instanceof HTMLInputElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLSelectElement
    || element.isContentEditable
  );
}

export function useCanonicalForgeHotkeyBridge({
  forgeHotkeyScopeActiveRef,
  performActiveUndo,
  performActiveRedo,
  handleStampTransformKey,
}: {
  forgeHotkeyScopeActiveRef: MutableRefObject<boolean>;
  performActiveUndo: () => void;
  performActiveRedo: () => void;
  handleStampTransformKey: StampTransformKeyHandler;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!forgeHotkeyScopeActiveRef.current) return;
      if (isEditableKeyboardTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (event.ctrlKey || event.metaKey) {
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault();
          performActiveUndo();
          return;
        }
        if (key === 'y' || (key === 'z' && event.shiftKey)) {
          event.preventDefault();
          performActiveRedo();
          return;
        }
      }

      handleStampTransformKey(event, 'fallback');
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [forgeHotkeyScopeActiveRef, performActiveUndo, performActiveRedo, handleStampTransformKey]);
}
