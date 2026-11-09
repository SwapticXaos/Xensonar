import {
  markRecordingDownloadObjectUrlReleased,
  markRecordingPreviewObjectUrlReleased,
  registerRecordingDownloadObjectUrl,
  registerRecordingPreviewObjectUrl,
} from './recordingDisposalRegistry';

export function revokeManagedObjectUrl(url: string | null | undefined): void {
  if (!url) return;
  URL.revokeObjectURL(url);
  markRecordingPreviewObjectUrlReleased(url, 'recording-object-url-revoked');
}

export function replaceManagedObjectUrl(currentUrl: string | null | undefined, blob: Blob | null): string | null {
  revokeManagedObjectUrl(currentUrl);
  if (!blob) return null;
  const nextUrl = URL.createObjectURL(blob);
  registerRecordingPreviewObjectUrl(nextUrl, blob);
  return nextUrl;
}

export function triggerBlobDownload(blob: Blob, filename: string, revokeDelayMs = 4000): void {
  const url = URL.createObjectURL(blob);
  registerRecordingDownloadObjectUrl(url, blob, filename, revokeDelayMs);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.position = 'fixed';
  anchor.style.left = '-9999px';
  document.body.appendChild(anchor);
  anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
    markRecordingDownloadObjectUrlReleased(url, 'recording-download-object-url-revoked');
  }, revokeDelayMs);
}
