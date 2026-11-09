'use strict';
// No shadow NAME markup: the same active NAME card appears when no audio exists.
const assert=require('node:assert/strict'),fs=require('node:fs');
const view=fs.readFileSync('src/rooms/00_empty_audio_p32.js','utf8');
const lab=fs.readFileSync('src/rooms/lab.js','utf8');
const css=fs.readFileSync('styles/areas/040_xen-p9-m9-cockpit-canonical.css','utf8');
assert(lab.includes('controls:__forgeSharedControls'));
assert(view.includes("className:'xen-p33-inactive-rack'"));
assert(!view.includes('xen-p33-name-dummy'));
assert(!view.includes('xen-forge-name-word'));
assert(!css.includes('.xen-p33-name-dummy'));
for(const cls of ['xen-forge-name-word','xen-forge-name-colon','xen-forge-name-input','xen-forge-inline-metadata'])assert(lab.includes(cls),'live NAME must own '+cls);
assert(lab.includes('disabled:!E,readOnly:!E'),'idle NAME is disabled');
console.log('PASS: identical live/idle NAME structure; input inert on no audio');
