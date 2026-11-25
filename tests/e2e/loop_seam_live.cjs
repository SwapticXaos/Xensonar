'use strict';
// LOOP-SEAM-02/03 (real app, import view): a raw loop whose wrap clicks is detected right after PLAY and handed over, while playing, to a repaired copy
// (continuation blend); after a live mask change it is tested and repaired again; the sends use the same repair. Usage: node tests/e2e/loop_seam_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {wav}=require('../helpers/analysis_synth.cjs');const SR=44100;
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-seam-')),file=path.join(dir,'tone.wav');
const x=new Float32Array(SR*20);for(let i=0;i<x.length;i++)x[i]=.5*Math.sin(2*Math.PI*173.3*i/SR)+.2*Math.sin(2*Math.PI*411.7*i/SR);fs.writeFileSync(file,wav(x,SR));
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:60000});await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await E(`localStorage.setItem('xensonar.songParts.snap.v1','off');1`);
 // the repair itself: after the wrap the loop continues as the recording does (first loop sample = sample after the loop end)
 const unit=JSON.parse(await E(`(()=>{const sr=44100,x=new Float32Array(sr*2);for(let i=0;i<x.length;i++)x[i]=Math.sin(2*Math.PI*173.3*i/sr);const a=1000,b=31234,r=__xenSeamRegion(x,a,b,sr),d=r.data;
  const wrap=Math.abs(d[0]-(d[d.length-1]+(d[d.length-1]-d[d.length-2])));const raw=Math.abs(x[a]-(x[b-1]+(x[b-1]-x[b-2])));let mx=0;for(let i=1;i<d.length;i++)mx=Math.max(mx,Math.abs(d[i]-d[i-1]));
  return JSON.stringify({click:r.test.click,repaired:r.repaired,wrap,raw,mx,len:d.length})})()`));
 assert(unit.click&&unit.repaired==='continuation','the click is detected and repaired: '+JSON.stringify(unit));assert(unit.wrap<.002&&unit.raw>.05,'the wrap is continuous after the repair: '+JSON.stringify(unit));assert.equal(unit.len,30234);
 const loop=async()=>JSON.parse(await E(`JSON.stringify({playing:Id.isPlaying(),region:!!(Id.sourceNode&&Id.sourceNode.__seamRegion),start:Id.playbackLoopStartSec,dur:Id.playbackLoopDurationSec,click:Id.seamTest&&Id.seamTest.click})`));
 const mask=p.locator('canvas[data-xwe-workspace-resize]').first();await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox(),Y=lm.y+lm.height*.4;
 await p.mouse.move(lm.x+lm.width*.211,Y);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.537,Y,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
 await p.getByRole('button',{name:'PLAY',exact:true}).first().click();await p.waitForTimeout(900);
 const l1=await loop();assert(l1.playing&&l1.click&&l1.region,'a clicking loop is repaired while it plays: '+JSON.stringify(l1));
 await p.mouse.move(lm.x+lm.width*.537,Y);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.43,Y,{steps:8});await p.waitForTimeout(120);
 const l2=await loop();await p.mouse.up();await p.waitForTimeout(900);const l3=await loop();
 assert(l2.playing&&!l2.region&&l2.dur<l1.dur-.5,'a mask change goes back to the recording and follows live: '+JSON.stringify(l2));
 assert(l3.playing&&l3.region&&Math.abs(l3.dur-l2.dur)<.6,'the new loop is tested and repaired again, still playing: '+JSON.stringify(l3));
 assert.deepEqual(errs,[]);console.log('PASS LOOP-SEAM live repair · '+l1.dur.toFixed(2)+' s → '+l3.dur.toFixed(2)+' s, playing throughout');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
