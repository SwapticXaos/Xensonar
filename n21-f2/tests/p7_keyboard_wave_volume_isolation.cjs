'use strict';
// Independent Keyboard and Wave Starter level policy; does not attempt audio rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'src/runtime/instrument/08_library_and_tuning_editor.js'), 'utf8');
const live = fs.readFileSync(path.join(root, 'src/app/forge/01_room_shell.js'), 'utf8');

// Extract the actual production fallback expressions to prevent a regression that
// makes the visual fader independent while keeping the real voice coupled.
const uiMatch = ui.match(/lane:'keyboard'[\s\S]{0,450}?volume:(params\.keyboardMixVolume\?\?\.3),onVolume/);
const liveMatch = live.match(/__performanceKeyboard\?\{\.\.\.fa\.current,enabled:true,volume:(Tt\.current\.keyboardMixVolume\?\?\.3)\}/);
assert.ok(uiMatch, 'Keyboard UI must have an independent level fallback');
assert.ok(liveMatch, 'Keyboard live path must have the same independent fallback');
assert.match(ui, /lane:'wave'[\s\S]{0,400}?volume:p\.waveSoundVolume\?\?0,onVolume:p\.setWaveSoundVolume/);
const uiVolume = Function('params', `return ${uiMatch[1]}`);
const liveVolume = Function('Tt', `return ${liveMatch[1]}`);
for (const waveLevel of [0, .05, .45, .98]) {
  const uiParams = {waveSoundVolume:waveLevel};
  const liveParams = {current:{waveSoundVolume:waveLevel}};
  assert.equal(uiVolume(uiParams), .3, 'Wave level must not drive the unconfigured Keyboard fader');
  assert.equal(liveVolume(liveParams), .3, 'Wave level must not affect live Keyboard output');
  uiParams.keyboardMixVolume = .73;
  liveParams.current.keyboardMixVolume = .73;
  assert.equal(uiVolume(uiParams), .73, 'Stored Keyboard UI volume must be respected');
  assert.equal(liveVolume(liveParams), .73, 'Stored Keyboard live volume must be respected');
}
for (const volume of [0, .01, 1]) {
  assert.equal(uiVolume({keyboardMixVolume:volume}), volume);
  assert.equal(liveVolume({current:{keyboardMixVolume:volume}}), volume);
}
console.log('PASS Wave Starter and Keyboard independent before and after explicit Keyboard adjustment; UI and live agree');
