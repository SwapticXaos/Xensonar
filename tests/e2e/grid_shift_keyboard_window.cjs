'use strict';
// GRID-SHIFT-KBD-01 (real app, Psy Lab): moving "Shift grid · cents" (or dragging single triangles) retunes the keys of the key window,
// it never collapses the window. Before: a line pushed over the range edge (base 440 Hz = top of the range) shortened the shifted list
// against the unshifted anchor index, uw() sliced from -1 and the whole keyboard became ONE low note; the Psy Lab key labels vanished
// and stayed gone until the grid system was changed (which resets the offsets). Usage: node tests/e2e/grid_shift_keyboard_window.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const E=c=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),c);
 await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText)).click()});await p.waitForTimeout(1500);
 const keys=()=>E(`JSON.stringify((P=>Array.from({length:20},(_,k)=>wF(P.gridBase,P.gridTuning,__NodalBallGrid.windowOffset(),k,P.manualGridMutedSteps,P.manualGridStepOffsets)))(__NodalBallGrid.params()))`).then(JSON.parse);
 const shift=()=>E('__xenGridShiftCents(__NodalBallGrid.params().gridTuning,__NodalBallGrid.params().manualGridStepOffsets)');
 for(const tuning of ['31edo','12edo','ji']){
  await E(`__NodalBallGrid.changeTuning(${JSON.stringify(tuning)})`);await p.waitForTimeout(500);
  const k0=await keys();assert(k0.every(v=>v>0),tuning+': 20 keys before');
  const sl=p.getByLabel('Grid shift cents');await sl.scrollIntoViewIfNeeded();const bb=await sl.boundingBox();
  for(const fx of [.7,.3,.52,.48,.95,.05]){
   await p.mouse.click(bb.x+bb.width*fx,bb.y+bb.height/2);await p.waitForTimeout(250);
   const c=await shift(),k=await keys(),ratio=Math.pow(2,c/1200);
   assert(k.every(v=>Number.isFinite(v)&&v>0),tuning+' shift '+c.toFixed(1)+' ct: all 20 keys still play ('+JSON.stringify(k.slice(0,4))+')');
   for(let i=0;i<20;i++)assert(Math.abs(1200*Math.log2(k[i]/(k0[i]*ratio)))<.5,tuning+' shift '+c.toFixed(1)+' ct: key '+(i+1)+' = same step, retuned ('+k[i]+' vs '+k0[i]*ratio+')');
  }
  await E(`__NodalBallGrid.update({manualGridStepOffsets:[]})`);await p.waitForTimeout(200);
 }
 // a single triangle dragged far (no uniform shift; step 2 = open in every 12-EDO mode used here): the key keeps its step, the other keys stay where they were
 await E('__NodalBallGrid.changeTuning("12edo")');await p.waitForTimeout(400);const k0=await keys();
 await E("__NodalBallGrid.update({manualGridStepOffsets:Array.from({length:12},(_,i)=>i===2?40:0)})");await p.waitForTimeout(250);const k1=await keys();
 assert(k1.every(v=>v>0),'one step dragged +400 ct: still 20 keys');
 const moved=k1.map((v,i)=>1200*Math.log2(v/k0[i])).filter(c=>Math.abs(c)>.5);
 assert(moved.length>=1&&moved.every(c=>Math.abs(c-400)<.5),'only the keys of the dragged step change, by exactly its +400 ct, no key changes its step ('+JSON.stringify(k1.map((v,i)=>+(1200*Math.log2(v/k0[i])).toFixed(1)))+')');
 // the Psy Lab pad still writes key labels after a shift
 await E('__NodalBallGrid.update({manualGridStepOffsets:Array(12).fill(5)})');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__lbl=[];const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t){if(this.canvas.closest?.('.xpl-pad'))S.push(String(t));return f.apply(this,arguments)}});
 await E('__NodalBallGrid.update({manualGridStepOffsets:Array(12).fill(6)})');await p.waitForTimeout(600);
 const labels=await p.evaluate(()=>[...new Set(window.__lbl)]);
 assert(['3','4','5','Q','W'].every(k=>labels.includes(k)),'key labels are drawn on the Psy Lab pad after a shift: '+JSON.stringify(labels.filter(l=>l.length<3)));
 assert.deepEqual(errors,[]);await b.close();console.log('grid_shift_keyboard_window OK');
})().catch(e=>{console.error(e);process.exit(1)});
