'use strict';
// SAME-MASK-01 (real app): the purple loop mask behaves EXACTLY the same in the import view (Wave Editor closed) and in the open Wave Editor.
// The same mouse gestures run in both views from the same start mask and the same Taktometer count; afterwards mask (start / end) and
// Taktometer fields (bars, segments, BPM) must be identical. Per snap mode Bar / Beat / Segment / Off:
// new mask, right edge, left edge, an edge pulled over the other one, the right view border of a mask larger than the view, a narrow mask.
// Usage: node tests/e2e/same_mask_views.cjs dist/XenSonar_PROBE.html [bar,beat,segment,off]
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-same-'));
const file=path.join(dir,'m.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:30}),SR));
const modes=(process.argv[3]||'bar,beat,segment,off').split(',');const DBG=!!process.env.DBG;
(async()=>{
 const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);
 const sp=p.locator('[data-xwe-song-parts]');await p.waitForFunction(()=>/ready|done|running/.test(document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')||''),null,{timeout:20000});
 if(await sp.getAttribute('data-xwe-song-parts')==='ready')await p.locator('[data-xwe-song-start]').click({timeout:3000}).catch(()=>{});/* the analysis may already have started by itself */
 await p.waitForFunction(()=>document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')==='done',null,{timeout:90000});
 await wb.click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const FIND=`const c=[...document.querySelectorAll('canvas')].find(c=>c.offsetParent&&globalThis.__XenWaveUIW01.getEditor(c)),ed=c&&globalThis.__XenWaveUIW01.getEditor(c);`;
 const state=async()=>JSON.parse(await E(FIND+`const r=c.getBoundingClientRect(),d=ed.doc;JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height,sr:d.sampleRate,v0:d.viewport.start,v1:d.viewport.end,s:d.selection.start,e:d.selection.end,frames:d.frames,open:globalThis.__XenWaveUIW01.enabled(c)})`));
 await E(FIND+`ed.setEditorViewport(0,Math.round(12*ed.doc.sampleRate));c.scrollIntoView({block:'center'});'ok'`);await p.waitForTimeout(500);
 let st=await state();if(!st.open)throw Error('Wave Editor did not open');
 const setOpen=async on=>{await E(FIND+(on?`ed.open();'ok'`:`ed.close();'ok'`));await p.waitForTimeout(700);await E(FIND+`c.scrollIntoView({block:'center'});'ok'`);await p.waitForTimeout(300);st=await state();if(st.open!==on)throw Error('editor open='+st.open+' expected '+on)};
 const setSel=async(a,bb)=>{await E(FIND+`ed.doc=globalThis.__XenWaveCoreW01.setSelection(ed.doc,Math.round(${a}*ed.doc.sampleRate),Math.min(ed.doc.frames,Math.round(${bb}*ed.doc.sampleRate)));ed.applySelection();ed.refresh(false);'ok'`);await p.waitForTimeout(400)};
 const barsInput=()=>p.locator('input[aria-label="Number of Bars"]').first();
 const setBars=async v=>{const i=barsInput();await i.fill(String(v));await i.press('Enter');await p.waitForTimeout(400)};
 const fields=()=>p.evaluate(()=>[...document.querySelectorAll('input')].filter(i=>i.offsetParent&&/bars|bpm|segment/i.test(i.getAttribute('aria-label')||'')).map(i=>i.getAttribute('aria-label')+'='+i.value).join(' ; '));
 const px=sec=>st.x+(sec*st.sr-st.v0)/(st.v1-st.v0)*st.w,yM=()=>st.y+st.h*.5;
 const drag=async(x0,x1)=>{const y=yM();await p.mouse.move(x0,y);await p.mouse.down();await p.mouse.move(x1,y,{steps:10});await p.mouse.up();await p.waitForTimeout(450)};
 const gestures=[
  ['new 1.13→5.37',[0,30],()=>[px(1.13),px(5.37)]],
  ['right edge →7.71',[2,6],()=>[px(6),px(7.71)]],
  ['left edge →0.83',[2,8],()=>[px(2),px(0.83)]],
  ['right edge over the start',[4,8],()=>[px(8),px(1.5)]],
  ['whole file: right view border →9.3',[0,30],()=>[st.x+st.w-3,px(9.3)]],
  ['narrow mask right edge →3.0',[1,1.12],()=>[px(1.12)+3,px(3)]],
 ];
 let fail=0;
 for(const mode of modes){
  await E(`localStorage.setItem('xensonar.songParts.snap.v1','${mode}');'ok'`);
  for(const [label,[a,bb],pts] of gestures){
   const out=[];
   for(const open of [false,true]){
    await setOpen(open);await setSel(a,bb);await setBars(4);await E(FIND+`c.scrollIntoView({block:'center'});'ok'`);await p.waitForTimeout(300);st=await state();
    const [x0,x1]=pts();if(DBG)console.log(open,JSON.stringify(st),await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e&&(e.tagName+' '+(e.className||'')+' '+[...e.attributes].map(a=>a.name).join(','))},[x0,yM()]));await drag(x0,x1);st=await state();
    out.push({mask:(st.s/st.sr).toFixed(3)+'–'+(st.e/st.sr).toFixed(3),f:await fields()});
   }
   const ok=out[0].mask===out[1].mask&&out[0].f===out[1].f;if(!ok)fail++;
   console.log((ok?'ok   ':'FAIL ')+mode.padEnd(8)+label.padEnd(38)+' import view '+out[0].mask+' | Wave Editor '+out[1].mask+(ok?'':'\n      '+out[0].f+'\n      '+out[1].f));
  }
 }
 if(errs.length)console.log('pageerrors',errs.slice(0,3));
 await b.close();
 if(fail||errs.length){console.log('FAIL SAME-MASK-01 ('+fail+')');process.exit(1)}console.log('PASS SAME-MASK-01 '+modes.join(','));
})().catch(e=>{console.error(e);process.exit(1)});
