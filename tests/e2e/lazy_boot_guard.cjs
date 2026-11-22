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
 assert.ok(cold && cold.totals && cold.totals.count>=28,'expected >=28 lazy payloads, got '+cold?.totals?.count);
 assert.ok(cold.totals.deferredBytes>=2400000,'expected >=2.4 MB deferred at cold boot, got '+cold.totals.deferredBytes);

 // Cold rooms must remain uncompiled at boot (psylab may load on a fresh browser if selected as starter)
 for(const room of ['lab','canonical','nodal','multitrack','xenpolar']){
  assert.equal(cold.rooms[room]?.loaded,false,'room '+room+' must stay cold at boot');
 }
 // All 11 non-Live-Room lazy subsystem chunks must remain uncompiled at cold boot.
 // (entrophon-wasm is also used by Live Room's WaveStarter worklet backend and compiles
 // asynchronously after AudioWorklet registration — verified non-synchronous by lazy_architecture.test.cjs.)
 assert.ok(cold.chunks['entrophon-wasm'],'chunk entrophon-wasm must be registered');
 for(const chunk of ['wave-editor-dsp','wave-editor-ui','wave-analysis','package-station','forge-engines','forge-hearing-ui','forge-stamps','forge-emilia','forge-fractalia','forge-workflow','sound-recipe-export']){
  assert.equal(cold.chunks[chunk]?.loaded,false,'chunk '+chunk+' must stay cold at boot');
 }

 // Open Spectral Forge -> lab + wave-editor-ui + wave-editor-dsp + forge-engines + forge-hearing-ui load via data-xen-deps; unrelated chunks stay cold
 await p.evaluate(()=>{const btn=[...document.querySelectorAll('header button')].find(x=>/MATERIAL FORGE/i.test(x.innerText));if(!btn)throw Error('MATERIAL FORGE button missing');btn.click()});
 await p.waitForTimeout(2000);
 await p.locator('[data-xen-tile="forge"]').first().click();
 await p.waitForFunction(()=>window.__XenRoomChunks?.status?.().lab===true,null,{timeout:30000});
 await p.waitForTimeout(500);

 const afterForge=await p.evaluate(()=>window.__XenLazyLoader.report());
 assert.equal(afterForge.rooms.lab.loaded,true,'lab room loaded after entering Spectral Forge');
 assert.equal(afterForge.chunks['wave-editor-ui'].loaded,true,'wave-editor-ui loaded via lab data-xen-deps');
 assert.equal(afterForge.chunks['wave-editor-dsp'].loaded,true,'wave-editor-dsp loaded transitively via wave-editor-ui');
 assert.equal(afterForge.chunks['forge-engines'].loaded,true,'forge-engines loaded via lab data-xen-deps');
 assert.equal(afterForge.chunks['forge-hearing-ui'].loaded,true,'forge-hearing-ui loaded via lab data-xen-deps');
 // Emilia is the default listening carrier of a fresh Forge workspace
 // (KQ() in src/app/forge/04_profiles_and_body_models.js). Its control panel
 // EmiliaForgeLab mounts with the Forge and is therefore a legitimate trigger
 // for forge-emilia - not a boot leak. It is still asserted cold *before* Forge.
 assert.equal(afterForge.chunks['forge-emilia'].loaded,true,'forge-emilia loaded because Emilia is the default Forge carrier');
 // The Forge workshop captures the full project snapshot on mount (oz() in src/rooms/lab.js)
 // so it can restore it on exit; that snapshot carries the persisted Fractalia recipe
 // (fractaliaInstrument). A cold null would change saved-project/restore semantics, so
 // forge-fractalia legitimately compiles on Forge entry. Both stay cold at boot (above).
 assert.equal(afterForge.chunks['forge-fractalia'].loaded,true,'forge-fractalia loaded for the Forge project snapshot');
 // Chunks that were NOT triggered must still stay cold
 for(const stillCold of ['wave-analysis','package-station','forge-workflow','sound-recipe-export']){
  assert.equal(afterForge.chunks[stillCold]?.loaded,false,'chunk '+stillCold+' must still stay cold until triggered');
 }

 assert.deepEqual(errs,[],'no page errors');
 console.log(`PASS LAZY-BOOT-GUARD-01: ${cold.totals.coldCount}/${cold.totals.count} lazy blocks cold at boot (${Math.round(cold.totals.deferredBytes/1024)} KB deferred); Forge loads lab+wave-editor+Emilia/Fractalia (default carrier, project snapshot) while keeping analysis/package/workflow/recipe-export cold`);
 await b.close();
})().catch(e=>{console.error(String(e?.message||e));process.exit(1)});
