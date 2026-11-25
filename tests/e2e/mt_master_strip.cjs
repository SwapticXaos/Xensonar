'use strict';
// MT-MASTER-01 (real app, Room V Multitrack): the master strip (Glue · Tape · Air · Limit).
//  - off: the mixdown is bit-identical to a mixdown without it (not in the signal path)
//  - on with Limit −12 dB (+ Tape): the mixdown never goes above −12 dBFS, and it differs from the raw one
//  - playing with the strip on: no page errors, the master meter moves
// Usage: node tests/e2e/mt_master_strip.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mtms-')),file=path.join(dir,'loud.wav');
{const SR=44100,n=SR*4,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.95*Math.sin(2*Math.PI*110*i/SR)*(i%(SR/2)<SR/6?1:.25);fs.writeFileSync(file,wav(x,SR))}
function parseWav(buf){let at=12,fmt=null,data=null;while(at+8<=buf.length){const id=buf.toString('latin1',at,at+4),size=buf.readUInt32LE(at+4);if(id==='fmt ')fmt={tag:buf.readUInt16LE(at+8),ch:buf.readUInt16LE(at+10),bits:buf.readUInt16LE(at+22)};if(id==='data')data=buf.subarray(at+8,at+8+size);at+=8+size+(size&1)}
 const n=data.length/(fmt.bits/8)/fmt.ch,peak={v:0};const s=[];for(let i=0;i<n*fmt.ch;i++){const v=fmt.bits===32?data.readFloatLE(i*4):data.readInt16LE(i*2)/32768;s.push(v);if(Math.abs(v)>peak.v)peak.v=Math.abs(v)}return {fmt,peak:peak.v,samples:s,raw:data}}
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1600,height:900},acceptDownloads:true})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2000);
 await p.evaluate(()=>{[...document.querySelectorAll('button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});
 await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800);
 await p.setInputFiles('.xmt input[type=file]',file);await p.waitForSelector('.xmt .clip',{timeout:30000});await p.waitForTimeout(1500);
 await p.selectOption('[data-xmt-export-format]','float32');
 const mixdown=async()=>{const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.getByRole('button',{name:/Mixdown/}).first().click()]);const w=parseWav(fs.readFileSync(await dl.path()));await p.waitForTimeout(500);return w};
 const setRange=async(key,v)=>p.locator(`[data-xmt-master-strip="${key}"]`).evaluate((el,v)=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))},v);
 const A=await mixdown();const dbA=20*Math.log10(A.peak);
 await p.locator('[data-xmt-master-fx]').click();await p.waitForTimeout(300);await setRange('ceil',-12);await setRange('tape',.6);await p.waitForTimeout(300);
 const B=await mixdown();const dbB=20*Math.log10(B.peak);
 assert(dbA>-9,'the raw mixdown is loud: '+dbA.toFixed(2)+' dBFS');assert(dbB<=-12+.05,'with Limit −12 dB nothing goes above the ceiling: '+dbB.toFixed(2)+' dBFS');
 assert(!A.raw.equals(B.raw),'the strip changes the sound');
 // playing with the strip on
 await p.getByRole('button',{name:/Play from cursor/}).click();await p.waitForTimeout(1500);const w=await p.locator('[data-xmt-master-meter] i').evaluate(e=>parseFloat(e.style.width)||0);
 await p.getByRole('button',{name:/^Stop|■/}).first().click().catch(()=>{});assert(w>0,'the master meter moves while playing with the strip: '+w);
 await p.locator('[data-xmt-master-fx]').click();await p.waitForTimeout(300);const C=await mixdown();
 assert(A.raw.equals(C.raw),'strip off again: the mixdown is bit-identical to the raw one');
 assert.deepEqual(errors,[]);console.log('PASS MT-MASTER-01 raw peak '+dbA.toFixed(2)+' dBFS · strip (Limit −12, Tape 60 %) '+dbB.toFixed(2)+' dBFS · off again bit-identical · meter '+w.toFixed(0)+' %');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
