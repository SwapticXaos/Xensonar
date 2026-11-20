'use strict';
// PLAYHEAD-SCALE-01 (real app, Wave Editor): the playhead of the upper (overview) canvas and of the lower (viewport) canvas stand at the same audio position.
// With an effect chain whose echo/reverb tail extends the render, the upper playhead used the longer render length as its scale and ran early (the lower one was right).
// Usage: node tests/e2e/wave_playhead_scale.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);
 const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
 const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
 const cv=p.locator('[data-forge-carrier-canvas]');await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();
 for(let k=0;k<3;k++){await p.mouse.move(bb.x+bb.width*.1,bb.y+bb.height*(.3+k*.15));await p.mouse.down();for(let i=1;i<=40;i++)await p.mouse.move(bb.x+bb.width*(.1+.8*i/40),bb.y+bb.height*(.3+k*.15+.08*Math.sin(i/5)),{steps:1});await p.mouse.up()}
 await p.waitForTimeout(1500);
 await p.locator('[data-forge-send-to-editor]').first().scrollIntoViewIfNeeded();await p.locator('[data-forge-send-to-editor]').first().click();
 for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(!JSON.parse(await E('JSON.stringify(__ForgeNavigatorSample.snapshot())')).busy)break}
 const ED="(()=>{const w=globalThis.__XenWaveUIW01;return [...document.querySelectorAll('[data-material-intake-gateway] canvas')].map(n=>w.getEditor(n)).filter(Boolean).find(e=>e.doc)})()";
 const run=c=>E("(async()=>{const ed="+ED+";if(!ed)return 'no editor';"+c+"})()");
 // an echo with a long tail on the second half of the document, chain preview
 const setup=await run("ed.startInput.value='4';ed.endInput.value='6';ed.setRangeFromFields();ed.addNode('delay');const nd=ed.nodes[ed.nodes.length-1];Object.assign(nd.params,{delayMs:700,feedback:.7,wet:.6});const n=ed.nodes.length;ed.preview('chain');await new Promise(r=>setTimeout(r,1800));const t=ed.transport;return JSON.stringify({nodes:n,mode:t&&t.mode,frames:ed.doc.frames,sourceFrames:t&&t.sourceFrames})");
 const info=JSON.parse(setup);
 assert(info.nodes>=1,'an effect stage was added: '+setup);
 assert.equal(info.mode,'chain','the chain preview is running: '+setup);
 assert(info.sourceFrames>info.frames,'the render is longer than the document (echo tail), the case that went wrong: '+setup);
 const m=JSON.parse(await run(`const t=ed.transport,ctx=ed.audioContext;const at=Math.min(t.endFrame,t.startFrame+Math.max(0,ctx.currentTime-t.startAudioTime)*t.sampleRate);
  const out=[];for(const e of ed.playheadElements||[]){const c=e.canvas.getBoundingClientRect(),p=e.parent.getBoundingClientRect();const left=parseFloat(e.el.style.left)-(c.left-p.left+e.parent.scrollLeft);
   out.push({overview:e.canvas===ed.options.overviewCanvas,scratch:e.canvas===ed.scratchCanvas,shown:e.el.style.display!=='none',pos:left/c.width})}
  return JSON.stringify({at,frames:ed.doc.frames,vs:ed.doc.viewport.start,ve:ed.doc.viewport.end,out})`));
 const over=m.out.find(o=>o.overview),lower=m.out.find(o=>!o.overview&&!o.scratch);
 assert(over&&over.shown,'the overview playhead is visible');
 const wantOver=m.at/m.frames,wantLower=(m.at-m.vs)/(m.ve-m.vs);
 assert(Math.abs(over.pos-wantOver)<.02,'overview playhead at the document position: want '+wantOver.toFixed(3)+' got '+over.pos.toFixed(3));
 if(lower&&lower.shown)assert(Math.abs(lower.pos-wantLower)<.02,'lower playhead at the viewport position: want '+wantLower.toFixed(3)+' got '+lower.pos.toFixed(3));
 assert.deepEqual(errs,[]);
 console.log('wave_playhead_scale OK overview',over.pos.toFixed(3),'want',wantOver.toFixed(3),'render/doc frames',info.sourceFrames,info.frames);
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
