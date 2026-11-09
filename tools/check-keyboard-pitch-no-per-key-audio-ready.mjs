import fs from 'node:fs';
const boundary = fs.readFileSync('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const forbidden = ['runWithAudio(', 'ensureAudioReady().then', 'triggerKeyboardWindowPitch('];
const found = forbidden.filter((needle) => boundary.includes(needle));
const requiredBoundary = [
  'ensureKeyboardPitchAudioReadyOnce()',
  'resolveResonanceKeyboardPitchCommand',
  'commitCursorY(command.targetY',
  'setRootFollowInputTargetHz(command.targetHz)',
];
const missingBoundary = requiredBoundary.filter((needle) => !boundary.includes(needle));
const requiredApp = ['runResonanceKeyboardPitchCommandAssemblyBoundary({', 'ensureKeyboardPitchAudioReadyOnce'];
const missingApp = requiredApp.filter((needle) => !app.includes(needle));
if (found.length || missingBoundary.length || missingApp.length) {
  console.error('Keyboard pitch no-per-key-audio-ready contract failed.');
  if (found.length) console.error('Forbidden in pitch command boundary:', found.join(', '));
  if (missingBoundary.length) console.error('Missing in pitch command boundary:', missingBoundary.join(', '));
  if (missingApp.length) console.error('Missing in App:', missingApp.join(', '));
  process.exit(1);
}
console.log('Keyboard pitch no-per-key-audio-ready contract OK.');
