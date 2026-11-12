'use strict';
// LIVE-CANVAS (real app): the Live Room canvas keeps its logical 1100×580 drawing space but its backing store follows what is shown (CSS size × device pixel ratio),
// never above 1100×580. Drawing must stay in logical coordinates (transform), pointer positions unchanged, and a resize / pixel-ratio change is followed.
// Usage: node tests/e2e/live_canvas_fit.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const errors=[];
  const info=p=>p.evaluate(()=>{const c=document.querySelector('canvas[data-xen-play-area]'),r=c.getBoundingClientRect();return{w:c.width,h:c.height,cssW:r.width,cssH:r.height,dpr:devicePixelRatio}});
  async function open(dpr,vw){const ctx=await b.newContext({viewport:{width:vw,height:900},deviceScaleFactor:dpr});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);return p}
  // DPR 1: backing = shown size (smaller than 1100 × 580), aspect kept
  let p=await open(1,1440);let i=await info(p);
  assert(i.w<1100&&i.w>=Math.floor(i.cssW)-1&&i.w<=Math.ceil(i.cssW)+1,'DPR 1: backing width follows the shown width: '+i.w+' vs '+i.cssW);
  assert(Math.abs(i.h/i.w-580/1100)<.004,'aspect ratio kept: '+i.h+'/'+i.w);
  // the frame is drawn through a transform that maps the logical space onto the backing store
  const tr=await p.evaluate(()=>new Promise(ok=>{const c=document.querySelector('canvas[data-xen-play-area]'),g=c.getContext('2d'),o=g.fillRect.bind(g);let got=null;g.fillRect=function(x,y,w,h){if(!got&&w===1100&&h===580){const m=g.getTransform();got=[m.a,m.d,m.e,m.f,c.width,c.height]}return o(x,y,w,h)};setTimeout(()=>{g.fillRect=o;ok(got)},400)}));
  assert(tr&&Math.abs(tr[0]-tr[4]/1100)<1e-6&&Math.abs(tr[1]-tr[5]/580)<1e-6&&tr[2]===0&&tr[3]===0,'the background fill (1100×580 logical) is drawn through the fit transform: '+JSON.stringify(tr));
  // pixels are really drawn (not blank)
  const lit=await p.evaluate(()=>{const c=document.querySelector('canvas[data-xen-play-area]'),g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let k=0;k<d.length;k+=4*37)if(d[k]+d[k+1]+d[k+2]>60)n++;return n});assert(lit>50,'the canvas shows the grid and text: '+lit);
  // a resize is followed
  await p.setViewportSize({width:900,height:900});await p.waitForFunction(()=>{const c=document.querySelector('canvas[data-xen-play-area]'),r=c.getBoundingClientRect();return Math.abs(c.width-r.width)<=2},null,{timeout:5000});
  const i2=await info(p);assert(i2.w<i.w,'a narrower window gives a smaller backing store: '+i2.w+' < '+i.w);
  await p.context().close();
  // DPR 2: never above the logical size (same cost as before), sharp as before
  p=await open(2,1440);i=await info(p);assert.equal(i.w,1100);assert.equal(i.h,580);await p.context().close();
  assert.deepEqual(errors,[]);console.log('PASS LIVE-CANVAS backing store follows the display (DPR 1: '+i2.w+'…'+'; DPR 2 capped at 1100×580)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
