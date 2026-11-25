'use strict';
// TAKT-SNAP-05 (real app, import view): with Snap Bar / Beat / Segment the loop that plays (PLAY) keeps playing while the purple mask is dragged and after
// the mouse is released, although the Taktometer count / BPM follows the mask. Usage: node tests/e2e/taktometer_snap_live.cjs dist/XenSonar_PROBE.html [bar|beat|segment|off]
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-snap-'));
const file=path.join(dir,'m.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:30}),SR));
const mode=process.argv[3]||'bar';process.argv[4]=process.argv[4]||'PLAY';const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);
 if(process.env.WE)await wb.click();await p.waitForTimeout(2500);console.log('canv',await p.evaluate(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).map((c,i)=>i+':'+[...c.attributes].map(a=>a.name).join(',')+':'+Math.round(c.getBoundingClientRect().width)+'x'+Math.round(c.getBoundingClientRect().height)).join(' / ')));
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await E(`localStorage.setItem('xensonar.songParts.snap.v1','${mode}');globalThis.__stops=[];const o=Id.stop;Id.stop=function(){globalThis.__stops.push(new Error().stack.split('\\n').slice(1,9).map(s=>s.trim().slice(0,90)).join(' | '));return o.apply(this,arguments)};const pl=Id.playLoop;Id.playLoop=function(){globalThis.__stops.push('PLAY');return pl.apply(this,arguments)};1`);
 const loop=async()=>JSON.parse(await E(`JSON.stringify({playing:Id.isPlaying(),start:Id.sourceNode&&Id.sourceNode.loopStart,end:Id.sourceNode&&Id.sourceNode.loopEnd})`));
 const mask=p.locator(process.env.SEL||'canvas[data-xwe-workspace-resize]').first();await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();const Y=lm.y+lm.height*.4;
 await p.mouse.move(lm.x+lm.width*.25,Y);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.6,Y,{steps:6});await p.mouse.up();await p.waitForTimeout(600);
 if(process.argv[4]==='space'){await p.mouse.click(lm.x+lm.width*.4,lm.y-30);await p.keyboard.press('Space')}else if(process.argv[4]){await p.getByRole('button',{name:process.argv[4],exact:true}).first().click()}else await p.getByRole('button',{name:'Preview',exact:true}).first().click();await p.waitForTimeout(1200);
 console.log('btns',await p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>/play|loop/i.test(b.innerText+b.getAttribute('aria-label'))&&b.offsetParent).map(b=>(b.getAttribute('aria-label')||b.innerText).slice(0,30)).join(' / ')));console.log('start',JSON.stringify(await loop()));await E('globalThis.__stops.length=0');
 await p.mouse.move(lm.x+lm.width*.6,Y);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.45,Y,{steps:8});await p.waitForTimeout(250);
 console.log('bars0',await p.evaluate(()=>[...document.querySelectorAll('input')].filter(i=>/bars|bpm|segment/i.test(i.getAttribute('aria-label')||'')).map(i=>i.getAttribute('aria-label')+'='+i.value).join(' ; ')));console.log('during',JSON.stringify(await loop()));await p.mouse.up();await p.waitForTimeout(800);
 console.log('bars',await p.evaluate(()=>[...document.querySelectorAll('input')].filter(i=>/bars|bpm|segment/i.test(i.getAttribute('aria-label')||'')).map(i=>i.getAttribute('aria-label')+'='+i.value).join(' ; ')));console.log('after',JSON.stringify(await loop()));console.log(await E('JSON.stringify(globalThis.__stops,null,1)'));console.log('dbg',await E('JSON.stringify((globalThis.__dbg||[]).slice(-3))'));const a=await loop();assert(a.playing,'the loop keeps playing after release ('+mode+')');assert.deepEqual(errs,[]);console.log('PASS TAKT-SNAP-05 '+mode+' loop '+a.start.toFixed(2)+'–'+a.end.toFixed(2)+' still playing');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
