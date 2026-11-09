'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('styles/areas/029_inline-029.css','utf8');
const rule=selector=>{
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const m=css.match(new RegExp(escaped+'\\{([^{}]*)\\}'));
 assert(m,'missing '+selector);return m[1];
};
assert.match(rule('.xen-performance header'),/min-height:25px/,'final compact header height should be in original rule');
assert.match(rule('.xen-performance header button'),/min-width:26px;min-height:26px/,'final compact header button size should be original rule');
assert.match(rule('.xen-performance-pan-note'),/line-height:1\.15;min-height:10px/,'pan note sizing should be in canonical rule');
assert.doesNotMatch(css,/\.xen-performance header\{min-height:25px\}/,'no trailing header patch');
assert.doesNotMatch(css,/\.xen-performance header button\{min-width:26px;min-height:26px;line-height:1\}/,'no trailing button patch');
assert.doesNotMatch(css,/\.xen-performance-pan-note\{min-height:10px;line-height:1\.15\}/,'no trailing pan note patch');
assert.equal((css.match(/\.xen-particle-mix-row input\[type=range\]\{/g)||[]).length,1,'single particle slider geometry rule');
console.log('PASS performance style ownership consolidation: no local overrides or duplicate slider rule');
