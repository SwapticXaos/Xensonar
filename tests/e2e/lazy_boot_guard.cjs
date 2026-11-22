'use strict';
// LAZY-BOOT-GUARD-01 (real app): verifies that cold boot keeps deferred rooms and lazy subsystem chunks
// uncompiled until actually opened, and that opening Spectral Forge loads only its declared dependencies.
// Usage: node tests/e2e/lazy_boot_guard.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');

(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await (await b.newContext({viewport:{width:1440,height:960}})).newPage();
 const errs=[];
 p.on('pageerror',e=>errs.push(e.message));

 await p.goto('file://'+html);
 await p.waitForFunction(()=>window.__XenBoot?.state?.().ready===true,null,{timeout:60000});
 await p.waitForTimeout(1500);

 const cold=await p.evaluate(()=>window.__XenLazyLoader.report());
 assert.ok(cold && cold.totals && cold.totals.count>=25,'expected >=25 lazy payloads, got '+cold?.totals?.count);
 assert.ok(cold.totals.deferredBytes>=1800000,'expected >=1.8 MB deferred at cold boot, got '+cold.totals.deferredBytes);

 // Cold rooms must remain uncompiled at boot (psylab may load on a fresh browser if selected as starter)
 for(const room of ['lab','canonical','nodal','multitrack','xenpolar']){
  assert.equal(cold.rooms[room]?.loaded,false,'room '+room+' must stay cold at boot');
 }
 // All 9 lazy subsystem chunks must remain uncompiled at cold boot
 for(const chunk of ['wave-editor-dsp','wave-editor-ui','wave-analysis','package-station','forge-stamps','forge-emilia','forge-fractalia','forge-workflow','sound-recipe-export']){
  assert.equal(cold.chunks[chunk]?.loaded,false,'chunk '+chunk+' must stay cold at boot');
 }

 // Open Spectral Forge -> lab + wave-editor-ui + wave-editor-dsp load via data-xen-deps; unrelated chunks stay cold
 await p.evaluate(()=>{const btn=[...document.querySelectorAll('header button')].find(x=>/MATERIAL FORGE/i.test(x.innerText));if(!btn)throw Error('MATERIAL FORGE button missing');btn.click()});
 await p.waitForTimeout(2000);
 await p.locator('[data-xen-tile="forge"]').first().click();
 await p.waitForFunction(()=>window.__XenRoomChunks?.status?.().lab===true,null,{timeout:30000});
 await p.waitForTimeout(500);

 const afterForge=await p.evaluate(()=>window.__XenLazyLoader.report());
 assert.equal(afterForge.rooms.lab.loaded,true,'lab room loaded after entering Spectral Forge');
 assert.equal(afterForge.chunks['wave-editor-ui'].loaded,true,'wave-editor-ui loaded via lab data-xen-deps');
 assert.equal(afterForge.chunks['wave-editor-dsp'].loaded,true,'wave-editor-dsp loaded transitively via wave-editor-ui');
 // Chunks that were NOT triggered must still stay cold
 for(const stillCold of ['wave-analysis','package-station','forge-emilia','forge-fractalia','forge-workflow','sound-recipe-export']){
  assert.equal(afterForge.chunks[stillCold]?.loaded,false,'chunk '+stillCold+' must still stay cold until triggered');
 }

 assert.deepEqual(errs,[],'no page errors');
 console.log(`PASS LAZY-BOOT-GUARD-01: ${cold.totals.coldCount}/${cold.totals.count} lazy blocks cold at boot (${Math.round(cold.totals.deferredBytes/1024)} KB deferred); Forge loads lab+wave-editor while keeping analysis/package/emilia/fractalia cold`);
 await b.close();
})().catch(e=>{console.error(String(e?.message||e));process.exit(1)});
