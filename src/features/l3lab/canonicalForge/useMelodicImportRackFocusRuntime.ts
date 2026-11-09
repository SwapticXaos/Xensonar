import * as React from 'react';

export function useMelodicImportRackFocusRuntime(args: {
  importBodyRackRef: React.RefObject<HTMLDivElement | null>;
  melodicImportRackFocusNonce: number;
  melodicImportRackUserScrollCancelRef: React.MutableRefObject<number>;
  showMaterialImportMenu: boolean;
}) {
  React.useEffect(() => {
    if (args.melodicImportRackFocusNonce <= 0 || !args.showMaterialImportMenu) return;
    const target = args.importBodyRackRef.current;
    if (!target) return;
    const cancelToken = args.melodicImportRackUserScrollCancelRef.current + 1;
    args.melodicImportRackUserScrollCancelRef.current = cancelToken;
    let cancelledByUser = false;
    const cancel = () => {
      cancelledByUser = true;
      args.melodicImportRackUserScrollCancelRef.current = cancelToken + 1;
    };
    window.addEventListener('wheel', cancel, { capture: true, passive: true });
    window.addEventListener('touchmove', cancel, { capture: true, passive: true });
    window.addEventListener('keydown', cancel, true);
    const frame = window.requestAnimationFrame(() => {
      if (cancelledByUser || args.melodicImportRackUserScrollCancelRef.current !== cancelToken || !args.showMaterialImportMenu) return;
      args.importBodyRackRef.current?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    });
    return () => {
      cancelledByUser = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('wheel', cancel, true);
      window.removeEventListener('touchmove', cancel, true);
      window.removeEventListener('keydown', cancel, true);
    };
  }, [
    args.importBodyRackRef,
    args.melodicImportRackFocusNonce,
    args.melodicImportRackUserScrollCancelRef,
    args.showMaterialImportMenu,
  ]);
}
