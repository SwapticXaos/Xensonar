const SUPPRESS_WINDOW_SCROLL_RESTORE_MS = 4000;

let suppressWindowScrollRestoreUntil = 0;

export function markCutUploadHandoffWindowScrollRestoreSuppressed(now = Date.now()) {
  suppressWindowScrollRestoreUntil = now + SUPPRESS_WINDOW_SCROLL_RESTORE_MS;
}

export function consumeCutUploadHandoffWindowScrollRestoreSuppressed(now = Date.now()) {
  if (suppressWindowScrollRestoreUntil > now) {
    suppressWindowScrollRestoreUntil = 0;
    return true;
  }
  suppressWindowScrollRestoreUntil = 0;
  return false;
}

export function isCutUploadHandoffWindowScrollRestoreSuppressed(now = Date.now()) {
  return suppressWindowScrollRestoreUntil > now;
}
