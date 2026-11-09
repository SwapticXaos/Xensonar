import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx', 'utf8');
const required = [
  'rootFollowInputTargetHzRef.current',
  'getCurrentRootFollowInputHz',
  'getCurrentRootHz: getCurrentRootFollowInputHz',
  'commitResonanceCursorY(command.targetY, { previewWave: false, syncHud: true })',
];
const missing = required.filter((needle) => !app.includes(needle));
if (missing.length) {
  console.error('Cursor/root-follow input decoupling contract failed. Missing:', missing.join(', '));
  process.exit(1);
}
console.log('Cursor/root-follow input decoupling contract OK.');
