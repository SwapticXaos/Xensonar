import { useEffect } from 'react';
import type { AudioBurstMarkerContext } from './burstDiagnosticsRuntime';
import type { AudioEventIntakeState } from '../../soundLibrary/audioEventIntake';
import type { Room } from '../domain/runtimeTypes';

type MutableRefLike<T> = { current: T };

type AudioBurstMarkerRuntime = {
  recordMarker: (context: AudioBurstMarkerContext) => void;
};

type AudioBurstMarkerHotkeyArgs = {
  audioBurstRuntime: AudioBurstMarkerRuntime;
  room: Room;
  audioCtx: AudioContext | null;
  audioEventIntakeMonitorRef: MutableRefLike<AudioEventIntakeState>;
};

function isTextEntryTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || element.isContentEditable;
}

/**
 * Backspace marker for audible crackle/burst forensics. Kept separate from the
 * musical Backspace/octave-hold path so diagnostics cannot silently alter playing.
 */
export function useAudioBurstMarkerHotkey({
  audioBurstRuntime,
  room,
  audioCtx,
  audioEventIntakeMonitorRef,
}: AudioBurstMarkerHotkeyArgs) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' || event.repeat) return;
      if (isTextEntryTarget(event.target)) return;
      audioBurstRuntime.recordMarker({
        room,
        audioNowSec: audioCtx?.currentTime ?? null,
        target: event.target,
        intakeState: audioEventIntakeMonitorRef.current,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioBurstRuntime, audioCtx, audioEventIntakeMonitorRef, room]);
}
