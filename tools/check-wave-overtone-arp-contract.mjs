#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (msg) => {
  console.error(`[wave-overtone-arp-contract] FAIL: ${msg}`);
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

mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'startWaveOvertoneArpRuntime', 'dedicated Wellenstarter overtone arp runtime');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'window.setInterval', '20 ms queue flush timer');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'waveOvertoneArpQueueRef', 'overtone arp queue binding');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', "beginTransientEvent('other'", 'transient-runtime admission for arp notes');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'playScheduledTone(', 'scheduled tone playback for due arp notes');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'stopWaveOvertoneArpRuntime', 'cleanup contract');
mustNotContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'disconnect()', 'native AudioNode disconnect in arp runtime');
mustNotContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'AudioNode.prototype', 'global AudioNode monkey patching');

mustContain('src/App.tsx', 'startWaveOvertoneArpRuntime({', 'App wiring for Wellenstarter overtone arp runtime');
mustContain('src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts', 'WaveOvertoneArpQueueEntry', 'typed overtone arp queue entries now owned by quantized traffic boundary hook');
{
  const app = read('src/App.tsx');
  const orchestratorPath = 'src/features/xensonar/audio/waveStarterHarmonicPlaybackOrchestrator.ts';
  const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';
  if (!app.includes('enqueueWaveOvertoneArp(freq, vol, overtonePlan.activeMix, isSector)')
    && !orchestrator.includes('callbacks.enqueueOvertoneArp(freq, volume, overtonePlan.activeMix, isSector)')) {
    fail('Wellenstarter enqueue path remains active via overtone playback plan: enqueueWaveOvertoneArp/callback from overtonePlan.activeMix');
  }
}
if (read('src/App.tsx').includes('playWaveStarterHarmonicPlaybackPlans({')) {
  mustContain('src/App.tsx', 'enqueueOvertoneArp: enqueueWaveOvertoneArp', 'App callback bridge for Wellenstarter overtone arp runtime');
}
mustContain('src/features/xensonar/audio/waveStarterOvertonePlaybackPlan.ts', 'enqueueArp: activeMix.length > 0', 'overtone plan preserves non-empty arp enqueue contract');
mustContain('src/App.tsx', 'waveOvertoneMode === "arp" || params.waveOvertoneMode === "hybrid"', 'arp/hybrid gating remains semantic');


mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'getAudioCtx?: () => AudioContext | null', 'runtime accepts a late-bound AudioContext resolver');
mustContain('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts', 'args.getAudioCtx?.() ?? audioCtx', 'runtime preserves the 63-style current AudioContext fallback');
mustContain('src/App.tsx', 'getAudioCtx: () => audioCtxRef.current ?? audioCtx', 'App wires the live AudioContext ref into the Wellenstarter arp runtime');

console.log('[wave-overtone-arp-contract] OK · Wellenstarter overtone arp runtime is wired and passive-burst-compatible');
