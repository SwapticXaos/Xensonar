'use strict';
// SEEK-JUMP-01/02 (real app): while the Forge loop plays, the green loop clock stays ONE element with its playhead line (height > 0) through Taktometer seeks, zooming and a
// stop/start; the panel does not change height on a seek. Usage: node tests/e2e/loop_clock_line.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-lc-')),file=path.join(dir,'m.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:60}),SR));
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'));await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:60000});await p.waitForTimeout(1500);
 const mask=p.locator('canvas[data-xwe-workspace-resize]').first();await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox(),Y=lm.y+lm.height*.4;
 await p.mouse.move(lm.x+lm.width*.1,Y);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.6,Y,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
 await p.getByRole('button',{name:'PLAY',exact:true}).first().click();await p.waitForTimeout(1200);
 const state=()=>p.evaluate(()=>{const els=[...document.querySelectorAll('.xwe-loop-clock')],e=els[0];return {n:els.length,line:e?parseFloat(getComputedStyle(e,'::after').height)||0:-1,vis:e?e.style.visibility:null,labels:document.querySelectorAll('.xwe-playhead-time').length}});
 const m=p.locator('[data-xen-bar-meter]');await m.scrollIntoViewIfNeeded();const bb=await m.boundingBox(),box=()=>p.evaluate(()=>{const r=document.querySelector('.xen-raw-intake-compact');return r?Math.round(r.getBoundingClientRect().height):0});
 let s0=await state();assert.equal(s0.n,1);assert(s0.line>20&&s0.vis==='visible','the loop clock has its playhead line: '+JSON.stringify(s0));const h0=await box(),hs=new Set([h0]);
 for(let i=0;i<10;i++){await p.mouse.click(bb.x+bb.width*(.1+.07*i),bb.y+bb.height/2);for(let k=0;k<4;k++){await p.waitForTimeout(50);hs.add(await box())}}
 const s1=await state();assert.equal(s1.n,1,'still exactly one loop clock after the seeks: '+JSON.stringify(s1));assert(s1.line>20,'… with its line: '+JSON.stringify(s1));
 assert(hs.size===1,'the panel height stays constant during seeks: '+[...hs].join(','));
 assert.deepEqual(errs,[]);console.log('PASS loop clock: one label with line, panel height constant ('+h0+' px)');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
