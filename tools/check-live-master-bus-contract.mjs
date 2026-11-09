import fs from 'node:fs';

const src = fs.readFileSync('src/features/resonance/liveMastering.ts', 'utf8');
const boundary = fs.readFileSync('src/features/xensonar/audio/liveMasterBusRuntimeBoundary.ts', 'utf8');

const required = [
  ['musicPremaster is documented as no-drum tap', src.includes('musicPremaster is a no-drum recording/tap sum')],
  ['musicPremaster no longer feeds premaster directly', !src.includes('musicPremaster.connect(premaster);')],
  ['all role gains still feed live premaster', src.includes('roleGain.connect(premaster);')],
  ['non-rhythm role gains still feed no-drum music tap', src.includes('isNoDrumRecordingRole(role)') && src.includes('roleGain.connect(musicPremaster);')],
  ['no-drum recorder taps musicPremaster', boundary.includes('liveMasteringRef.current?.musicPremaster')],
];

const failed = required.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('[live-master-bus-contract] failed:');
  for (const name of failed) console.error(` - ${name}`);
  process.exit(1);
}
console.log('[live-master-bus-contract] ok');
