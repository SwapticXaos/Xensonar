export const MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT = 'xensonar:melodic-sample-library-updated';
export const MELODIC_SAMPLE_LIBRARY_STATUS_EVENT = 'xensonar:melodic-sample-library-status';

export type MelodicSampleLibraryUpdatedDetail = {
  reason: 'save' | 'delete' | 'update';
  sampleId?: string;
  name?: string;
};

export type MelodicSampleLibraryStatusDetail = {
  kind: 'upgrade_blocked';
  message: string;
};

export function notifyMelodicSampleLibraryUpdated(detail: MelodicSampleLibraryUpdatedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MelodicSampleLibraryUpdatedDetail>(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, { detail }));
}

export function notifyMelodicSampleLibraryStatus(detail: MelodicSampleLibraryStatusDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MelodicSampleLibraryStatusDetail>(MELODIC_SAMPLE_LIBRARY_STATUS_EVENT, { detail }));
}
