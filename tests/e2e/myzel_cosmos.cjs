'use strict';
// MYZEL-COSMOS-01 (real app, Art Installation):
//  1. "Constellation Web" sits with the other mix sliders (default 70 %), the "Constellation cosmos" line names the
//     sound world of the current layout, and the web links are drawn on the canvas while the hum runs.
//  2. Rebuild Layout gives a new cosmos: the line and the links change (several rolls, at least two different worlds).
//  3. The hum is audible with the web at 70 % and at 0 % (0 % = the G2 sound), and Hum muted silences the web too.
// Usage: node tests/e2e/myzel_cosmos.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const q=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[],fallback=[];q.on('pageerror',e=>errors.push(e.message));q.on('console',m=>{if(/myzel-g2\]/.test(m.text()))fallback.push(m.text());});
 await q.addInitScript({path:path.resolve(__dirname,'../../tools/probes/room_activity_instrument.js')});
 await q.goto('file://'+html);await q.waitForTimeout(3500);
 await q.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await q.waitForTimeout(2000);
 const art=q.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await q.waitForTimeout(1200);
 const line=q.locator('[data-myzel-cosmos-summary]'),slider=q.locator('input[aria-label="Constellation Web"]');
 assert.equal(await slider.count(),1,'one Constellation Web slider');
 
 // probe build only: count the canvas calls of the link drawing (bundle scope)
 const inBundle=code=>q.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 await inBundle('window.__cosmosDraws=0;{const draw=myzelGDrawCosmos;myzelGDrawCosmos=ctx=>{window.__cosmosDraws++;return draw(ctx);};}');
 await q.waitForTimeout(3500); // NODAL-AUTOSTART-01: Mycelium is already on
 // ---- 1. slider, line, links ----
 assert.equal(await slider.inputValue(),'0.7','default 70 %');
 const labels=await q.locator('[data-myzel-web-level]').locator('..').locator('label').allInnerTexts();
 assert.ok(labels.some(t=>/Node Presence/.test(t))&&labels.some(t=>/Constellation Web 70%/.test(t)),'in the row of the mix sliders: '+JSON.stringify(labels));
 await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();assert.ok(box&&box.width>80,'slider usable: '+JSON.stringify(box));
 const first=await line.innerText();assert.match(first,/web · (glassy|bronze|metallic) · (plucked|struck|swelling) · /,'cosmos named: '+first);
 const view=()=>inBundle('({links:__myzelCosmosView.cosmos.links.length,key:__myzelCosmosView.cosmos.key,age:performance.now()-__myzelCosmosView.at})');
 const v1=await view();assert.ok(v1.links>=10&&v1.age<1000,'web of the layout is live: '+JSON.stringify(v1));
 const draws=await q.evaluate(()=>window.__cosmosDraws);assert.ok(draws>20,'links drawn every frame: '+draws);
 // ---- 2. Rebuild Layout ----
 const worlds=new Set([first]),keys=new Set([v1.key]);
 for(let i=0;i<4;i++){await q.getByRole('button',{name:'Rebuild Layout'}).click();await q.waitForTimeout(1300);worlds.add(await line.innerText());keys.add((await view()).key);}
 assert.equal(keys.size,5,'every roll is a new layout');assert.ok(worlds.size>=2,'and a new sound world: '+[...worlds].join(' | '));
 console.log('worlds:',[...worlds].join(' | '));
 // ---- 3. sound ----
 const rms=async sec=>{await q.evaluate(()=>__probe.reset());let sum=0;for(let k=0;k<sec;k++){await q.waitForTimeout(700);sum+=Math.max(0,...(await q.evaluate(()=>__probe.rms())).map(x=>x.rms))}return sum/sec};
 const on=await rms(5);assert.ok(on>.02,'hum audible with the web: '+on);
 await slider.fill('0');await q.waitForTimeout(800);assert.match(await q.locator('[data-myzel-web-level]').innerText(),/Constellation Web 0%/);
 const g2=await rms(5);assert.ok(g2>.02,'web 0 %: the G2 hum is still there: '+g2);
 await slider.fill('0.7');await q.waitForTimeout(500);
 const hum=q.locator('[data-installation-hum-toggle]');await hum.click();await q.waitForTimeout(2500);
 const muted=await rms(4);assert.ok(muted<.002,'Hum muted silences the web too: '+muted);
 await hum.click();await q.waitForTimeout(1500);
 console.log('RMS web 70 %',on.toFixed(4),'web 0 %',g2.toFixed(4),'hum muted',muted.toFixed(5));
 assert.deepEqual(fallback,[],'the hum runs in its AudioWorklet (the web does not exist in the native fallback)');
 assert.deepEqual(errors,[]);console.log('PASS MYZEL-COSMOS-01');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
