'use strict';
// PARTICLE-HEAD-01 + INSTALL-HUM-01 (real app):
//  1. Particle Mode and Particle System sit in the header row of the Particles band (no extra row), work, and are gone from Harmonic System.
//  2. "More choices here" opens the Nodal Center in Art Installation and brings the Resident controls into view.
//  3. The Mycelium hum can be muted on its own (button next to "Mycelium · ON/OFF"): Mycelium stays on, the output of the hum goes silent.
// Usage: node tests/e2e/particle_head_hum.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript({path:path.resolve(__dirname,'../../tools/probes/room_activity_instrument.js')});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 // ---- 1. the header ----
 const band=p.locator('.xen-mainroom-particle-band'),head=band.locator('.xen-particle-hotkeys');await head.scrollIntoViewIfNeeded();
 const mode=head.getByLabel('Particle Mode',{exact:true}),system=head.getByLabel('Particle System',{exact:true});
 assert.equal(await mode.count(),1);assert.equal(await system.count(),1);
 const box=async l=>l.evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}});
 const hb=await box(head),mb=await box(mode),sb=await box(system),title=await box(head.locator('.xen-particle-header'));
 assert.ok(hb.bottom-hb.top<70,'one header row, nothing pushed down: '+(hb.bottom-hb.top));
 assert.ok(mb.top>=hb.top-1&&mb.bottom<=hb.bottom+1&&sb.top>=hb.top-1&&sb.bottom<=hb.bottom+1,'both menus lie inside the header row');
 assert.ok(mb.left>title.right&&sb.left>mb.right,'order: Particles, Particle Mode, Particle System, side by side');
 assert.match(await head.innerText(),/Particle Mode:[\s\S]*Particle System:/);
 assert.equal(await p.locator('.xen-mainroom-particle-band ~ * select[aria-label="Particle System"], .grid select[aria-label="Particle System"]').count(),0,'no second copy');
 const harmonic=p.locator('h3',{hasText:'Harmonic System'}).locator('..');assert.equal(await harmonic.getByText('Particle System').count()+await harmonic.getByText('Particle Mode').count(),0,'gone from Harmonic System');
 // they work: the system decides which modes exist; the state follows
 const modesBefore=await mode.locator('option').allInnerTexts();
 await system.selectOption('12edo');await p.waitForTimeout(400);assert.equal(await system.inputValue(),'12edo');
 await system.selectOption('bp');await p.waitForTimeout(400);const modesBp=await mode.locator('option').allInnerTexts();assert.notDeepEqual(modesBp,modesBefore,'Bohlen-Pierce has its own modes');
 await system.selectOption('ji');await p.waitForTimeout(400);await mode.selectOption({index:2});await p.waitForTimeout(300);
 const chosen=await mode.inputValue();assert.notEqual(chosen,'chromatic');
 await p.keyboard.press('Escape');assert.equal(await mode.inputValue(),chosen);
 // ---- 2. More choices here ----
 await p.getByRole('button',{name:'More choices here'}).click();await p.waitForSelector('[data-installation-resident-controls]',{timeout:15000});await p.waitForTimeout(800);
 assert.match(await p.locator('.nd-heading h2').innerText(),/Art Installation/);
 const view=await p.locator('[data-installation-resident-controls]').evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,h:innerHeight}});
 assert.ok(view.top>=0&&view.bottom<=view.h,'the Resident controls are in view: '+JSON.stringify(view));
 // ---- 3. the hum (a fresh page WITHOUT Live power, so the Live Room drone cannot mask the measurement) ----
 await p.close();const q=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();q.on('pageerror',e=>errors.push(e.message));
 await q.addInitScript({path:path.resolve(__dirname,'../../tools/probes/room_activity_instrument.js')});await q.goto('file://'+html);await q.waitForTimeout(3500);
 await q.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await q.waitForTimeout(2000);
 const art=q.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await q.waitForTimeout(1200);
 const my=q.locator('[data-installation-sound-toggle]'),hum=q.locator('[data-installation-hum-toggle]');
 assert.equal(await hum.count(),1);assert.equal(await hum.getAttribute('aria-pressed'),'true');assert.match(await hum.innerText(),/Hum · ON/);
 const rms=async sec=>{await q.evaluate(()=>__probe.reset());let sum=0;for(let k=0;k<sec;k++){await q.waitForTimeout(700);sum+=Math.max(0,...(await q.evaluate(()=>__probe.rms())).map(x=>x.rms))}return sum/sec};
 assert.ok(await rms(2)<.002,'nothing sounds before Mycelium is on');
 await my.click();await q.waitForTimeout(3500);assert.equal(await my.getAttribute('aria-pressed'),'true','Mycelium is on');
 const loud=await rms(6);assert.ok(loud>.02,'the hum is audible: '+loud);
 await hum.click();await q.waitForTimeout(2500);
 assert.equal(await hum.getAttribute('aria-pressed'),'false');assert.match(await hum.innerText(),/Hum · muted/);assert.equal(await my.getAttribute('aria-pressed'),'true','muting the hum leaves Mycelium on');
 const quiet=await rms(6);console.log('hum RMS on/muted',loud.toFixed(4),quiet.toFixed(4));assert.ok(quiet<.002,'muted: silent, got '+quiet);
 await hum.click();await q.waitForTimeout(2500);assert.equal(await hum.getAttribute('aria-pressed'),'true');assert.ok(await rms(5)>.02,'the hum is back');
 await q.getByRole('button',{name:'Sound Design'}).click();await q.waitForTimeout(800);assert.equal(await q.locator('[data-installation-hum-toggle]').count(),0,'the hum button belongs to Art Installation only');
 assert.deepEqual(errors,[]);console.log('PASS PARTICLE-HEAD-01 + INSTALL-HUM-01');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
