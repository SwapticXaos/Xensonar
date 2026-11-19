'use strict';
// KEY-HANG-01 (real app): hanging-key analysis as a test. For every key that holds something (notes, Backspace octave, Alt damp, B swell, ' / = sustain) in the
// Live Room (Psy Lab keyboard sound) and every note key of the Psy Lab room:
//  (1) a key whose keyup never arrives is a known loss (only the OS/browser can cause it) -> the hold is visible;
//  (2) every one-step recovery clears it again: the same key pressed again, window blur, hidden tab, Escape (Live Room and Psy Lab);
//  (3) a seeded random walk of REAL key presses with focus changes, clicks, blur and room switches leaves nothing sounding and no flag set after all keys are up.
// Measurement: Psy Lab worklet note-on/off ledger + __XenLiveHolds. Usage: node tests/e2e/key_hang_matrix.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
async function open(where){
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const S=window.__pg={msgs:[]};let engines=0;const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){const eng=++engines;const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&(m.t==='on'||m.t==='off'||m.t==='alloff'))S.msgs.push({eng,t:m.t,id:m.id});return pm(m,t)}}}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const room=n=>p.evaluate(n=>{const b=[...document.querySelectorAll('header button')].find(x=>new RegExp(n).test(x.innerText));b&&b.click()},n);
 if(where==='live'){
  await p.getByRole('button',{name:'Wave Starter sound'}).first().click();await p.waitForTimeout(300);
  await p.getByLabel('Wave Starter sound search').fill('Barber');await p.waitForTimeout(250);await p.getByRole('option',{name:'Barber Spiral'}).first().click();await p.waitForTimeout(800);
  const sound=JSON.parse(await E('JSON.stringify(__NodalBallGrid.params().waveStarterHoldSoundPreset)'));
  await p.evaluate(s=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:s}),sound);await p.waitForTimeout(1200);
 }else{await room('PSY LAB');await p.waitForTimeout(3000)}
 const ledger=async()=>{const m=await p.evaluate(()=>window.__pg.msgs.slice());const on=new Map();for(const x of m){if(x.t==='on')on.set(x.eng+':'+x.id,1);else if(x.t==='off')on.delete(x.eng+':'+x.id);else if(x.t==='alloff'){for(const k of [...on.keys()])if(k.startsWith(x.eng+':'))on.delete(k)}}return [...on.keys()]};
 const flags=async()=>{const h=JSON.parse(await E('JSON.stringify(typeof __XenLiveHolds!=="undefined"?__XenLiveHolds.snapshot():{})'));return Object.entries(h).filter(([,v])=>v===true).map(x=>x[0])};
 const state=async()=>{await p.waitForTimeout(1000);return{v:(await ledger()).length,f:await flags()}};
 const synth=(type,[code,key])=>p.evaluate(([type,code,key])=>{const m={AltLeft:'altKey'}[code];document.body.dispatchEvent(new KeyboardEvent(type,{code,key,bubbles:true,cancelable:true,...(m&&type==='keydown'?{[m]:true}:{})}))},[type,code,key]);
 return{b,p,E,room,state,synth,errors,ledger,flags};
}
(async()=>{
 const matrix={live:{KeyL:['KeyL','l'],Digit1:['Digit1','1'],Quote:['Quote',"'"],Equal:['Equal','='],Backspace:['Backspace','Backspace'],AltLeft:['AltLeft','Alt'],KeyB:['KeyB','b']},
  psy:{KeyL:['KeyL','l'],Digit1:['Digit1','1'],Quote:['Quote',"'"],KeyA:['KeyA','a']}};
 for(const where of ['live','psy']){
  const t=await open(where);const {p,state,synth}=t;
  const acts={Escape:()=>p.keyboard.press('Escape'),blur:()=>p.evaluate(()=>window.dispatchEvent(new Event('blur'))),hidden:()=>p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,get:()=>false})}),pressAgain:null};
  for(const [name,k] of Object.entries(matrix[where]))for(const [an,fn] of Object.entries(acts)){
   await p.evaluate(()=>document.activeElement?.blur?.());
   await synth('keydown',k);const lost=await state();
   assert(lost.v>0||lost.f.length>0,where+' '+name+': a key without keyup is visible as a hold ('+JSON.stringify(lost)+')');
   if(an==='pressAgain'){await synth('keydown',k);await synth('keyup',k)}else await fn();
   const after=await state();
   assert.deepEqual(after,{v:0,f:[]},where+' '+name+' + '+an+': recovered, got '+JSON.stringify(after));
  }
  console.log('matrix ok',where,Object.keys(matrix[where]).join(' '),'x',Object.keys(acts).join(','));
  // seeded random walk with real key presses (all keys that mean something)
  const KEYS=['l','k','j','a','s','d','q','w','1','2','3','Shift','Alt','Control','Backspace','Space','Enter','ArrowUp','ArrowDown','BracketLeft','Minus','Equal','Quote','b','Escape','Slash'];
  for(const seed of [11,12]){const R=rng(seed),down=new Set();
   await p.evaluate(()=>{window.__pg.msgs.length=0;document.activeElement?.blur?.()});
   for(let i=0;i<70;i++){const r=R(),k=KEYS[Math.floor(R()*KEYS.length)];
    try{
     if(r<.4){if(!down.has(k)){await p.keyboard.down(k);down.add(k)}}
     else if(r<.72){const ks=[...down];if(ks.length){const kk=ks[Math.floor(R()*ks.length)];await p.keyboard.up(kk);down.delete(kk)}}
     else if(r<.80)await p.evaluate(()=>{const i=[...document.querySelectorAll('input,textarea,select,button')].filter(x=>x.offsetParent);const x=i[Math.floor(Math.random()*i.length)];x&&x.focus()});
     else if(r<.86)await p.mouse.click(300+R()*800,300+R()*500);
     else if(r<.90)await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
     else if(r<.94&&where==='live'){await t.room(['MATERIAL FORGE','NODAL CENTER','LIVE ROOM'][Math.floor(R()*3)]);await p.waitForTimeout(400)}
     else await p.waitForTimeout(40);
    }catch{}}
   for(const kk of [...down])await p.keyboard.up(kk);
   if(where==='live'){await t.room('LIVE ROOM');await p.waitForTimeout(1200)}
   const end=await state();assert.deepEqual(end,{v:0,f:[]},where+' random walk seed '+seed+': nothing may hang after every key is up, got '+JSON.stringify(end));
   await p.keyboard.press('Escape');await p.waitForTimeout(200);
  }
  console.log('random walks ok',where);
  assert.deepEqual(t.errors,[]);await t.b.close();
 }
 console.log('PASS KEY-HANG-01 every held key is recoverable (press again, blur, hidden tab, Escape) and random key walks leave nothing hanging');
})().catch(e=>{console.error(e);process.exit(1)});
