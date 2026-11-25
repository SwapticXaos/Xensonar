'use strict';
// ROOM-SWITCH-01 (real app): import a long song in the Spectral Forge, then switch rooms back and forth quickly.
// Extract Timbre first (the donor holds the whole song). The Material Forge must never fall into "Room error isolated" (e.g. "snapshot exceeds the 256 MiB data budget").
// Usage: node tests/e2e/forge_room_switch_budget.cjs dist/XenSonar_PROBE.html [minutes=6] [switches=12]
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),minutes=Number(process.argv[3]||6),switches=Number(process.argv[4]||12);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-switch-')),file=path.join(dir,'long.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:minutes*60}),SR));
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/WebSocket|passive event/.test(m.text()))errs.push('console: '+m.text().slice(0,240))});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const room=async(re,wait)=>{await p.evaluate(r=>{const b=[...document.querySelectorAll('header button')].find(b=>new RegExp(r).test(b.innerText));b&&b.click()},re);await p.waitForTimeout(wait)};
 await room('MATERIAL FORGE',2000);await p.getByText('Import Audio').first().click();await p.waitForTimeout(2000);
 await p.locator('input[type=file][accept^="audio/"]').first().setInputFiles(file);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:120000});await p.waitForTimeout(3000);
 /* Extract Timbre: the donor keeps the whole source audio (mono, L, R, mid, side) – the big part of the Forge project snapshot */
 const ex=p.getByRole('button',{name:/Extract Timbre/}).first();if(await ex.count()){await ex.scrollIntoViewIfNeeded();await ex.click();await p.waitForTimeout(30000)}else throw Error('Extract Timbre not found');
 /* every restore path of the Forge (wake-up, saved workspace, return from a sub view) loads the project snapshot through the same codec */
 const load=await p.evaluate(()=>window.__xenProbe.draw.evalInBundle(`(()=>{const s=pe.getState().createProjectSnapshot();let mb=0;const w=(v,d)=>{if(!v||typeof v!=='object'||d>40)return;if(ArrayBuffer.isView(v)){mb+=v.byteLength/1048576;return}for(const x of Object.values(v))w(x,d+1)};w(s,0);
  try{pe.getState().loadProjectSnapshot(s);return 'ok '+mb.toFixed(0)+' MiB'}catch(e){return 'ERROR '+e.message+' ('+mb.toFixed(0)+' MiB)'}})()`));
 console.log('reload project snapshot:',load);if(!/^ok/.test(load)){console.log('FAIL ROOM-SWITCH-01 '+load);process.exit(1)}
 const isolated=async()=>p.evaluate(()=>{const t=document.body.innerText;const i=t.indexOf('Room error isolated');return i<0?null:t.slice(i,i+300)});
 const rooms=['LIVE ROOM','MATERIAL FORGE','NODAL CENTER','MATERIAL FORGE','PSY LAB','MATERIAL FORGE','MULTITRACK','MATERIAL FORGE'];
 let bad=null;
 for(let k=0;k<switches&&!bad;k++){const r=rooms[k%rooms.length];await room(r,k%3===0?150:700);bad=await isolated()}
 await p.waitForTimeout(2500);bad=bad||await isolated();
 if(!bad){await room('MATERIAL FORGE',3000);bad=await isolated()}
 /* the saved Forge workspace (IndexedDB) is restored when the room is built anew: reload, power on, enter the Material Forge */
 if(!bad){await p.waitForTimeout(6000);await p.reload();await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2500);
  await room('MATERIAL FORGE',8000);bad=await isolated();if(!bad){await room('LIVE ROOM',1500);await room('MATERIAL FORGE',6000);bad=await isolated()}}
 const heap=await p.evaluate(()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576)+' MiB':'n/a');
 console.log('heap',heap);if(errs.length)console.log('errors',errs.slice(0,4));
 await b.close();
 if(bad){console.log('FAIL ROOM-SWITCH-01 '+bad.replace(/\s+/g,' '));process.exit(1)}
 console.log('PASS ROOM-SWITCH-01 '+minutes+' min song, '+switches+' room switches');
})().catch(e=>{console.error(e);process.exit(1)});
