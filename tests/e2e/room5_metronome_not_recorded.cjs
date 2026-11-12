'use strict';
// ROOM5-02 (real app): the Room V metronome is for the player only. Take 1 records 4 s with the metronome running and nothing else:
// the WAV must be silent. Take 2 records a pad note: the WAV must contain it (so the silence of take 1 is not a broken recorder).
// Also: the click really sounds on the speaker side (analyser on the destination), and stops when the metronome is switched off.
// Usage: node tests/e2e/room5_metronome_not_recorded.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
function wavStats(file){const w=fs.readFileSync(file);let off=12;while(w.toString('ascii',off,off+4)!=='data')off+=8+w.readUInt32LE(off+4);const bits=w.readUInt16LE(34),ch=w.readUInt16LE(22),sr=w.readUInt32LE(24),n=w.readUInt32LE(off+4)/(bits/8)/ch;let peak=0;
  for(let i=0;i<n*ch;i++){const v=bits===32?w.readFloatLE(off+8+i*4):w.readInt16LE(off+8+i*2)/32768;const a=Math.abs(v);if(a>peak)peak=a}return{seconds:n/sr,peak}}
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const S=window.__m={speaker:null,clickEdges:0};const oc=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(d){const r=oc.apply(this,arguments);try{if(d instanceof AudioDestinationNode&&d.context instanceof AudioContext&&!(this instanceof AnalyserNode)){if(!S.speaker||S.speaker.context!==d.context){S.speaker=d.context.createAnalyser();S.speaker.fftSize=2048}oc.call(this,S.speaker)}}catch(e){}return r};
    S.peak=()=>{if(!S.speaker)return 0;const a=new Float32Array(S.speaker.fftSize);S.speaker.getFloatTimeDomainData(a);let m=0;for(const v of a)m=Math.max(m,Math.abs(v));return m}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText)).click()});await p.waitForTimeout(1200);
  const header=text=>p.evaluate(t=>{const b=[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim()));if(!b)throw Error('no header button '+t);b.click()},text);
  const metro=on=>p.evaluate(on=>{const b=document.querySelector('[data-psy-metro] button');if((b.getAttribute('aria-pressed')==='true')!==on)b.click()},on);
  await p.fill('input[aria-label="Metronome BPM"]','240');await p.keyboard.press('Tab');
  // the click is audible on the speaker side ...
  await metro(true);await p.waitForTimeout(900);let heard=0;for(let i=0;i<40;i++){heard=Math.max(heard,await p.evaluate(()=>__m.peak()));await p.waitForTimeout(15)}assert(heard>.05,'the metronome click is audible at the destination: '+heard);
  await metro(false);await p.waitForTimeout(500);let quiet=0;for(let i=0;i<20;i++){quiet=Math.max(quiet,await p.evaluate(()=>__m.peak()));await p.waitForTimeout(20)}assert(quiet<.005,'silent after switching the metronome off: '+quiet);
  async function take(label,play){
    await header('^Rec$');await p.waitForTimeout(800);if(play==='metro')await metro(true);else if(play==='note'){const bx=await p.locator('.xpl-pad canvas[role=application]').boundingBox();await p.mouse.move(bx.x+bx.width*.6,bx.y+bx.height*.4);await p.mouse.down()}
    await p.waitForTimeout(2000);if(play==='note')await p.waitForTimeout(2000);if(play==='metro')await metro(false);else if(play==='note')await p.mouse.up();await p.waitForTimeout(600);
    await header('Enough');await p.waitForTimeout(2500);
    await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/LIVE ROOM/.test(b.innerText)).click()});await p.waitForTimeout(1500);
    await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/^\W*WAV$/.test(b.innerText.trim())&&b.offsetParent);b&&b.click()});await p.waitForTimeout(200);
    const[dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Download/.test(b.innerText)&&b.offsetParent).click())]);
    const file=path.join(os.tmpdir(),'xen_r5_'+label+'.wav');await dl.saveAs(file);const st=wavStats(file);
    await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText)).click();window.scrollTo(0,0)});await p.waitForTimeout(1200);return st}
  const t1=await take('metro','metro');console.log('take 1 (metronome only)',t1);assert(t1.seconds>3,'take 1 has the full length');assert(t1.peak<1e-4,'the metronome is NOT in the recording: peak '+t1.peak);
  const t2=await take('note','note');console.log('take 2 (pad note)',t2);assert(t2.seconds>3&&t2.peak>.02,'control: a played note IS recorded: peak '+t2.peak);
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-02 metronome is heard by the player, never recorded',{metroTake:t1.peak,noteTake:+t2.peak.toFixed(3)});await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
