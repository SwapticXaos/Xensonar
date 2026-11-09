import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import type { WorkspacePackageImportMode } from './packageCore';

export type PackageImportLauncherArgs = {
  onImportFile: (args: { file: File; mode: WorkspacePackageImportMode }) => Promise<void> | void;
};

export function usePackageImportLauncher(args: PackageImportLauncherArgs) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingImportModeRef = useRef<WorkspacePackageImportMode>('merge');
  const [isImporting, setIsImporting] = useState(false);

  const requestImport = useCallback((mode: WorkspacePackageImportMode) => {
    pendingImportModeRef.current = mode;
    inputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsImporting(true);
    try {
      await args.onImportFile({ file, mode: pendingImportModeRef.current });
    } finally {
      setIsImporting(false);
    }
  }, [args]);

  return {
    inputRef,
    isImporting,
    pendingImportModeRef,
    requestImport,
    handleFileInputChange,
  };
}
