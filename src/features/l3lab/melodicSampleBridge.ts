import type { CommittedLoopPayload } from './materialIntake/types';

export const MELODIC_SAMPLE_FROM_RAW_SELECTION_EVENT = 'xensonar:melodic-sample-from-raw-selection';
export const MELODIC_SAMPLE_FROM_BLOB_EVENT = 'xensonar:melodic-sample-from-blob';
export const MELODIC_SAMPLE_REQUEST_RESULT_EVENT = 'xensonar:melodic-sample-request-result';

export interface MelodicSampleRequestResultPayload {
  requestId: string;
  ok: boolean;
  sampleId?: string;
  name?: string;
  error?: string;
}

export interface MelodicSampleRawSelectionPayload extends CommittedLoopPayload {
  requestId?: string;
}

export interface MelodicSampleBlobPayload {
  blob: Blob;
  name: string;
  origin: 'raw-selection' | 'stamp' | 'manual';
  preferredTrackId?: string | null;
  requestId?: string;
}

function createRequestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function waitForMelodicSampleRequest(requestId: string, timeoutMs = 45000) {
  return new Promise<MelodicSampleRequestResultPayload>((resolve, reject) => {
    let settled = false;
    let timeoutId = 0;
    const cleanup = () => {
      window.removeEventListener(MELODIC_SAMPLE_REQUEST_RESULT_EVENT, handleResult as EventListener);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleResult = (event: Event) => {
      const detail = (event as CustomEvent<MelodicSampleRequestResultPayload>).detail;
      if (!detail || detail.requestId !== requestId) return;
      finish(() => {
        if (detail.ok) resolve(detail);
        else reject(new Error(detail.error || 'Melodic sample request failed'));
      });
    };
    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error('Melodic sample request timed out')));
    }, timeoutMs);
    window.addEventListener(MELODIC_SAMPLE_REQUEST_RESULT_EVENT, handleResult as EventListener);
  });
}

export function completeMelodicSampleRequest(detail: MelodicSampleRequestResultPayload) {
  window.dispatchEvent(new CustomEvent<MelodicSampleRequestResultPayload>(MELODIC_SAMPLE_REQUEST_RESULT_EVENT, { detail }));
}

export async function dispatchRawSelectionToMelodicSample(payload: CommittedLoopPayload) {
  const requestId = createRequestId('melodic-raw');
  window.dispatchEvent(new CustomEvent<MelodicSampleRawSelectionPayload>(MELODIC_SAMPLE_FROM_RAW_SELECTION_EVENT, {
    detail: { ...payload, requestId },
  }));
  await waitForMelodicSampleRequest(requestId);
}

export async function dispatchBlobToMelodicSample(payload: MelodicSampleBlobPayload) {
  const requestId = createRequestId('melodic-blob');
  window.dispatchEvent(new CustomEvent<MelodicSampleBlobPayload>(MELODIC_SAMPLE_FROM_BLOB_EVENT, {
    detail: { ...payload, requestId },
  }));
  await waitForMelodicSampleRequest(requestId);
}
