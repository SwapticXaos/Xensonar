'use strict';
// COUNT-STEADY-01 (real app): while the purple mask is dragged with Snap Bar / Beat / Segment, the Taktometer must count calmly:
// every frame the mask length and the bar count belong together (bar length = mask length / bars stays the same), the count changes
// by whole snap steps only, and no frame shows a half-updated state (new count over the old mask or the other way round).
// Runs in the import view (Wave Editor closed) and in the open Wave Editor; 16 segments per bar for the fine Segment case.
// Usage: node tests/e2e/mask_count_steady.cjs dist/XenSonar_PROBE.html [segment,beat,bar]
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-steady-'));
const file=path.join(dir,'m.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:30}),SR));
const modes=(process.argv[3]||'segment,beat,bar').split(',');const VERBOSE=!!process.env.VERBOSE;
(async()=>{
 const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);
 await wb.click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const FIND=`const c=[...document.querySelectorAll('canvas')].find(c=>c.offsetParent&&globalThis.__XenWaveUIW01.getEditor(c)),ed=c&&globalThis.__XenWaveUIW01.getEditor(c);`;
 const state=async()=>JSON.parse(await E(FIND+`const r=c.getBoundingClientRect(),d=ed.doc;JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height,sr:d.sampleRate,v0:d.viewport.start,v1:d.viewport.end,s:d.selection.start,e:d.selection.end,frames:d.frames,open:globalThis.__XenWaveUIW01.enabled(c),mv:ed.maskVertical})`));
 /* what is PAINTED on the Taktometer: every repaint (clearRect) starts a record; bar numbers (fillText of digits at the top) with their x, and the title text */
 await p.evaluate(()=>{const P=CanvasRenderingContext2D.prototype,cl=P.clearRect,ft=P.fillText;globalThis.__takt=[];const cur=new WeakMap();
  P.clearRect=function(...a){if(!this.canvas.dataset||this.canvas.dataset.xenBarMeter!=='true')return cl.apply(this,a);const r={nums:[],title:'m'};cur.set(this.canvas,r);globalThis.__takt.push(r);if(globalThis.__takt.length>20000)globalThis.__takt.splice(0,10000);return cl.apply(this,a)};
  P.fillText=function(t,x,y,...rest){const r=cur.get(this.canvas);if(r){if(/^\d+$/.test(String(t))&&y<=12)r.nums.push([Number(t),Math.round(x)]);else if(/^Taktometer ·/.test(String(t)))r.title=String(t)}return ft.call(this,t,x,y,...rest)}});
 await E(FIND+`ed.setEditorViewport(0,Math.round(14*ed.doc.sampleRate));'ok'`);await p.waitForTimeout(400);
 let st;
 const center=async()=>{await E(FIND+`c.scrollIntoView({block:'center'});'ok'`);await p.waitForTimeout(300);st=await state()};
 const setOpen=async on=>{await E(FIND+(on?`ed.open();'ok'`:`ed.close();'ok'`));await p.waitForTimeout(700);await center();if(st.open!==on)throw Error('editor open='+st.open)};
 const setSel=async(a,bb)=>{await E(FIND+`ed.doc=globalThis.__XenWaveCoreW01.setSelection(ed.doc,Math.round(${a}*ed.doc.sampleRate),Math.round(${bb}*ed.doc.sampleRate));ed.applySelection();ed.refresh(false);'ok'`);await p.waitForTimeout(400)};
 const setField=async(label,v)=>{const i=p.locator(`input[aria-label="${label}"]`).first();await i.fill(String(v));await i.press('Enter');await p.waitForTimeout(400)};
 /* one sample per animation frame: what the user sees in that frame (mask of the Wave Editor document, Taktometer fields) */
 const frames=n=>p.evaluate(n=>new Promise(res=>{const out=[];const ed=(()=>{const c=[...document.querySelectorAll('canvas')].find(c=>c.offsetParent&&globalThis.__XenWaveUIW01.getEditor(c));return globalThis.__XenWaveUIW01.getEditor(c)})();
  const val=l=>{const i=[...document.querySelectorAll('input')].find(i=>i.offsetParent&&i.getAttribute('aria-label')===l);return i?i.value:null};
  const tick=()=>{const d=ed.doc;out.push({s:d.selection.start/d.sampleRate,e:d.selection.end/d.sampleRate,bars:val('Number of Bars'),seg:val('Number of Segments')});if(out.length>=n)res(out);else requestAnimationFrame(tick)};requestAnimationFrame(tick)}),n);
 const num=t=>{const m=/^(\d+(?:\.\d+)?)(?:\/(\d+))?$/.exec(String(t||'').trim());return m?Number(m[1])/(m[2]?Number(m[2]):1):NaN};
 let fail=0;
 for(const mode of modes){
  await E(`localStorage.setItem('xensonar.songParts.snap.v1','${mode}');'ok'`);
  for(const open of [false,true]){
   for(const gesture of ['right edge','left edge','move']){
    if(gesture==='move'&&!open)continue;/* the import view has no move gesture in the lower mask */
    await setOpen(open);await setSel(2,10);await setField('Number of Segments',16);await setField('Number of Bars',4);await center();
    const px=sec=>st.x+(sec*st.sr-st.v0)/(st.v1-st.v0)*st.w,y=gesture==='move'?st.y+st.h*(st.mv?.top||0)+2:st.y+st.h*.5;
    const [from,to]=gesture==='right edge'?[10,7.3]:gesture==='left edge'?[2,4.7]:[6,8.7];
    await p.mouse.move(px(from),y);await p.evaluate(()=>{globalThis.__takt.length=0});await p.mouse.down();const samples=[];
    for(let k=1;k<=60;k++){await p.mouse.move(px(from+(to-from)*k/60),y);samples.push(...await frames(2))}
    await p.mouse.up();samples.push(...await frames(6));
    /* bar length seen in each frame; with a counting snap it must not change (the mask grows / shrinks by whole steps, the count with it) */
    const barSec=samples.map(q=>(q.e-q.s)/num(q.bars)).filter(Number.isFinite),lo=Math.min(...barSec),hi=Math.max(...barSec);
    const counts=[...new Set(samples.map(q=>q.bars))],lens=[...new Set(samples.map(q=>(q.e-q.s).toFixed(3)))];
    /* painted bar numbers: a number that stays inside the mask must stay at its x (right edge: all; left edge / move: they move together by whole steps) */
    const paints=await p.evaluate(()=>globalThis.__takt.filter(r=>r.title));const pos=new Map();let jumps=0;
    for(const r of paints)for(const [k,x] of r.nums){if(!pos.has(k))pos.set(k,new Set());pos.get(k).add(x)}
    if(gesture==='right edge')for(const [k,xs] of pos)if(k<4&&Math.max(...xs)-Math.min(...xs)>1)jumps++;/* 1 px = rounding: on the analysis grid a beat is the REAL detected beat (±3 ms), the tempo follows time-true by ~0.1 % *//* bars 1..3 lie left of the moving end the whole time */
    /* every gesture: within ONE painted frame the bar numbers are evenly spaced (= one bar length), and that spacing never changes */
    const gaps=[];for(const r of paints){const n=r.nums.slice().sort((a,b)=>a[0]-b[0]);for(let i=1;i<n.length;i++)if(n[i][0]===n[i-1][0]+1&&n[i][1]<st.w-14)gaps.push(n[i][1]-n[i-1][1])}
    if(gaps.length&&Math.max(...gaps)-Math.min(...gaps)>2)jumps++;
    const titles=[...new Set(paints.map(r=>r.title))];
    const steady=(hi-lo)/hi<0.002&&jumps===0;if(!steady)fail++;
    console.log((steady?'ok   ':'FAIL ')+mode.padEnd(8)+(open?'Wave Editor ':'import view ')+gesture.padEnd(11)+' bar length '+lo.toFixed(4)+'…'+hi.toFixed(4)+' s · '+counts.length+' counts · '+lens.length+' lengths · '+paints.length+' paints, '+jumps+' bar-number jumps (spacing '+(()=>{const g=[];for(const r of paints){const n=r.nums.slice().sort((a,b)=>a[0]-b[0]);for(let i=1;i<n.length;i++)if(n[i][0]===n[i-1][0]+1)g.push(n[i][1]-n[i-1][1])}return g.length?Math.min(...g)+'…'+Math.max(...g):'-'})()+' px)'+(VERBOSE||jumps?'\n      '+[...pos].map(([k,xs])=>k+'@'+[...xs].join(',')).join(' ')+'\n      '+titles.slice(0,12).join(' | '):'')+(VERBOSE||!steady?'\n      '+samples.map(q=>(q.e-q.s).toFixed(3)+'/'+q.bars).join(' '):''));
   }
  }
 }
 if(errs.length)console.log('pageerrors',errs.slice(0,3));
 await b.close();
 if(fail||errs.length){console.log('FAIL COUNT-STEADY-01 ('+fail+')');process.exit(1)}console.log('PASS COUNT-STEADY-01 '+modes.join(','));
})().catch(e=>{console.error(e);process.exit(1)});
