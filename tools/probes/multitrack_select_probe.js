/* Probe only (not shipped): ROOM4-10 multi-selection, markers, metronome and count-in in the real app. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const f=path.join(os.tmpdir(),'xen_sel_tone.wav');{const sr=48000,n=sr*2,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(6000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1700,height:1000}});
await cx.addInitScript(()=>{window.__osc=0;const o=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.__osc++;return o.call(this)}});
const p=await cx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept('Verse'));
await p.goto('file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html')));await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1200);
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
const clips=async()=>{await p.waitForTimeout(900);return (await proj()).tracks.flatMap(t=>t.clips.map(c=>({id:c.id,t:t.name,s:+c.startBeat.toFixed(3),m:!!c.muted})))};
const log=o=>console.log(JSON.stringify(o));
// a few clips over two tracks: duplicate (Ctrl+D) twice, then a second track via + Track and a clip there
await p.locator('.xmt .clip').first().click();await p.keyboard.press('Control+d');await p.waitForTimeout(300);await p.keyboard.press('Control+d');await p.waitForTimeout(500);
log({step:'three clips',clips:(await clips()).length});
// rubber band over the whole first lane
const lane=p.locator('.xmt .lane').first();const lb=await lane.boundingBox();
await p.mouse.move(lb.x+lb.width-40,lb.y+lb.height-2);await p.mouse.down();await p.mouse.move(lb.x+5,lb.y+2,{steps:8});await p.mouse.up();await p.waitForTimeout(500);
log({step:'rubber band',groupBar:await p.locator('[data-xmt-group]').getAttribute('data-xmt-group').catch(()=>null),selected:await p.locator('.xmt .clip[aria-selected=true]').count()});
const before=await clips();
// drag one selected clip: all move together
const cb=await p.locator('.xmt .clip').nth(1).boundingBox();await p.mouse.move(cb.x+cb.width/2,cb.y+cb.height/2);await p.mouse.down();await p.mouse.move(cb.x+cb.width/2+90,cb.y+cb.height/2,{steps:8});await p.mouse.up();
const after=await clips();const deltas=after.map((c,i)=>+(c.s-before.find(x=>x.id===c.id).s).toFixed(3));
log({step:'group drag',deltas,allEqual:deltas.every(d=>Math.abs(d-deltas[0])<1e-6)&&deltas[0]>0});
await p.keyboard.press('m');const mm=await clips();log({step:'mute all (M)',allMuted:mm.every(c=>c.m)});await p.keyboard.press('m');
await p.keyboard.press('Control+d');const dup=await clips();log({step:'duplicate group',count:dup.length});
await p.keyboard.press('Delete');const del=await clips();log({step:'delete the duplicated group',count:del.length});
await p.keyboard.press('Control+a');await p.waitForTimeout(300);log({step:'select all',selected:await p.locator('.xmt .clip[aria-selected=true]').count()});
await p.keyboard.press('Escape');await p.waitForTimeout(200);log({step:'escape',groupBar:await p.locator('[data-xmt-group]').count()});
// markers
await p.locator('.xmt').click({position:{x:5,y:5}});await p.locator('.xmt .ruler').first().click({position:{x:120,y:12}});await p.keyboard.press('b');await p.waitForTimeout(500);
await p.locator('.xmt .ruler').first().click({position:{x:420,y:12}});await p.keyboard.press('b');await p.waitForTimeout(700);
const m1=(await proj()).markers;log({step:'two markers',markers:m1.map(m=>[m.name,+m.beat.toFixed(2)])});
await p.locator('.xmt .mk').first().dblclick();await p.waitForTimeout(700);log({step:'rename',name:(await proj()).markers[0].name});
await p.keyboard.press('Home');await p.keyboard.press(']');await p.waitForTimeout(300);log({step:'jump to next marker',cursorText:await p.locator('.xmt .muted',{hasText:'Cursor'}).first().innerText()});
await p.locator('.xmt .mk').last().click({button:'right'});await p.waitForTimeout(250);await p.evaluate(()=>{[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>x.innerText.startsWith('Delete marker'))?.click()});log({step:'delete marker',count:(await proj()).markers.length});
// metronome and count-in: oscillators created while playing (a click is one oscillator)
await p.keyboard.press('Home');
const osc=async()=>p.evaluate(()=>window.__osc);
let o0=await osc();await p.keyboard.press('Space');await p.waitForTimeout(3200);await p.keyboard.press('Space');await p.waitForTimeout(400);const o1=await osc();
log({step:'play, metronome OFF',clicks:o1-o0});
await p.locator('[data-xmt-metro]').click();await p.waitForTimeout(200);o0=await osc();await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Space');await p.waitForTimeout(3200);await p.keyboard.press('Space');await p.waitForTimeout(400);const o2=await osc();
log({step:'play, metronome ON (108 BPM, ~3.2 s)',clicks:o2-o0});
await p.locator('[data-xmt-countin]').click();o0=await osc();await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Space');await p.waitForTimeout(500);const o3=await osc();await p.keyboard.press('Space');
log({step:'with count-in: clicks right after start',clicks:o3-o0});
log({step:'errors',errors});await b.close()})();
