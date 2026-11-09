import { useEffect, useMemo, useState } from 'react';
import { reportXensonarPromiseFailure } from '@/features/xensonar/diagnostics/runtimeIssueReporter';
import { listSavedMelodicSamples, type SavedMelodicSampleMeta } from '../l3lab/canonicalForge/melodicSampleLibrary';
import { MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT } from '../l3lab/melodicSamples/melodicSampleLibraryEvents';
import { buildResidentSoundMenuGroups } from './residentSoundMenuModel';

export function useMyzelResidentWorkbenchUiState() {
  const [residentSampleEntries, setResidentSampleEntries] = useState<SavedMelodicSampleMeta[]>([]);
  const [residentWorkbenchSentAt, setResidentWorkbenchSentAt] = useState<number | null>(null);

  useEffect(() => {
    let disposed = false;
    const refreshResidentSampleEntries = () => {
      void listSavedMelodicSamples()
        .then((entries) => {
          if (!disposed) setResidentSampleEntries(entries);
        })
        .catch((error) => {
          reportXensonarPromiseFailure('samples', 'myzel-sample-list-refresh', error);
          if (!disposed) setResidentSampleEntries([]);
        });
    };
    refreshResidentSampleEntries();
    window.addEventListener(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, refreshResidentSampleEntries as EventListener);
    return () => {
      disposed = true;
      window.removeEventListener(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, refreshResidentSampleEntries as EventListener);
    };
  }, []);

  useEffect(() => {
    if (residentWorkbenchSentAt === null) return;
    const timeout = window.setTimeout(() => setResidentWorkbenchSentAt(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [residentWorkbenchSentAt]);

  const residentSoundMenuGroups = useMemo(
    () => buildResidentSoundMenuGroups(residentSampleEntries),
    [residentSampleEntries],
  );

  return {
    residentSoundMenuGroups,
    residentWorkbenchSendConfirmed: residentWorkbenchSentAt !== null,
    markResidentWorkbenchSent: () => setResidentWorkbenchSentAt(Date.now()),
  };
}
