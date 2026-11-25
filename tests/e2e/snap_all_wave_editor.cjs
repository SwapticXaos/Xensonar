'use strict';
// SNAP-ALL-01 (real app, Wave Editor OPEN): the purple loop mask follows the Snap of the song-parts strip (Bar / Beat / Segment / Off)
// also when the expanded Wave Editor owns the gesture (before, only the closed import view snapped; the open editor was always free).
// Gestures per mode: draw a new mask, drag its right edge, move it by its upper border, drag its left edge.
// Snapped modes: every result is a whole number of units (bar = 2 s, beat / segment = 0.5 s at 120 BPM, 4 segments) – on the analysis grid
// or counted from the edge that stays. Off: the edge lands where the mouse is (not on a unit).
// GRID=1 waits for the song analysis first (absolute bar / beat grid, as with parts C1, C2 …).
// Usage: node tests/e2e/snap_all_wave_editor.cjs dist/XenSonar_PROBE.html [bar,beat,segment,off]
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-snapall-'));
const file=path.join(dir,'m.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:30}),SR));
const modes=(process.argv[3]||'bar,beat,segment,off').split(',');
(async()=>{
 const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);
 await wb.click();await p.waitForTimeout(4000);/* the song analysis starts by itself after a short pause; let it finish */
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const FIND=`const cs=[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent&&globalThis.__XenWaveUIW01.getEditor(c)&&globalThis.__XenWaveUIW01.enabled(c));const c=cs[0],ed=c&&globalThis.__XenWaveUIW01.getEditor(c);`;
 const state=async()=>JSON.parse(await E(FIND+`if(!ed)JSON.stringify(null);else{const r=c.getBoundingClientRect(),d=ed.doc;JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height,sr:d.sampleRate,v0:d.viewport.start,v1:d.viewport.end,s:d.selection.start,e:d.selection.end,frames:d.frames,mv:ed.maskVertical})}`));
 let st=await state();if(!st)throw Error('Wave Editor detail canvas not found / not open');
 // show 0..12 s so the pixels per unit are large
 await E(FIND+`ed.setEditorViewport?ed.setEditorViewport(0,Math.round(12*ed.doc.sampleRate)):0;'ok'`);await p.waitForTimeout(400);st=await state();
 if(process.env.GRID){const sp=p.locator('[data-xwe-song-parts]');if(await sp.getAttribute('data-xwe-song-parts')==='ready')await p.locator('[data-xwe-song-start]').click();
  await p.waitForFunction(()=>document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')==='done',null,{timeout:90000});st=await state();console.log('song analysis done')}
 console.log('editor',JSON.stringify({w:st.w,view:[st.v0/st.sr,st.v1/st.sr],parts:await p.locator('[data-xwe-song-parts]').getAttribute('data-xwe-song-parts').catch(()=>null)}));
 const px=sec=>{const f=sec*st.sr;return st.x+(f-st.v0)/(st.v1-st.v0)*st.w};
 const drag=async(x0,y0,x1,y1)=>{await p.mouse.move(x0,y0);await p.mouse.down();await p.mouse.move(x1,y1,{steps:10});await p.mouse.up();await p.waitForTimeout(350);st=await state()};
 let fail=0;const check=(label,mode,unit,ref=null)=>{const s=st.s/st.sr,e=st.e/st.sr,d=ref==null?e-s:s-ref,k=d/unit,onUnit=Math.abs(k-Math.round(k))<0.02;
  const ok=mode==='off'?!onUnit:onUnit&&(ref!=null||d>0);if(!ok)fail++;console.log((ok?'ok   ':'FAIL ')+mode.padEnd(8)+label.padEnd(12)+' start '+s.toFixed(3)+' end '+e.toFixed(3)+(ref==null?' dur ':' shift ')+d.toFixed(3)+' = '+k.toFixed(3)+' units')};
 await E(FIND+`c.scrollIntoView({block:'center'});'ok'`);await p.waitForTimeout(300);st=await state();
 for(const mode of modes){
  await E(`localStorage.setItem('xensonar.songParts.snap.v1','${mode}');'ok'`);
  const unit=mode==='bar'?2:0.5;await p.locator('canvas').first().evaluate(()=>0);
  st=await state();const yMid=st.y+st.h*0.5;
  // 1) new mask from 1.13 s to 5.37 s
  await drag(px(1.13),yMid,px(5.37),yMid);check('new',mode,unit);
  // 2) right edge to ~7.71 s
  await drag(px(st.e/st.sr),yMid,px(7.71),yMid);check('right edge',mode,unit);
  // 3) move by the upper border (+1.37 s)
  const top=st.y+st.h*(st.mv?.top||0)+2,mid=(st.s+st.e)/2/st.sr,s0=st.s/st.sr;await drag(px(mid),top,px(mid+1.37),top);check('move',mode,unit,s0);
  // 4) left edge to ~0.83 s
  await drag(px(st.s/st.sr),yMid,px(0.83),yMid);check('left edge',mode,unit);
 }
 if(errs.length)console.log('pageerrors',errs.slice(0,3));
 await b.close();
 if(fail||errs.length){console.log('FAIL SNAP-ALL-01 ('+fail+' checks)');process.exit(1)}console.log('PASS SNAP-ALL-01 '+modes.join(','));
})().catch(e=>{console.error(e);process.exit(1)});
