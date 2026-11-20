'use strict';
// DUAL-ALIGN-01 (real app, Donor Workshop -> Dual Donor Assembly): variant 3 is the default for a new blueprint, the automatic
// crossing renders with it and reports what it heard (pitch of A and B, attacks), the morph path and time alignment are reachable
// and change the recipe; switching to variant 2 hides the variant-3 controls. Usage: node tests/e2e/dual_donor_aligned.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const wav=(name,f0,onset)=>{const file=path.join(os.tmpdir(),name),sr=48000,n=sr*2,buf=Buffer.alloc(44+n*2);buf.write('RIFF',0);buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++){const t=i/sr;let v=0;if(t>=onset)for(let h=1;h<12;h++)v+=Math.sin(2*Math.PI*f0*h*t)/h*Math.exp(-(t-onset)*1.2);buf.writeInt16LE(Math.round(5000*v),44+i*2)}fs.writeFileSync(file,buf);return file;};
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);
 const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
 const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
 await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
 await p.setInputFiles('input[type=file][accept^="audio"]',wav('xen_dual_a.wav',220,.2));await p.waitForTimeout(4000);
 await clkS('🧬');await p.waitForTimeout(2500);
 await p.locator('[data-f341-workbench-open]').first().scrollIntoViewIfNeeded();await p.locator('[data-f341-workbench-open]').first().click();await p.waitForTimeout(2000);
 await p.locator('[aria-controls="f35634-dual-panel"]').click();await p.waitForTimeout(1500);
 const panel=p.locator('#f35634-dual-panel');
 assert.equal(await panel.locator('select[aria-label="Shared synthesis variant"]').inputValue(),'aligned','a new blueprint starts on variant 3');
 assert.equal(await panel.locator('select[aria-label="Choose donor A"]').inputValue(),'active','A is the current Forge donor');
 await panel.locator('input[type=file][accept^="audio/"]').nth(1).setInputFiles(wav('xen_dual_b.wav',330,1.1));await p.waitForTimeout(2500);
 const auto=panel.locator('button.f35637-primary').first();assert.match(await auto.innerText(),/Auto-Cross/);
 await auto.click();
 await p.waitForFunction(()=>/Hybrid · .* · 3 · /.test(document.querySelector('#f35634-dual-panel .f35637-visual-result')?.innerText||''),null,{timeout:90000});
 const analysis=panel.locator('[data-dual-analysis]');
 const toggle=panel.locator('button.f35637-advanced-toggle');await toggle.click();await p.waitForTimeout(500);
 const line=await analysis.innerText();
 assert.match(line,/A 220 Hz · B 330 Hz/,'the analysis line names both pitches: '+line);assert.match(line,/attacks A\/B 1\/1, 1 aligned/,'the two attacks were aligned: '+line);
 // the morph path is reachable and changes the recipe (the built hybrid becomes "previous render")
 const end=panel.locator('input[aria-label="Morph balance at the end"]');assert.ok(await end.isVisible(),'morph end slider visible');
 await end.fill('1');await p.waitForTimeout(400);
 assert.match(await panel.locator('.f35637-visual-result').innerText(),/previous render/,'moving the morph end invalidates the old hybrid');
 assert.match(await end.locator('xpath=..').innerText(),/0% A \/ 100% B/);
 await panel.locator('select[aria-label="Time alignment of linked windows"]').selectOption('linear');await p.waitForTimeout(200);
 await panel.locator('select[aria-label="Time alignment of linked windows"]').selectOption('events');
 await panel.locator('button',{hasText:'Build Hybrid Donor'}).click();
 await p.waitForFunction(()=>{const t=document.querySelector('#f35634-dual-panel .f35637-visual-result')?.innerText||'';return /· 3 · /.test(t)&&!/previous render|Building/.test(t)},null,{timeout:90000});
 // variant 2 keeps its own controls only
 await panel.locator('select[aria-label="Shared synthesis variant"]').selectOption('revised');await p.waitForTimeout(400);
 assert.equal(await panel.locator('input[aria-label="Morph balance at the end"]').count(),0,'variant 2 shows no morph path');
 assert.equal(await panel.locator('select[aria-label="Time alignment of linked windows"]').count(),0);
 assert.deepEqual(errs,[]);console.log('PASS DUAL-ALIGN-01 '+line);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
