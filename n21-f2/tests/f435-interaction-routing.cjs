'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const emilia=fs.readFileSync('src/forge/emilia/02_lab_ui.js','utf8');
const donor=fs.readFileSync('src/forge/ui/02_donor_routing_and_hearing.js','utf8');
const instrument=fs.readFileSync('src/forge/fractalia/03_instrument.js','utf8');
const ui=fs.readFileSync('src/forge_and_melodic/01_donor_selection_and_edits.js','utf8');
const css=fs.readFileSync('styles/22_emilia3.css','utf8');
const ctx={};vm.createContext(ctx);
const routeBlock=donor.match(/function __f435OnExtractTimbre\([\s\S]*?\n\}/);
assert.ok(routeBlock,'extraction routing helper exists');
const calls=[];Object.assign(ctx,{__ForgeListeningMode:{value:()=>ctx.active,choose:(x)=>{calls.push(x);ctx.active=x}},__F341Workbench:{preset:()=>calls.push('preset-reset')}});
vm.runInContext(routeBlock[0]+';globalThis.route=__f435OnExtractTimbre',ctx);
for(const [before,after] of [['fractalia','fractalia'],['donor','donor'],['antonia','donor'],['bert','donor'],['emilia','donor']]){
 ctx.active=before;calls.length=0;ctx.route();assert.equal(ctx.active,after,`${before} extraction should lead to ${after}`);
 if(before==='fractalia'||before==='donor')assert.deepEqual(calls,[],'active donor and Fractalia should not be reset');
}
assert.equal((donor.match(/__f435OnExtractTimbre\(\)/g)||[]).length,3,'helper wired to both extraction buttons and declaration');
assert.ok(ui.includes('children:"🎛️"'),'Synth Lab shows the controller icon independently from the label');
const graphBlock=emilia.match(/function __emiliaGestureMoved\([\s\S]*?\n\}/);
assert.ok(graphBlock,'gesture movement guard present');vm.runInContext(graphBlock[0]+';globalThis.moved=__emiliaGestureMoved',ctx);
assert.equal(ctx.moved({x:.5,y:.5},{x:.5,y:.5}),false);
assert.equal(ctx.moved({x:.5,y:.5},{x:.54,y:.51}),true);
assert.ok(emilia.includes('data-emilia-ripple')&&emilia.includes('emilia-b-ghost')&&emilia.includes('data-emilia-live-link'),'ripple and live/old edges render');
assert.ok(css.includes('emilia-b-ripple')&&css.includes('emilia-b-ripple-flow'),'ring animations exist');
assert.ok(/await __f3562EnsureDonor\(\)[\s\S]*?const donorKey=instrument\.donor/.test(instrument),'Fractalia lazily prepares the selected donor mask before capturing render identity');
console.log('PASS F4.3.5 controller icon, Emilia gesture and preserved links, conditional extraction route and lazy mask acquisition');
