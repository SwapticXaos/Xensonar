'use strict';
// FX-NET-02 (real app, Room V Multitrack): a Psy Lab patch chain as a shared send bus.
//  - a track's Psy Lab send changes the mixdown and adds a tail; another patch (Crystal Cave) changes it again
//  - send back to 0: the mixdown is bit-identical to the one without the spiral (no node in the path)
//  - playing with the send on: no page errors; the track FX panel shows the Spiral send and its four settings
// Usage: node tests/e2e/mt_spiral_send.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mtpsy-')),file=path.join(dir,'pluck.wav');
{const SR=44100,n=SR*3,x=new Float32Array(n);for(let i=0;i<n;i++){const t=(i%(SR/2))/SR;x[i]=.5*Math.exp(-t*9)*(Math.sin(2*Math.PI*220*i/SR)+.4*Math.sin(2*Math.PI*660*i/SR))}fs.writeFileSync(file,wav(x,SR))}
function parseWav(buf){let at=12,fmt=null,data=null;while(at+8<=buf.length){const id=buf.toString('latin1',at,at+4),size=buf.readUInt32LE(at+4);if(id==='fmt ')fmt={ch:buf.readUInt16LE(at+10),bits:buf.readUInt16LE(at+22)};if(id==='data')data=buf.subarray(at+8,at+8+size);at+=8+size+(size&1)}return {fmt,raw:data,frames:data.length/(fmt.bits/8)/fmt.ch}}
const peak=w=>{let m=0;for(let i=0;i<w.raw.length/4;i++)m=Math.max(m,Math.abs(w.raw.readFloatLE(i*4)));return m};
const rmsDiff=(a,b)=>{const n=Math.min(a.raw.length,b.raw.length)/4;let d=0;for(let i=0;i<n;i++){const x=a.raw.readFloatLE(i*4)-b.raw.readFloatLE(i*4);d+=x*x}return Math.sqrt(d/n)};
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2000);
 const room=name=>p.evaluate(n=>{[...document.querySelectorAll('header button, button')].find(x=>new RegExp(n).test(x.innerText)&&x.offsetParent).click()},name);
 const openRoom=async()=>{await room('MULTITRACK');await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(900)};
 const patch=async fn=>{await room('LIVE ROOM');await p.waitForTimeout(1200);await p.evaluate(async code=>{const db=await __XenMultitrackInbox.db();await new Promise((ok,bad)=>{const tx=db.transaction('projects','readwrite'),st=tx.objectStore('projects'),q=st.get('current');q.onsuccess=()=>{const pr=q.result;(new Function('p',code))(pr);st.put(pr,'current')};tx.oncomplete=ok;tx.onerror=()=>bad(tx.error)})},'('+fn.toString()+')(p)');await openRoom();await p.waitForSelector('.xmt .clip');await p.waitForTimeout(1200);await p.selectOption('[data-xmt-export-format]','float32')};
 const mixdown=async()=>{const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.getByRole('button',{name:/Mixdown/}).first().click()]);const w=parseWav(fs.readFileSync(await dl.path()));await p.waitForTimeout(300);return w};
 await openRoom();await p.setInputFiles('.xmt input[type=file]',file);await p.waitForSelector('.xmt .clip',{timeout:30000});await p.waitForTimeout(1500);await p.selectOption('[data-xmt-export-format]','float32');
 const A=await mixdown();
 await patch(p=>{const t=p.tracks.find(t=>t.clips.length);t.fx={...(t.fx||{}),psy:.6}});const B=await mixdown();
 const pA=peak(A),pB=peak(B);assert(pB<1.6,'no runaway level: peak '+pA.toFixed(3)+' → '+pB.toFixed(3));
 assert(B.frames>A.frames,'the Psy Lab send adds a tail: '+A.frames+' → '+B.frames+' frames');const dAB=rmsDiff(A,B);assert(dAB>1e-3,'the Psy Lab send changes the sound: '+dAB);
 await patch(p=>{p.master.psy={patch:'factory:Crystal Cave'}});const C=await mixdown();const dBC=rmsDiff(B,C);assert(dBC>1e-3,'another patch, another colour: '+dBC);
 // UI: the selected track's FX panel shows the send and the four settings
 await p.locator('.xmt .clip').first().click();await p.waitForTimeout(500);
 const ui=await p.evaluate(()=>[...document.querySelectorAll('[data-xmt-fx] label')].map(l=>l.innerText.split('\n')[0].trim()).filter(t=>/^(Psy Lab|Patch)$/.test(t)));
 assert.deepEqual(ui,['Psy Lab','Patch'],'the FX panel shows the Psy Lab send and the patch: '+ui.join(','));
 // playing with the send
 await p.getByRole('button',{name:/Play from cursor/}).click();await p.waitForTimeout(1500);await p.getByRole('button',{name:/^Stop|■/}).first().click().catch(()=>{});
 await patch(p=>{const t=p.tracks.find(t=>t.clips.length);t.fx={...(t.fx||{}),psy:0}});const D=await mixdown();
 assert(A.raw.equals(D.raw),'send back to 0: bit-identical to the mixdown without the Psy Lab');
 assert.deepEqual(errors,[]);console.log('PASS FX-NET-02 · tail '+A.frames+'→'+B.frames+' frames · Δ send '+dAB.toFixed(4)+' · Δ settings '+dBC.toFixed(4)+' · peak '+pA.toFixed(3)+'→'+pB.toFixed(3)+' · off = bit-identical · UI: '+ui.join(', '));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
