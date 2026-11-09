import { DURATION } from "../spectralConstants";
import {
  clampBars,
  clampGuideSegments,
  sanitizeGuideMarkers,
} from "../state/storeMaterialExport";

export type BeatGuideNode = OscillatorNode | GainNode;

export function scheduleBeatGuideClicks(
  ctx: AudioContext,
  startTime: number,
  startOffset: number,
  bars: number,
  guideSegments: number,
  guideMarkers: number[],
  loopDurationSec: number,
  loopPreview: boolean,
  guideVolume: number,
): BeatGuideNode[] {
  const guideNodes: BeatGuideNode[] = [];
  const safeBars = clampBars(bars);
  const safeSegments = clampGuideSegments(guideSegments);
  const safeMarkers = sanitizeGuideMarkers(guideMarkers, safeSegments);
  const cycleDuration = Math.max(0.05, loopDurationSec);
  const effectiveStartInCycle = Math.max(
    0,
    Math.min(cycleDuration, (startOffset / DURATION) * cycleDuration),
  );
  const clickLead = 0.004;
  const barDuration = cycleDuration / safeBars;
  const events: { whenInCycle: number; isBarStart: boolean }[] = [];

  for (let bar = 0; bar < safeBars; bar++) {
    const barStart = bar * barDuration;
    events.push({ whenInCycle: barStart, isBarStart: true });
    for (const marker of safeMarkers) {
      events.push({
        whenInCycle: barStart + marker * barDuration,
        isBarStart: false,
      });
    }
  }

  events.sort((a, b) => a.whenInCycle - b.whenInCycle);

  const horizon = loopPreview
    ? Math.min(120, Math.max(cycleDuration * 4, 20))
    : cycleDuration;
  const repetitions = loopPreview
    ? Math.max(2, Math.ceil((horizon + effectiveStartInCycle) / cycleDuration))
    : 1;

  for (let cycle = 0; cycle < repetitions; cycle++) {
    for (const event of events) {
      const absoluteTimeInGuide = cycle * cycleDuration + event.whenInCycle;
      if (absoluteTimeInGuide + 0.001 < effectiveStartInCycle) continue;
      const when =
        startTime + Math.max(0, absoluteTimeInGuide - effectiveStartInCycle);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = event.isBarStart ? 1320 : 920;
      const amp = (event.isBarStart ? 0.075 : 0.04) * guideVolume;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, amp),
        when + 0.001,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, when + clickLead + 0.018);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + clickLead + 0.03);
      guideNodes.push(osc, gain);
    }
  }

  return guideNodes;
}
