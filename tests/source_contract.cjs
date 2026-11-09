'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const m=require('../source-manifest.json');
const content=fs.readFileSync(path.join(root,m.output),'utf8');
const js=content.match(/<script type="module" crossorigin>([\s\S]*?)<\/script>/)[1];
const css=content.match(/<style id="xen-eq-p1">([\s\S]*?)<\/style>/)[1];
const runtime=m.sources.find(x=>x.type==='script'&&x.tag.includes('type="module"'));
const original=runtime.files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('');
assert.equal(original,js,'main module must reconstruct from all listed runtime sources');
for(const expected of ['src/sessions/v2-session-store.js','src/quickrack/equalizer/eq-core.js','src/quickrack/equalizer/eq-ui.js']){
 assert(runtime.files.includes(expected),'source isolation missing: '+expected);
}
assert(css.includes(fs.readFileSync(path.join(root,'styles/quickrack/eq.css'),'utf8')));
for(const k of ['__XenM13BootStatus','__XenEQDock','__XenEQPanel','__xenM11HydrationFactory','__xenM12InventoryFactory','xensonar.quickrack.eq.patterns.v1']){
 assert(content.includes(k),'lost merged feature: '+k);
}
for(const section of m.sources.filter(x=>x.type==='script'))assert.equal(content.split(section.tag).length,2,'each manifest script tag occurs exactly once: '+section.tag);
console.log('SOURCE CONTRACT PASS: session/boot/EQ all present; module and CSS assembly intact');
