import { useEffect } from 'react';
import { REQUEST_MATERIAL_IMPORT_DIALOG_EVENT } from './materialImportChannel';
import type { CanonicalForgeWorkspace,CanonicalLogicView } from './sessionTypes';

export function useCanonicalForgeMaterialImportRequestBridge(args: {
  applyLogicView: (nextView: CanonicalLogicView) => void;
  setActiveWorkspace: (workspace: CanonicalForgeWorkspace | ((current: CanonicalForgeWorkspace) => CanonicalForgeWorkspace)) => void;
  setMaterialImportRequestNonce: (updater: (value: number) => number) => void;
}) {
  const { applyLogicView, setActiveWorkspace, setMaterialImportRequestNonce } = args;

  useEffect(() => {
    const handleRequestMaterialImport = () => {
      setActiveWorkspace('microtonal-logic');
      applyLogicView('melodic');
      setMaterialImportRequestNonce((value) => value + 1);
    };
    window.addEventListener(REQUEST_MATERIAL_IMPORT_DIALOG_EVENT, handleRequestMaterialImport as EventListener);
    return () => window.removeEventListener(REQUEST_MATERIAL_IMPORT_DIALOG_EVENT, handleRequestMaterialImport as EventListener);
  }, [applyLogicView, setActiveWorkspace, setMaterialImportRequestNonce]);
}
