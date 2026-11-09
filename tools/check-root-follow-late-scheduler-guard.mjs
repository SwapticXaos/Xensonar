#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const microCut = read('src/features/xensonar/rootFollow/rootFollowMicroCutSafety.ts');
const renderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const elastic = read('src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts');
const pressure = read('src/core/audio/audioPressureMap.ts');
const traffic = read('src/features/xensonar/audioTraffic/audioTrafficForensics.ts');

expect(microCut.includes('resolveRootFollowLateSliceResync'), 'missing late-slice resync helper');
expect(microCut.includes('minimumSafeStartSec'), 'late-slice helper does not expose minimum safe start');
expect(microCut.includes('firstRootFollowSliceOnGridAtOrAfter'), 'late-slice helper must preserve transport-grid resync');
expect(renderer.includes('applyMaterialLateSliceResync'), 'renderer does not apply late-slice resync');
expect(renderer.includes("kind: 'late-slice-resync'"), 'renderer does not mark late-slice resync traffic');
expect(renderer.includes("recordAudioPressureAdaptiveAction('root-follow-late-slice-resync'"), 'renderer does not count late-slice resync action');
expect(renderer.includes("mode: 'flowing'"), 'flowing path is not guarded');
expect(renderer.includes("mode: 'fragment'"), 'fragment path is not guarded');
expect(renderer.includes('minimumScheduleLeadSec: Math.min(0.018'), 'flowing grains lack minimum schedule lead');
expect(renderer.includes('minimumScheduleLeadSec: 0.006'), 'fragment grains lack minimum schedule lead');
expect(renderer.includes('fallbackCleanup = window.setTimeout(cleanupNode, cleanupMs)'), 'root-follow active-node registry lacks fallback cleanup');
expect(elastic.includes('minimumScheduleLeadSec?: number'), 'elastic slice contract lacks minimumScheduleLeadSec');
expect(elastic.includes("when < ctx.currentTime + minimumScheduleLeadSec"), 'elastic slice does not skip late grains');
expect(elastic.includes("recordAudioPressureCount(args.pressureSource, 'late-grain-dropped'"), 'late grain drops are not counted');
expect(pressure.includes("| 'late-grain-dropped'"), 'pressure map lacks late-grain-dropped kind');
expect(pressure.includes("| 'root-follow-late-slice-resync'"), 'pressure map lacks root-follow late resync action');
expect(pressure.includes('lateGrainsDroppedPerSecond'), 'pressure witness lacks lateGrainsDroppedPerSecond');
expect(pressure.includes('peakLateGrainsDroppedPerSecond'), 'pressure witness lacks late grain high-water mark');
expect(traffic.includes("| 'late-slice-resync'"), 'audio traffic kind lacks late-slice-resync');
expect(!/console\.log\(/.test(renderer + elastic + microCut), 'late scheduler guard must not log from live paths');

if (failures.length) {
  console.error('[check-root-follow-late-scheduler-guard] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-root-follow-late-scheduler-guard] ok');
