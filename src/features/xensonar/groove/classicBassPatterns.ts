import type { BassPattern } from '../domain/instrumentData';

type PlayBassNote = (time: number, freq: number, vol: number, dur: number, accent?: number, extras?: { glideToNext?: boolean; ghost?: boolean }) => void;

export function scheduleClassicBassPatternStep(args: {
  pattern: BassPattern;
  step: number;
  time: number;
  rootHz: number;
  bassLevel: number;
  stepMs: number;
  playBassNote: PlayBassNote;
}) {
  const { pattern, step, time, rootHz, bassLevel, stepMs, playBassNote } = args;
  if (pattern === 'offbeat') {
    if (step % 4 === 2) playBassNote(time, rootHz, bassLevel, stepMs * 1.5, 0.72);
    return;
  }
  if (pattern === 'walking') {
    if (step % 4 === 0) {
      const intervals = [1, 1.189, 1.333, 1.498];
      playBassNote(time, rootHz * intervals[(step / 4) % 4], bassLevel, stepMs * 1.8, 0.68);
    }
    return;
  }
  if (pattern === 'stotter') {
    if ([0, 1, 3, 4, 6, 8, 9, 11, 14].includes(step)) playBassNote(time, rootHz * (step % 8 === 0 ? 1 : 1.5), bassLevel, stepMs * 0.8, 0.78);
    return;
  }
  if (pattern === 'arpeggio') {
    if (step % 2 === 0) {
      const intervals = [1, 1.5, 2, 2.5];
      playBassNote(time, rootHz * intervals[(step / 2) % 4], bassLevel, stepMs * 1.5, 0.64);
    }
  }
}
