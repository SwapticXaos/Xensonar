'use strict';
// FORGE-SPEC-TOGGLE-01 (real app, Spectral Forge): the header button next to Undo switches the cyan "heard spectrum" silhouette over the carrier.
// Default on; off leaves only the carrier; on again shows the measured silhouette at once. Usage: node tests/e2e/forge_spectrum_toggle.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const wav=path.join(os.tmpdir(),'xen_spec_toggle.wav');{const sr=48000,n=sr*3,buf=Buffer.alloc(44+n*2);buf.write('RIFF',0);buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40);for(let i=0;i<n;i++){const t=i/sr;buf.writeInt16LE(Math.round(9000*Math.sin(2*Math.PI*(220+60*t)*t)),44+i*2)}fs.writeFileSync(wav,buf)}
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:950},deviceScaleFactor:2})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);
 const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
 const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
 await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
 const btn=p.locator('[data-forge-spectrum-toggle]'),undo=p.locator('[data-forge-draw-history] button',{hasText:'Undo'}),layer=p.locator('canvas[data-forge-pcm-spectrum]');
 assert.equal(await btn.count(),1,'one toggle button');
 const bb=await btn.boundingBox(),ub=await undo.boundingBox();assert(bb.x+bb.width<=ub.x+1&&Math.abs(bb.y-ub.y)<6,'the button sits right next to Undo '+JSON.stringify([bb,ub]));
 assert.equal(await btn.getAttribute('data-forge-spectrum-toggle'),'on','default on');assert.equal(await btn.getAttribute('aria-pressed'),'true');
 assert.equal(await btn.locator('path').count(),6,'on: carrier line (red/orange/yellow) plus three cyan silhouettes');
 assert.equal(await layer.evaluate(c=>c.style.display),'block','the cyan layer is shown by default');
 // load a sound and play it so a heard spectrum exists
 await p.setInputFiles('input[type=file][accept^="audio"]',wav);await p.waitForTimeout(5000);
 await p.locator('.xen-forge-giant-play').scrollIntoViewIfNeeded();await p.locator('.xen-forge-giant-play').click();await p.waitForTimeout(9000);
 const status=await layer.getAttribute('data-forge-pcm-spectrum');
 if(process.env.SHOT){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:process.env.SHOT+'/spec_on.png',clip:{x:600,y:(await p.locator('[data-forge-draw-history]').boundingBox().then(x=>x.y))-30,width:460,height:70}})}
 await btn.click();await p.waitForTimeout(300);
 assert.equal(await btn.getAttribute('data-forge-spectrum-toggle'),'off');assert.equal(await btn.getAttribute('aria-pressed'),'false');
 assert.equal(await btn.locator('path').count(),3,'off: only the carrier line is left on the button');
 assert.equal(await layer.evaluate(c=>c.style.display),'none','the cyan layer is hidden');
 if(process.env.SHOT)await p.screenshot({path:process.env.SHOT+'/spec_off.png',clip:{x:600,y:(await p.locator('[data-forge-draw-history]').boundingBox().then(x=>x.y))-30,width:460,height:70}});
 await btn.click();await p.waitForTimeout(300);
 assert.equal(await layer.evaluate(c=>c.style.display),'block','on again');
 assert.equal(await layer.getAttribute('data-forge-pcm-spectrum'),status,'switching off and on does not throw the measured state away');
 assert.deepEqual(errs,[]);console.log('PASS FORGE-SPEC-TOGGLE spectrum status was "'+status+'"');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
