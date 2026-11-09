'use strict';
/** P3 contracts: no P1 raw-audio routing, one shared glyph style, device-aware hit target,
 *  stable build artifact name instead of release-specific filenames in test paths. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lab=read('src/rooms/lab.js');
const header=lab.slice(lab.indexOf('function __ForgeHeaderPlay(){'),lab.indexOf('function __ForgeMiniPlay(){'));
const name=read('styles/areas/028_inline-028.css');
const controls=read('styles/areas/040_xen-p9-m9-cockpit-canonical.css');
const glyphs=name.match(/\.f35-navigator-name-glyph\s*,\s*\.xen-forge-draw-play-word\s*\{([^}]+)\}/)?.[1];
assert.ok(glyphs,'One shared font declaration governs BOTH small PLAY and upper NAME');
for(const p of ['font-family','font-size','font-weight','line-height','letter-spacing'])assert.match(glyphs,new RegExp(p+'\\s*:'),'shared '+p);
assert.doesNotMatch(controls,/\.xen-forge-draw-play-word\{[^}]*font-size/,'no stale copied font-size from wrong P1/first P2');
assert.match(header,/__ForgeTransportAccess\.activate\(\)/,'PLAY uses carrier');
assert.doesNotMatch(header,/xen-forge-giant-play|querySelector|\.click\(/,'never routes Raw-Audio');
assert.match(controls,/@media\s*\(pointer:\s*coarse\)/,'coarse pointer requires touch target sizing');
assert.match(controls,/-webkit-tap-highlight-color:\s*transparent/,'avoid browser-native sticky blue touch flash');
assert.match(controls,/height:\s*44px/,'touch button reaches 44px');
assert.match(controls,/@media\s*\(hover:\s*hover\)/,'hover affordance only on hover-capable devices');
assert.match(controls,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'respect reduced-motion preference');
assert.match(controls,/:focus-visible/,'keyboard focus remains visible');
const manifest=JSON.parse(read('source-manifest.json'));
assert.equal(manifest.output,'dist/XenSonar_Standalone.html','release-neutral dist name');
const stale=[...fs.readdirSync(path.join(root,'tests')).filter(f=>/\.(?:cjs|js|py)$/.test(f)).map(f=>'tests/'+f),'README.md','START_HIER.md','package.json'];
for(const file of stale)assert.doesNotMatch(read(file),/XenSonar_M1_UI_P1_Stage_Test\.html|dist\/XenSonar_FinalMerge_M1_Test\.html/,`stale filename in ${file}`);
console.log('PASS P3: shared small title, carrier transport, touch/hover/reduced motion, stable filenames');
