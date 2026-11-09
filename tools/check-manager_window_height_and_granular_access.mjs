import fs from 'node:fs';
const material = fs.readFileSync('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx', 'utf8');
const groove = fs.readFileSync('src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx', 'utf8');
const assertions = [
  ['root follow prioritizes granular details', material.includes('prioritizeDetailControls')],
  ['manager dialogs use viewport-height container', material.includes('max-h-[calc(100vh-2rem)]') && groove.includes('max-h-[calc(100vh-2rem)]')],
  ['loop playlist uses flex-1 list viewport', material.includes('min-h-0 flex-1 space-y-2 overflow-y-auto pr-1')],
  ['drum playlist uses flex-1 list viewport', groove.includes('min-h-0 flex-1 space-y-2 overflow-y-auto pr-1')],
  ['root follow granular manager button remains present', material.includes('<span>Granular Manager</span>')],
];
const failed = assertions.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('manager window height / granular access check failed');
  for (const [label] of failed) console.error('-', label);
  process.exit(1);
}
console.log('manager window height / granular access check ok');
for (const [label] of assertions) console.log('-', label);
