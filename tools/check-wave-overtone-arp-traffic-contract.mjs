#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (msg) => {
  console.error(`[wave-overtone-arp-traffic-contract] FAIL: ${msg}`);
  process.exit(1);
};
const mustContain = (rel, needle, why) => {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel} missing ${why}: ${needle}`);
};
const mustNotContain = (rel, needle, why) => {
  const text = read(rel);
  if (text.includes(needle)) fail(`${rel} contains forbidden ${why}: ${needle}`);
};

mustContain('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'WaveOvertoneArpTrafficState', 'dedicated Wellenstarter overtone arp traffic state');
mustContain('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', "| 'wave-overtone-arp'", 'dedicated traffic subsystem');
mustContain('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', "| 'queue-enqueue'", 'enqueue traffic events');
mustContain('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', "| 'queue-flush'", 'flush traffic events');
mustContain('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'updateWaveOvertoneArpTrafficState', 'passive traffic state updater');
mustContain('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'waveOvertoneArp:', 'snapshot includes overtone arp traffic');

mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'markWaveOvertoneArpEnqueue', 'enqueue observation boundary');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'markWaveOvertoneArpQueueClear', 'queue-clear observation boundary');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', "subsystem: 'wave-overtone-arp'", 'dedicated arp traffic markers');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', "kind: 'queue-flush'", 'flush traffic marker');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', "kind: 'play-admitted'", 'played-note traffic marker');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'playedTotal', 'cumulative played counter');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'failedTotal', 'failed playback counter');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'trimmedTotal', 'overflow trim counter');
mustNotContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'disconnect()', 'native AudioNode disconnect in arp traffic runtime');
mustNotContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'AudioNode.prototype', 'global AudioNode monkey patching');

mustContain('src/App.tsx', 'overflowTrimmed', 'queue overflow trim is counted rather than silent');
mustContain('src/App.tsx', '90.61 silent Wellenstarter contract', 'App preserves the silent Wellenstarter enqueue hotpath contract');
mustContain('src/App.tsx', 'void markWaveOvertoneArpEnqueue', 'App keeps the enqueue marker imported without publishing per-hit traffic objects');
mustContain('src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts', 'trafficRef', 'traffic ref is bundled by quantized traffic boundary hook');
mustContain('src/App.tsx', 'markWaveOvertoneArpQueueClear(waveOvertoneArpTrafficRefs, "ui-mode-disabled")', 'UI mode clears report queue state through shared overtone traffic refs');
mustContain('src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts', 'markWaveOvertoneArpQueueClear(waveOvertoneArpTrafficRefs, reason)', 'quantize cycle clears report queue state through shared overtone traffic refs');

mustContain('src/features/xensonar/audioTraffic/quantizedTrafficQueueBoundary.ts', 'markWaveOvertoneArpTrafficQueueReset', 'quantized traffic resets report arp queue clearing');
mustContain('src/features/xensonar/rooms/quantizeGridActions.ts', 'onWaveOvertoneArpQueueClear', 'quantize grid cycle reports arp queue clearing');
mustContain('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx', 'Wellenstarter-Arp', 'diagnostics panel surfaces arp traffic status');

mustNotContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'slice(0,', 'event thinning by slicing due arp notes');
mustNotContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'due = Math.min', 'event count clamping in arp flusher');

console.log('[wave-overtone-arp-traffic-contract] OK · Wellenstarter overtone arp traffic is observable without event thinning');
