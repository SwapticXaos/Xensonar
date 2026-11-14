'use strict';
// MTW-01 (real app, Room IV and the Wave Editor): what the mixdown delivers and how the two rooms are linked.
//  - "As mixed" stays untouched; the status line reports programme loudness (BS.1770) and true peak, and both match an independent measurement of the file
//  - 24-bit WAV equals the float export to within one 24-bit step
//  - loudness target: by gain only when the peaks allow it; with the Wave Editor limiter when they do not (true peak held at -1 dBTP)
//  - stems: one file per audible track in one zip, same length, and their sum IS the mixdown (null test, with a reverb send on one track)
//  - the Master slider no longer resets the room length
//  - "Master in the Wave Editor": the mixdown arrives in the Wave Editor; there: analysis with LUFS / dBTP, Normalize Loudness (one undoable gain step), 24-bit export
// Usage: node tests/e2e/mtw01_delivery.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),vm=require('node:vm');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),root=path.join(__dirname,'..','..');
// the measuring core, loaded on its own (the same source the app ships)
const sandbox={console,Float32Array,Float64Array,Int32Array,Uint8Array,Uint32Array,ArrayBuffer,DataView,Math,Number,Object,Array,JSON,Map,Set,WeakMap,Promise,Error,RangeError,TypeError,Date,setTimeout,clearTimeout};sandbox.globalThis=sandbox;vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'src/post-oct/015-xen-wave-editor-w01-modules.js'),'utf8'),sandbox);const core=sandbox.__XenWaveCoreW01;
function wav16(file,sr,sec,fn){const n=Math.round(sr*sec),buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const [l,r]=fn(i,i/sr);buf.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(l*32767))),44+i*4);buf.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(r*32767))),46+i*4)}fs.writeFileSync(file,buf);return file}
function parseWav(buf){let at=12,fmt=null,data=null;while(at+8<=buf.length){const id=buf.toString('latin1',at,at+4),size=buf.readUInt32LE(at+4);if(id==='fmt ')fmt={tag:buf.readUInt16LE(at+8),ch:buf.readUInt16LE(at+10),rate:buf.readUInt32LE(at+12),bits:buf.readUInt16LE(at+22)};if(id==='data'){data=buf.subarray(at+8,at+8+size);break}at+=8+size+(size&1)}
 assert(fmt&&data,'a WAV with fmt and data');const bytes=fmt.bits/8,n=Math.floor(data.length/(bytes*fmt.ch)),ch=Array.from({length:fmt.ch},()=>new Float32Array(n));
 for(let i=0;i<n;i++)for(let c=0;c<fmt.ch;c++){const o=(i*fmt.ch+c)*bytes;ch[c][i]=fmt.tag===3?data.readFloatLE(o):fmt.bits===24?data.readIntLE(o,3)/8388608:data.readInt16LE(o)/32768}return {...fmt,frames:n,channels:ch}}
function unzip(buf){const out=[];let at=0;while(buf.readUInt32LE(at)===0x04034b50){const method=buf.readUInt16LE(at+8),crc=buf.readUInt32LE(at+14),size=buf.readUInt32LE(at+18),nl=buf.readUInt16LE(at+26),el=buf.readUInt16LE(at+28),name=buf.toString('utf8',at+30,at+30+nl),data=buf.subarray(at+30+nl+el,at+30+nl+el+size);out.push({name,method,crc,data});at+=30+nl+el+size}
 assert.equal(buf.readUInt32LE(at),0x02014b50,'the central directory follows the files');assert.equal(buf.readUInt32LE(buf.length-22),0x06054b50,'end record');assert.equal(buf.readUInt16LE(buf.length-12),out.length,'entry count');return out}
const crc32=d=>{let c=0xffffffff;for(let i=0;i<d.length;i++){c^=d[i];for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1}return (c^0xffffffff)>>>0};
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mtw01-'));let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff-.5};
  const fileA=wav16(path.join(dir,'pad.wav'),48000,4,(i,t)=>{const w=rnd()*.2;return [.18*Math.sin(2*Math.PI*220*t)+w*.3,.18*Math.sin(2*Math.PI*330*t)+w*.3]});
  const fileB=wav16(path.join(dir,'clicks.wav'),48000,4,(i,t)=>{const k=i%24000,click=k<96?.9*Math.sin(2*Math.PI*3000*t)*(1-k/96):0,body=.025*Math.sin(2*Math.PI*440*t);return [body+click,body+click]});
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.evaluate(()=>{[...document.querySelectorAll('header button, button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});
  await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800);
  const status=()=>p.evaluate(()=>document.querySelector('.xmt .warn[role=alert]')?.innerText||'');
  const project=()=>p.evaluate(async()=>{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>ok(q.result)})});
  const menuItem=text=>p.evaluate(t=>{const x=[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>x.innerText.replace(/\s+/g,' ').trim().startsWith(t));if(!x)throw Error('no menu item '+t);x.click()},text);
  const download=async act=>{const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),act()]);const f=await dl.path();return {name:dl.suggestedFilename(),buf:fs.readFileSync(f)}};
  const mixdown=()=>download(()=>p.getByRole('button',{name:/Mixdown/}).first().click());
  const importFile=async(f,count)=>{await p.setInputFiles('.xmt input[type=file]',f);await p.waitForFunction(n=>document.querySelectorAll('.xmt .clip').length>=n,count,{timeout:30000});await p.waitForTimeout(1500)};
  await importFile(fileA,1);
  assert.deepEqual(await p.locator('[data-xmt-export-format] option').evaluateAll(o=>o.map(x=>x.value)),['pcm16','pcm24','float32'],'16-bit, 24-bit and float are offered');
  // ---- A: as mixed, float: the status line carries loudness and true peak, and they are right ----
  await p.selectOption('[data-xmt-export-format]','float32');
  const A=await mixdown();await p.waitForTimeout(400);const a=parseWav(A.buf),ma=core.loudness(a.channels,a.rate),sa=await status();
  assert.equal(a.tag,3);assert.equal(a.rate,48000);
  const lu=/(-?[\d.]+) LUFS/.exec(sa),tp=/true peak (-?[\d.]+) dBTP/.exec(sa);assert(lu&&tp,'status reports LUFS and true peak: '+sa);
  assert(Math.abs(Number(lu[1])-ma.integrated)<.11,'reported loudness '+lu[1]+' = measured '+ma.integrated.toFixed(2));assert(Math.abs(Number(tp[1])-ma.truePeakDb)<.11,'reported true peak '+tp[1]+' = measured '+ma.truePeakDb.toFixed(2));
  // ---- B: 24-bit ----
  await p.selectOption('[data-xmt-export-format]','pcm24');const B=await mixdown(),bb=parseWav(B.buf);
  assert.equal(bb.bits,24);assert.equal(bb.tag,1);assert.equal(bb.frames,a.frames,'same length as the float export');
  let worst=0;for(let c=0;c<2;c++)for(let i=0;i<a.frames;i++){const d=Math.abs(bb.channels[c][i]-a.channels[c][i]);if(d>worst)worst=d}
  assert(worst<=1.01/8388608,'24-bit equals float to within one step: '+worst*8388608+' steps');
  // ---- C: loudness target reached by gain only ----
  await p.selectOption('[data-xmt-export-format]','float32');await p.selectOption('[data-xmt-export-finish]','lufs-23');
  const C=await mixdown();await p.waitForTimeout(400);const c=parseWav(C.buf),mc=core.loudness(c.channels,c.rate),sc=await status();
  assert(Math.abs(mc.integrated+23)<.1,'-23 LUFS reached: '+mc.integrated.toFixed(2));assert(/by gain only/.test(sc),'the status says how: '+sc);assert(/-23LUFS/.test(C.name),'the file name carries the target: '+C.name);
  {const k=Math.pow(10,(mc.integrated-ma.integrated)/20);let d=0;for(let i=0;i<a.frames;i+=7)d=Math.max(d,Math.abs(c.channels[0][i]-a.channels[0][i]*k));assert(d<2e-4,'gain only: the file is the mix times one factor ('+d+')')}
  // ---- D: a peaky second track: the target needs the limiter, the true peak stays at -1 dBTP ----
  await importFile(fileB,2);await p.selectOption('[data-xmt-export-finish]','lufs-14');
  // mute the pad so that only the clicks remain: far too peaky for -14 LUFS without limiting
  await p.getByRole('button',{name:/^Mute /}).first().click();await p.waitForTimeout(500);
  const D=await mixdown();await p.waitForTimeout(400);const d=parseWav(D.buf),md=core.loudness(d.channels,d.rate),sd=await status();
  assert(/Wave Editor limiter/.test(sd),'the limiter is named: '+sd);assert(md.truePeakDb<=-1+.06,'true peak held at -1 dBTP: '+md.truePeakDb.toFixed(2));assert(md.integrated>-30&&md.integrated<=-14+.2,'louder than before, not above the target: '+md.integrated.toFixed(2));
  await p.getByRole('button',{name:/^Mute /}).first().click();await p.waitForTimeout(400);await p.selectOption('[data-xmt-export-finish]','');
  // ---- E: stems, with a reverb send on track 1; their sum is the mixdown ----
  await p.locator('.xmt .trk .hdr').nth(1).click();await p.waitForSelector('[data-xmt-fx]');
  await p.getByLabel(/^Reverb of /).fill('0.5');await p.waitForTimeout(1000);
  assert((await project()).tracks[0].fx?.reverb>0,'the reverb send is set');
  const M=await mixdown(),m=parseWav(M.buf);
  await p.locator('[data-xmt-export-more]').click();await p.waitForSelector('.xmt-menu');
  const Z=await download(()=>menuItem('Stems'));assert(/stems\.zip$/.test(Z.name),Z.name);const files=unzip(Z.buf);
  assert.equal(files.length,2,'one file per audible track: '+files.map(f=>f.name));for(const f of files){assert.equal(f.method,0);assert.equal(crc32(f.data),f.crc,'CRC of '+f.name);assert(/^\d\d .+\.wav$/.test(f.name),f.name)}
  const stems=files.map(f=>parseWav(f.data));for(const s of stems)assert.equal(s.frames,m.frames,'every stem has the length of the mixdown');
  let nul=0,ref=0;for(let c=0;c<2;c++)for(let i=0;i<m.frames;i++){const sum=stems[0].channels[c][i]+stems[1].channels[c][i];nul=Math.max(nul,Math.abs(sum-m.channels[c][i]));ref=Math.max(ref,Math.abs(m.channels[c][i]))}
  assert(ref>.05&&nul<1e-5,'the stems add up to the mixdown: residual '+nul+' against a peak of '+ref);
  // ---- F: the Master slider keeps the room length ----
  await p.getByLabel('Room s').fill('4');await p.waitForTimeout(300);await p.getByLabel('Master volume').fill('0.7');await p.waitForTimeout(900);
  {const pr=await project();assert.equal(pr.master.reverbSize,4,'the room length survives a Master move');assert.equal(pr.master.volume,.7)}
  // ---- G: master in the Wave Editor ----
  await p.locator('[data-xmt-export-more]').click();await p.waitForSelector('.xmt-menu');await menuItem('Master in the Wave Editor');
  await p.waitForFunction(()=>{const w=globalThis.__XenWaveUIW01;return !!w&&[...document.querySelectorAll('canvas')].some(c=>{try{return w.getEditor(c)?.doc?.frames>0&&!!w.getEditor(c).overlay}catch{return false}})},null,{timeout:60000});
  await p.waitForTimeout(1200);
  const ED=`(()=>{const w=globalThis.__XenWaveUIW01;return w.getEditor([...document.querySelectorAll('canvas')].find(c=>{try{return w.getEditor(c)?.doc?.frames>0}catch{return false}}))})()`;
  const ed=await p.evaluate(`(()=>{const e=${ED};return {frames:e.doc.frames,rate:e.doc.sampleRate,ch:e.doc.channels.length,lufs:__XenWaveCoreW01.loudness(e.doc.channels,e.doc.sampleRate).integrated}})()`);
  assert.equal(ed.ch,2);assert(ed.frames>ed.rate*3.9,'the mixdown is in the Wave Editor: '+ed.frames+' frames at '+ed.rate+' Hz (the editor works at the rate of the Forge)');
  assert.deepEqual(await p.locator('select[aria-label="WAV Format"] option').evaluateAll(o=>o.map(x=>x.value)),['float32','pcm24','pcm16'],'the editor exports 24-bit too');
  await p.evaluate(`(()=>{const e=${ED};e.doc=__XenWaveCoreW01.setSelection(e.doc,0,e.doc.frames);e.refresh(false)})()`);
  await p.locator('[data-xwe-chromatic-action="analyze"]').click();await p.waitForTimeout(300);
  const analysis=await p.locator('.xwe-analysis').innerText();assert(/Whole file/.test(analysis)&&/LUFS integrated/.test(analysis)&&/True peak -?[\d.]+ dBTP/.test(analysis)&&/L\/R correlation/.test(analysis),'analysis with loudness, true peak and correlation: '+analysis);
  assert(Math.abs(Number(/Loudness (-?[\d.]+) LUFS/.exec(analysis)[1])-ed.lufs)<.06);
  await p.locator('[data-xwe-lufs-target]').fill('-20');await p.locator('[data-xwe-chromatic-action="loudness"]').click();await p.waitForTimeout(900);
  const after=await p.evaluate(`(()=>{const e=${ED};return {lufs:__XenWaveCoreW01.loudness(e.doc.channels,e.doc.sampleRate).integrated,past:e.doc.history.past.length,frames:e.doc.frames}})()`);
  assert(Math.abs(after.lufs+20)<.06,'Normalize Loudness reaches the target: '+after.lufs);assert.equal(after.frames,ed.frames);assert(after.past>=1,'it is one undoable edit');
  await p.evaluate(`(${ED}).runEdit('undo')`);await p.waitForTimeout(600);
  const undone=await p.evaluate(`(()=>{const e=${ED};return __XenWaveCoreW01.loudness(e.doc.channels,e.doc.sampleRate).integrated})()`);assert(Math.abs(undone-ed.lufs)<1e-6,'Undo restores the level');
  assert.deepEqual(errors,[]);
  console.log('PASS MTW-01 delivery: loudness/true peak report, 24-bit, loudness target (gain / limiter), stems null test '+nul.toExponential(1)+', room length kept, mastering path into the Wave Editor, Normalize Loudness');
  await b.close();fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
