const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'styles/24_quick_menu.css'),'utf8');
const quick=fs.readFileSync(path.join(root,'src/mix/03_quick_menu.js'),'utf8');
const loop=fs.readFileSync(path.join(root,'src/runtime/instrument/11_recording_and_granular_controls.js'),'utf8');
assert(css.includes('background:#19d26b;pointer-events:none;z-index:2'));
assert(css.includes('animation:xenQuickPulse 1.15s ease-out 2 forwards'));
assert(css.includes('@keyframes xenQuickPulse{0%{opacity:0}30%{opacity:.6}100%{opacity:0}}'));
assert(quick.includes("['A','S','D','F','G','H','J','K','L']"));
assert(loop.includes('children:["Slot ",le+1,__XenLoopKey(le),'));
assert(loop.includes('children:["Slot ",r>=0?r+1:"—",__XenLoopKey(r),'));
assert(loop.includes('`${__XenLoopKey(X)}')===false); // Key suffix belongs inside the Slot label.
assert(loop.includes('${__XenLoopKey(X)} · ${te.bars}'));
console.log('PASS N13 visible two-cycle green cue and position-based hotkey letters for both loop managers');
