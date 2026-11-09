import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  isMaterialIntakeGatewayIntent,
  type SpectralForgeEntryScrollIntent,
  type SpectralForgeExternalAudioOrigin,
} from '../contracts/spectralForgeEntryIntent';
import { recordSpectralForgeEntryScrollDiagnostic, scrollSpectralForgeToIntakeGateway } from './entryScroll';
import type { MaterialIntakeActionFeedbackState } from './useMaterialIntakeActionFeedback';

export interface MaterialIntakeEntryGatewayOptions {
  sourceReady: boolean;
  intakeGatewayRef: RefObject<HTMLDivElement | null>;
  externalLoadFile?: File | null;
  externalLoadOrigin?: SpectralForgeExternalAudioOrigin | null;
  entryScrollIntent?: SpectralForgeEntryScrollIntent | null;
  onExternalLoadConsumed?: () => void;
  onEntryScrollIntentConsumed?: (token: string) => void;
  loadSourceFromFile: (file: File) => Promise<boolean>;
  runActionWithFeedback: MaterialIntakeActionFeedbackState['runActionWithFeedback'];
}

const ENTRY_SCROLL_RETRY_DELAYS_MS = [120, 260, 520, 880, 1320, 1880] as const;
const ENTRY_SCROLL_RAF_RETRIES = 6;
const ENTRY_SCROLL_VIEWPORT_OFFSET_PX = 8;

export function useMaterialIntakeEntryGateway({
  sourceReady,
  intakeGatewayRef,
  externalLoadFile,
  externalLoadOrigin = null,
  entryScrollIntent = null,
  onExternalLoadConsumed,
  onEntryScrollIntentConsumed,
  loadSourceFromFile,
  runActionWithFeedback,
}: MaterialIntakeEntryGatewayOptions): void {
  const externalLoadSignatureRef = useRef('');
  const pendingEntryScrollIntentRef = useRef<SpectralForgeEntryScrollIntent | null>(null);
  const entryScrollRafIdsRef = useRef<number[]>([]);
  const entryScrollTimersRef = useRef<number[]>([]);
  const entryScrollAttemptRef = useRef(0);
  const sourceReadyRef = useRef(sourceReady);
  const loadSourceFromFileRef = useRef(loadSourceFromFile);
  const runActionWithFeedbackRef = useRef(runActionWithFeedback);
  const onExternalLoadConsumedRef = useRef(onExternalLoadConsumed);
  const onEntryScrollIntentConsumedRef = useRef(onEntryScrollIntentConsumed);

  useEffect(() => {
    sourceReadyRef.current = sourceReady;
    loadSourceFromFileRef.current = loadSourceFromFile;
    runActionWithFeedbackRef.current = runActionWithFeedback;
    onExternalLoadConsumedRef.current = onExternalLoadConsumed;
    onEntryScrollIntentConsumedRef.current = onEntryScrollIntentConsumed;
  }, [loadSourceFromFile, onEntryScrollIntentConsumed, onExternalLoadConsumed, runActionWithFeedback, sourceReady]);

  const cancelScheduledEntryScroll = useCallback((recordCleanup: boolean) => {
    const hadScheduledWork = entryScrollRafIdsRef.current.length > 0 || entryScrollTimersRef.current.length > 0;
    entryScrollRafIdsRef.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
    entryScrollRafIdsRef.current = [];
    entryScrollTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    entryScrollTimersRef.current = [];
    if (recordCleanup && hadScheduledWork) {
      recordSpectralForgeEntryScrollDiagnostic({
        phase: 'cleanup',
        token: pendingEntryScrollIntentRef.current?.token,
        reason: pendingEntryScrollIntentRef.current?.reason,
        target: pendingEntryScrollIntentRef.current?.target,
        note: 'cleared scheduled entry-scroll convergence passes',
      });
    }
  }, []);

  const clearScheduledEntryScroll = useCallback(() => {
    cancelScheduledEntryScroll(true);
  }, [cancelScheduledEntryScroll]);

  const runEntryScrollPass = useCallback((behavior: ScrollBehavior = 'auto') => {
    const intent = pendingEntryScrollIntentRef.current;
    if (!isMaterialIntakeGatewayIntent(intent)) return false;
    const attempt = entryScrollAttemptRef.current + 1;
    entryScrollAttemptRef.current = attempt;
    const directTarget = intakeGatewayRef.current;
    if (directTarget) {
      directTarget.scrollIntoView({ block: 'start', inline: 'nearest', behavior });
      if (window.scrollY > ENTRY_SCROLL_VIEWPORT_OFFSET_PX) window.scrollBy({ top: -ENTRY_SCROLL_VIEWPORT_OFFSET_PX, left: 0, behavior: 'auto' });
    }
    const outcome = scrollSpectralForgeToIntakeGateway({
      reason: intent.reason,
      token: intent.token,
      behavior,
      viewportOffsetPx: ENTRY_SCROLL_VIEWPORT_OFFSET_PX,
      attempt,
    });
    if (outcome.ok) {
      recordSpectralForgeEntryScrollDiagnostic({
        phase: 'intent-consumed',
        reason: intent.reason,
        target: intent.target,
        token: intent.token,
        ok: true,
        attempt,
        visibleRatio: outcome.visibleRatio,
        scrollTopAfter: outcome.scrollTopAfter,
        targetTopInWindowAfter: outcome.targetTopInWindowAfter,
        targetTopInScrollerAfter: outcome.targetTopInScrollerAfter,
      });
      pendingEntryScrollIntentRef.current = null;
      clearScheduledEntryScroll();
      onEntryScrollIntentConsumedRef.current?.(intent.token);
      return true;
    }
    recordSpectralForgeEntryScrollDiagnostic({
      phase: 'intent-still-pending',
      reason: intent.reason,
      target: intent.target,
      token: intent.token,
      ok: false,
      attempt,
      visibleRatio: outcome.visibleRatio,
      scrollTopAfter: outcome.scrollTopAfter,
      targetTopInWindowAfter: outcome.targetTopInWindowAfter,
      targetTopInScrollerAfter: outcome.targetTopInScrollerAfter,
      note: 'scroll pass did not yet place the gateway visibly near the top',
    });
    return false;
  }, [clearScheduledEntryScroll, intakeGatewayRef]);

  const scheduleEntryScrollConvergence = useCallback(() => {
    if (!isMaterialIntakeGatewayIntent(pendingEntryScrollIntentRef.current)) return;
    const scheduledIntent = pendingEntryScrollIntentRef.current;
    recordSpectralForgeEntryScrollDiagnostic({
      phase: 'intent-scheduled',
      reason: scheduledIntent.reason,
      target: scheduledIntent.target,
      token: scheduledIntent.token,
      sourceReady: sourceReadyRef.current,
      note: 'starting RAF/timer convergence for material-intake gateway entry',
    });
    clearScheduledEntryScroll();

    const runAfterFrames = (remainingFrames: number) => {
      const rafId = window.requestAnimationFrame(() => {
        entryScrollRafIdsRef.current = entryScrollRafIdsRef.current.filter((id) => id !== rafId);
        if (runEntryScrollPass('auto')) return;
        if (remainingFrames > 0) runAfterFrames(remainingFrames - 1);
      });
      entryScrollRafIdsRef.current.push(rafId);
    };

    runAfterFrames(ENTRY_SCROLL_RAF_RETRIES);
    entryScrollTimersRef.current = ENTRY_SCROLL_RETRY_DELAYS_MS.map((delay) => window.setTimeout(() => {
      const behavior: ScrollBehavior = delay >= 1320 ? 'smooth' : 'auto';
      runEntryScrollPass(behavior);
    }, delay));
  }, [clearScheduledEntryScroll, runEntryScrollPass]);

  useEffect(() => () => {
    cancelScheduledEntryScroll(false);
  }, [cancelScheduledEntryScroll]);

  useEffect(() => {
    if (!externalLoadFile) {
      externalLoadSignatureRef.current = '';
      return;
    }
    const signature = `${externalLoadFile.name}:${externalLoadFile.size}:${externalLoadFile.lastModified}:${externalLoadOrigin ?? 'manual'}`;
    if (externalLoadSignatureRef.current === signature) return;
    externalLoadSignatureRef.current = signature;
    let cancelled = false;
    if (isMaterialIntakeGatewayIntent(entryScrollIntent)) {
      pendingEntryScrollIntentRef.current = entryScrollIntent;
      recordSpectralForgeEntryScrollDiagnostic({
        phase: 'intent-pending',
        reason: entryScrollIntent.reason,
        target: entryScrollIntent.target,
        token: entryScrollIntent.token,
        fileSignature: signature,
        note: 'external file load attached a scroll intent before decoding',
      });
    }
    recordSpectralForgeEntryScrollDiagnostic({
      phase: 'load-started',
      reason: entryScrollIntent?.reason,
      target: entryScrollIntent?.target,
      token: entryScrollIntent?.token,
      fileSignature: signature,
      sourceReady: sourceReadyRef.current,
    });
    void runActionWithFeedbackRef.current('load', async () => {
      const ok = await loadSourceFromFileRef.current(externalLoadFile);
      recordSpectralForgeEntryScrollDiagnostic({
        phase: 'load-finished',
        reason: entryScrollIntent?.reason,
        target: entryScrollIntent?.target,
        token: entryScrollIntent?.token,
        ok,
        fileSignature: signature,
        sourceReady: ok,
      });
      if (ok && !cancelled) scheduleEntryScrollConvergence();
      return cancelled ? false : ok;
    }).finally(() => {
      if (!cancelled) {
        recordSpectralForgeEntryScrollDiagnostic({
          phase: 'external-load-consumed',
          reason: entryScrollIntent?.reason,
          target: entryScrollIntent?.target,
          token: entryScrollIntent?.token,
          fileSignature: signature,
          note: 'file/origin cleanup acknowledged separately from entry-scroll intent consumption',
        });
        onExternalLoadConsumedRef.current?.();
      }
    });
    return () => {
      cancelled = true;
      recordSpectralForgeEntryScrollDiagnostic({
        phase: 'load-cancelled',
        reason: entryScrollIntent?.reason,
        target: entryScrollIntent?.target,
        token: entryScrollIntent?.token,
        fileSignature: signature,
      });
    };
  }, [entryScrollIntent, externalLoadFile, externalLoadOrigin, scheduleEntryScrollConvergence]);

  useEffect(() => {
    if (!isMaterialIntakeGatewayIntent(entryScrollIntent)) return;
    recordSpectralForgeEntryScrollDiagnostic({
      phase: 'intent-seen',
      reason: entryScrollIntent.reason,
      target: entryScrollIntent.target,
      token: entryScrollIntent.token,
      sourceReady: sourceReadyRef.current,
      note: 'MaterialIntakePanel observed a valid material-intake entry scroll intent',
    });
    pendingEntryScrollIntentRef.current = entryScrollIntent;
    scheduleEntryScrollConvergence();
  }, [entryScrollIntent, scheduleEntryScrollConvergence, sourceReady]);
}
