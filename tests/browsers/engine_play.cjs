'use strict';
// ENGINE-PLAY-01: does playing work in this browser engine (the user plays in Firefox and Opera on Linux)? Probe build.
// Beyond ENGINE-SMOKE-01 (start, rooms): sound comes out, the hold clock takes over held notes (classic, Entrophon, classic with
// overtone arpeggio) without refusals, Psy Lab sounds in the Live Room, a tempo glide lands, a room tour leaves no page error.
// Nothing about sound quality. Each check is reported; exit status is non-zero when one fails.
// Usage: XEN_BROWSER=chromium|firefox node tests/browsers/engine_play.cjs dist/XenSonar_PROBE.html
const path=require('node:path');const pw=require('playwright');
const engine=process.env.XEN_BROWSER||'chromium';
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../dist/XenSonar_PROBE.html'));
const fail=[];const note=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)fail.push(msg)};
(async()=>{
 const type=pw[engine];if(!type)throw Error('unknown XEN_BROWSER '+engine);
 const opts=engine==='chromium'?{args:['--autoplay-policy=no-user-gesture-required']}
  :engine==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.blocking_policy':0,'media.navigator.permission.disabled':true}}:{};
 const browser=await type.launch(opts);
 try{
  const p=await(await browser.newContext({viewport:{width:1440,height:1000}})).newPage();
  const errors=[];p.on('pageerror',e=>errors.push(String(e.message||e).slice(0,200)));
  await p.addInitScript(()=>{window.__lvl={m:0};const C=AudioNode.prototype.connect,taps=new WeakMap();
   AudioNode.prototype.connect=function(d,...r){const res=C.call(this,d,...r);try{if(d instanceof AudioDestinationNode&&!this.__t){const c=d.context;let sp=taps.get(c);if(!sp){sp=c.createScriptProcessor(2048,2,2);const z=c.createGain();z.gain.value=0;sp.__t=z.__t=1;sp.onaudioprocess=e=>{const x=e.inputBuffer.getChannelData(0);for(let i=0;i<x.length;i+=4)__lvl.m=Math.max(__lvl.m,Math.abs(x[i]))};C.call(sp,z);C.call(z,d);taps.set(c,sp)}C.call(this,sp)}}catch{}return res}});
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  const level=async ms=>{await p.evaluate(()=>{__lvl.m=0});await p.waitForTimeout(ms);return p.evaluate(()=>__lvl.m)};
  const patch=x=>p.evaluate(x=>__xenProbe.bridge.patch(x),x);
  await p.goto('file://'+html);await p.getByRole('button',{name:'Power'}).waitFor({timeout:60000});await p.waitForTimeout(2500);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
  // 1. sound
  await patch({drumActive:true});const l0=await level(2500);note(l0>.05,engine+': the Live Room sounds (drums, peak '+l0.toFixed(3)+')');
  await patch({drumActive:false,bassActive:false});await p.waitForTimeout(800);
  // 2. hold clock for held notes
  const base={thunderModeEnabled:true,thunderKeyboardEnabled:true,thunderTiming:'exact',keyboardHoldSegments:16,keyboardHoldCustomSegments:16,keyboardHoldReferenceBars:1,keyboardHoldPatternSteps:Array(16).fill(true),keyboardHoldPitchCents:Array(16).fill(0),keyboardHoldSlotVolumes:[],keyboardHoldMicrotiming:[]};
  const arp={waveOvertonesEnabled:true,waveOvertoneMode:'arp',waveOvertones:{'5/4':.55,'3/2':.72,'4/3':.48},waveOvertoneArpSteps:8,waveOvertoneArpPattern:'updown',waveOvertoneArpRate:64};
  for(const [label,x] of [['classic (FM Bell)',{keyboardHoldSoundPreset:'fm_bell',waveOvertonesEnabled:false}],['Entrophon (Marimba)',{keyboardHoldSoundPreset:'entrophon:factory:marimba-holz@1',waveOvertonesEnabled:false}],['classic with overtone arpeggio',{keyboardHoldSoundPreset:'fm_bell',...arp}]]){
   await patch({...base,...x});await p.waitForTimeout(900);
   await p.keyboard.down('i');await p.waitForTimeout(600);await p.keyboard.up('i');await p.waitForTimeout(700);// warm-up gesture
   const d0=JSON.parse(await E('JSON.stringify(__XenHoldResident.diagnostics().totals)'));
   await p.keyboard.down('i');const lv=await level(2500);await p.keyboard.up('i');await p.waitForTimeout(500);
   const d1=JSON.parse(await E('JSON.stringify(__XenHoldResident.diagnostics().totals)'));
   note(d1.active>d0.active&&d1.rejections===d0.rejections,'hold clock takes over a held '+label+' (taken over '+(d1.active-d0.active)+', refused '+(d1.rejections-d0.rejections)+', peak '+lv.toFixed(3)+')');
  }
  await patch({waveOvertonesEnabled:false,thunderModeEnabled:false});await p.waitForTimeout(600);
  // 3. Psy Lab in the Live Room (Wave Starter default: Psy Lab) by a click on the playfield
  const cv=await p.locator('canvas[data-xen-play-area]').boundingBox();
  await p.mouse.move(cv.x+cv.width*.4,cv.y+cv.height*.5);await p.mouse.down();const lp=await level(1200);await p.mouse.up();
  note(lp>.02,'a click in the playfield sounds (Wave Starter, peak '+lp.toFixed(3)+')');
  // 4. tempo glide 108 -> 140 in 2 bars lands
  const setVal=async(sel,v)=>{await p.evaluate(([sel,v])=>{const el=document.querySelector(sel);const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))},[sel,v])};
  await patch({drumActive:true});await p.waitForTimeout(800);
  await setVal('[data-xen-tempo-ramp-bars]','2');await setVal('[data-xen-tempo-ramp-to]','140');await p.locator('[data-xen-tempo-ramp-go]').click();
  let ran=false;for(let k=0;k<70;k++){await p.waitForTimeout(100);if(await E('!!__XenLiveTempo.snapshot()'))ran=true;else if(ran)break}
  await p.waitForTimeout(600);const bpm=Number(await E('__NodalBallGrid.params().quantizeBpm'));
  note(ran&&bpm===140,'tempo glide ran and landed on 140 BPM ('+bpm+')');
  // 5. a room tour
  const go=n=>p.evaluate(n=>[...document.querySelectorAll('header button')].find(x=>x.innerText.replace(/\s+/g,' ').includes(n)&&x.offsetParent).click(),n);
  for(const r of ['MATERIAL FORGE','LIVE ROOM','NODAL CENTER','PSY LAB','MULTITRACK','LIVE ROOM']){await go(r);await p.waitForTimeout(1300)}
  note(errors.length===0,'no uncaught page errors'+(errors.length?': '+[...new Set(errors)].slice(0,3).join(' | '):''));
 }finally{await browser.close()}
 console.log(fail.length?'ENGINE-PLAY-01 '+engine+': '+fail.length+' check(s) failed':'PASS ENGINE-PLAY-01 '+engine);
 process.exit(fail.length?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
