import { useEffect } from 'react';
import { reportXensonarPromiseFailure } from '@/features/xensonar/diagnostics/runtimeIssueReporter';
import { listSavedMelodicSamples, type SavedMelodicSampleMeta } from './melodicSampleLibrary';
import {
  MELODIC_SAMPLE_LIBRARY_STATUS_EVENT,
  MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT,
  type MelodicSampleLibraryStatusDetail,
} from '../melodicSamples/melodicSampleLibraryEvents';

export function useCanonicalForgeMelodicSampleLibraryLifecycle(args: {
  setMelodicSampleEntries: (entries: SavedMelodicSampleMeta[]) => void;
  setStatus: (status: string) => void;
}): void {
  const { setMelodicSampleEntries, setStatus } = args;

  useEffect(() => {
    const refreshMelodicSampleEntries = () => {
      void listSavedMelodicSamples()
        .then(setMelodicSampleEntries)
        .catch((error) => {
          reportXensonarPromiseFailure('samples', 'canonical-library-sample-list-refresh', error);
          setStatus('Sample-Datenbank konnte nicht geladen werden.');
        });
    };
    const handleMelodicSampleLibraryStatus = (event: Event) => {
      const detail = (event as CustomEvent<MelodicSampleLibraryStatusDetail>).detail;
      if (!detail?.message) return;
      setStatus(detail.message);
    };
    refreshMelodicSampleEntries();
    window.addEventListener(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, refreshMelodicSampleEntries as EventListener);
    window.addEventListener(MELODIC_SAMPLE_LIBRARY_STATUS_EVENT, handleMelodicSampleLibraryStatus as EventListener);
    return () => {
      window.removeEventListener(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, refreshMelodicSampleEntries as EventListener);
      window.removeEventListener(MELODIC_SAMPLE_LIBRARY_STATUS_EVENT, handleMelodicSampleLibraryStatus as EventListener);
    };
  }, [setMelodicSampleEntries, setStatus]);
}
