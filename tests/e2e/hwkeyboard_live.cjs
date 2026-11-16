'use strict';
// HWKB-01 (real app, SIMULATED device - no hardware available): a hardware key is the same key event as the computer key at its position.
//  - nothing touches Web MIDI before the player switches it on; off by default
//  - key at the first key = computer key 1; further keys = further positions, equal to the computer keys in 12-EDO, 31-EDO and a TRITAVE tuning (Bohlen-Pierce),
//    beyond the 20 / 32 computer keys too (as many keys as the device has), muted steps skipped like on the computer keyboard
//  - key off / velocity-0 / unplugging release; channel filter; learn the first key; the monitor shows what arrives; the device report is copyable
//  - failure paths (permission denied, no Web MIDI) leave the computer keyboard untouched
// Usage: node tests/e2e/hwkeyboard_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const mock=(mode)=>{window.__midi={calls:0,state:'connected'};
 const input={id:'in1',name:'Test Mini 25',manufacturer:'Acme',state:'connected',onmidimessage:null};const access={inputs:new Map([['in1',input]]),onstatechange:null};
 window.__midi.send=(...b)=>input.onmidimessage&&input.onmidimessage({data:Uint8Array.from(b)});
 window.__midi.unplug=()=>{input.state='disconnected';access.onstatechange&&access.onstatechange({})};window.__midi.plug=()=>{input.state='connected';access.onstatechange&&access.onstatechange({})};
 window.__midi.attached=()=>typeof input.onmidimessage==='function';
 if(mode==='denied')navigator.requestMIDIAccess=()=>{window.__midi.calls++;return Promise.reject(new DOMException('denied','SecurityError'))};
 else if(mode==='platform')navigator.requestMIDIAccess=()=>{window.__midi.calls++;return Promise.reject(new DOMException('Platform dependent initialization failed.','InvalidStateError'))};
 else if(mode==='none')Object.defineProperty(navigator,'requestMIDIAccess',{value:undefined,configurable:true});
 else navigator.requestMIDIAccess=()=>{window.__midi.calls++;return Promise.resolve(access)}};
async function open(b,mode){const p=await (await b.newContext({viewport:{width:1500,height:1000},permissions:['clipboard-read','clipboard-write']})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(mock,mode);
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);return{p,errors}}
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 {const {p,errors}=await open(b,'ok');const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  assert.equal(await p.evaluate(()=>window.__midi.calls),0,'Web MIDI is not touched before the player switches it on');
  // the entry sits in the technical card row next to the Touchpad helper and opens a dialog
  const dock=p.locator('[data-xen-hw-keyboard]').first();await dock.scrollIntoViewIfNeeded();assert(/Off/.test(await dock.innerText()),'the row shows the status: off');
  assert(await dock.evaluate(e=>!!e.closest('.xen-time-echo-with-touchpad')),'the row is in the technical card next to the Touchpad helper');
  const opener=p.getByRole('button',{name:'Set up hardware keyboard…'});await opener.click();await p.waitForTimeout(300);
  const dialog=p.getByRole('dialog',{name:'Hardware keyboard (MIDI)'});assert.equal(await dialog.count(),1,'the button opens the settings dialog');
  const sw=p.getByRole('checkbox',{name:'Use a hardware keyboard'});assert.equal(await sw.isChecked(),false,'off by default');
  await sw.check();await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.__midi.calls),1,'switching on asks for Web MIDI once');
  await p.waitForFunction(()=>window.__midi.attached());
  const held=()=>E('JSON.stringify(__xenHeldKeys.hz())').then(JSON.parse);
  /* the computer keys by position: 20 keys 1..P, then (Keyboard extension, the default here) the third row A..# */
  const POS_KEYS=['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','z','u','i','o','p','a','s','d','f','g','h','j','k','l','Semicolon','Quote','Backslash'];
  const hw=async note=>{await p.evaluate(n=>window.__midi.send(0x90,n,100),note);await p.waitForTimeout(120);const h=await held();await p.evaluate(n=>window.__midi.send(0x80,n,0),note);await p.waitForTimeout(120);return h};
  const computer=async k=>{await p.keyboard.down(POS_KEYS[k]);await p.waitForTimeout(120);const h=await held();await p.keyboard.up(POS_KEYS[k]);await p.waitForTimeout(120);return h};
  const ROOT=48;
  for(const tuning of ['12edo','31edo','bp']){
   await p.evaluate(t=>__xenProbe.bridge.patch({gridTuning:t}),tuning);await p.waitForTimeout(900);
   for(const k of [0,1,2,5,12,19,20,25,31]){
    const h=await hw(ROOT+k),c=await computer(k);assert(h.length===1&&c.length===1,tuning+': hardware key '+k+' and computer key '+POS_KEYS[k]+' each sound one key ('+JSON.stringify([h,c])+')');
    assert(Math.abs(h[0]/c[0]-1)<1e-9,tuning+': hardware key '+k+' = computer key '+POS_KEYS[k]+' ('+h[0]+' vs '+c[0]+')')}
   const low=(await hw(ROOT+0))[0],high=(await hw(ROOT+12))[0];assert(high>low,tuning+': keys rise to the right like the computer keys ('+low.toFixed(2)+' -> '+high.toFixed(2)+')')}
  // the tritave stays a tritave: in Bohlen-Pierce the same step one period apart is 3:1 (not 2:1)
  await p.evaluate(()=>__xenProbe.bridge.patch({gridTuning:'bp',manualGridMutedSteps:[]}));await p.waitForTimeout(900);
  {const per=await E('(p=>AF(p.gridTuning))(__NodalBallGrid.params())'),steps=await E('(p=>uw(p.gridBase,p.gridTuning,[],[]).length)(__NodalBallGrid.params())');
   console.log('bp period',per,'open steps',steps);assert(Math.abs(per-3)<1e-6,'the Bohlen-Pierce period is the tritave 3:1')}
  // above the top of the Grid: no sound, an explanation in the monitor; after moving the window down the same hardware key plays like the computer key at its shifted place
  await p.evaluate(()=>__xenProbe.bridge.patch({gridTuning:'12edo',manualGridMutedSteps:[1,3,6,8,10]}));await p.waitForTimeout(900);
  assert.equal((await hw(ROOT+40)).length,0,'a key above the top of the Grid plays nothing (never another note)');
  assert(/above the top of the Grid/.test(await p.getByLabel('Keyboard monitor').innerText()),'the monitor says why');
  const off0=await E('__NodalBallGrid.windowOffset()');for(let i=0;i<15;i++){await p.keyboard.press('BracketLeft');await p.waitForTimeout(60)}await p.waitForTimeout(300);
  const off1=await E('__NodalBallGrid.windowOffset()');assert.equal(off1-off0,15,'the window moved down by 15 steps ('+off0+' -> '+off1+')');
  const h40=await hw(ROOT+40);assert.equal(h40.length,1,'with the window moved down, key 40 plays');
  for(let i=0;i<15;i++){await p.keyboard.press('Minus');await p.waitForTimeout(60)}await p.waitForTimeout(300);assert.equal(await E('__NodalBallGrid.windowOffset()'),off0,'the window is back');
  {const c=await computer(40-15);assert(c.length===1&&Math.abs(h40[0]/c[0]-1)<1e-9,'hardware key 40 with the window moved by 15 = computer position 25 with the window at rest ('+h40[0]+' vs '+c[0]+')')}
  // muted steps are skipped exactly as on the computer keyboard
  for(const k of [0,1,2,3,7,15,25]){const h=await hw(ROOT+k),c=await computer(k);assert(h.length===1&&Math.abs(h[0]/c[0]-1)<1e-9,'muted steps: hardware key '+k+' = computer position '+k)}
  // release paths
  await p.evaluate(()=>window.__midi.send(0x90,50,100));await p.waitForTimeout(100);assert.equal((await held()).length,1);await p.evaluate(()=>window.__midi.send(0x90,50,0));await p.waitForTimeout(100);assert.equal((await held()).length,0,'Note On with velocity 0 releases');
  await p.evaluate(()=>window.__midi.send(0x90,50,100));await p.waitForTimeout(100);await p.evaluate(()=>window.__midi.unplug());await p.waitForTimeout(150);assert.equal((await held()).length,0,'unplugging releases the held key');await p.evaluate(()=>window.__midi.plug());await p.waitForTimeout(150);
  // below the first position: ignored
  await p.evaluate(()=>window.__midi.send(0x90,47,100));await p.waitForTimeout(120);assert.equal((await held()).length,0,'a key below the first position is not played');await p.evaluate(()=>window.__midi.send(0x80,47,0));
  // channel filter through the real control
  await p.getByLabel('Keyboard channel').selectOption('2');await p.waitForTimeout(200);
  await p.evaluate(()=>window.__midi.send(0x90,48,100));await p.waitForTimeout(120);assert.equal((await held()).length,0,'channel 1 is filtered');await p.evaluate(()=>window.__midi.send(0x91,48,100));await p.waitForTimeout(120);assert.equal((await held()).length,1,'channel 2 plays');await p.evaluate(()=>window.__midi.send(0x81,48,0));await p.getByLabel('Keyboard channel').selectOption('0');
  // learn the first key
  await p.getByRole('button',{name:'Learn first key'}).click();await p.evaluate(()=>window.__midi.send(0x90,60,100));await p.waitForTimeout(150);await p.evaluate(()=>window.__midi.send(0x80,60,0));
  assert.equal(await p.getByLabel('First key').inputValue(),'60','the learn key becomes the first key');assert.equal((await held()).length,0,'the learn key itself is not played');
  const h60=await hw(60),c0=await computer(0);assert(h60.length===1&&Math.abs(h60[0]/c0[0]-1)<1e-9,'the learned key plays position 1');
  // preset
  await p.getByLabel('Keyboard preset').selectOption('c2');await p.waitForTimeout(200);assert.equal(await p.getByLabel('First key').inputValue(),'36','the preset sets the first key');
  // monitor + report
  const mon=await p.getByLabel('Keyboard monitor').innerText();assert(/on C\d/.test(mon)&&/Test Mini 25/.test(mon)&&/below the first key: ignored/.test(mon),'the monitor shows what arrives: '+mon.slice(0,120));
  await p.getByRole('button',{name:'Copy device report'}).click();await p.waitForTimeout(400);
  const clip=await p.evaluate(()=>navigator.clipboard.readText().catch(()=>null));const area=await p.getByLabel('Device report').count()?await p.getByLabel('Device report').inputValue():null;
  const rep=clip||area;assert(rep&&rep.includes('Acme Test Mini 25')&&rep.includes('note on'),'the device report is copyable and names the device: '+String(rep).slice(0,120));
  // switching off detaches the device
  await sw.uncheck();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>window.__midi.attached()),false,'switching off detaches the device');
  await p.keyboard.press('Escape');await p.waitForTimeout(250);assert.equal(await dialog.count(),0,'Escape closes the dialog');assert(await opener.evaluate(e=>e===document.activeElement),'focus returns to the button');
  await opener.click();await p.waitForTimeout(200);await p.getByRole('button',{name:'Close',exact:true}).click();await p.waitForTimeout(200);assert.equal(await dialog.count(),0,'the Close button closes it');
  await p.evaluate(()=>window.__midi.send&&window.__midi.send(0x90,48,100));await p.waitForTimeout(120);assert.equal((await held()).length,0,'no sound when off');
  assert.deepEqual(errors,[]);}
 // ---- failure paths: the computer keyboard keeps working ----
 for(const mode of ['denied','platform','none']){const {p,errors}=await open(b,mode);const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  await p.getByRole('button',{name:'Set up hardware keyboard…'}).scrollIntoViewIfNeeded();await p.getByRole('button',{name:'Set up hardware keyboard…'}).click();await p.waitForTimeout(300);
  const box=p.getByRole('checkbox',{name:'Use a hardware keyboard'});
  if(mode==='none'){assert(await box.isDisabled(),'none: the switch is disabled (nothing can be switched on) instead of silently staying empty')}
  else{await box.check({timeout:3000}).catch(()=>{});await p.waitForTimeout(600);assert.equal(await box.isChecked(),false,mode+': the switch is off again after the failure')}
  const text=await p.getByRole('dialog').innerText(),rowText=await p.locator('[data-xen-hw-keyboard]').first().innerText();
  const want={denied:[/did not give permission/,/Permission denied/],platform:[/system MIDI service could not start.*Platform dependent initialization failed/s,/MIDI could not start/],none:[/Web MIDI is not offered here/,/Not available/]}[mode];
  assert(want[0].test(text),mode+': the dialog explains it: '+text.slice(0,300));assert(want[1].test(rowText),mode+': the row shows it too: '+rowText);
  assert(await p.getByRole('alert').count()>=1,mode+': the reason is an alert, not only a status line');
  if(mode==='platform')assert(!/Permission denied/.test(rowText+text),'platform: a failing system service is not reported as a refused permission');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.keyboard.down('1');await p.waitForTimeout(150);const h=JSON.parse(await E('JSON.stringify(__xenHeldKeys.hz())'));await p.keyboard.up('1');assert.equal(h.length,1,mode+': the computer keyboard still plays');assert.deepEqual(errors,[]);}
 console.log('PASS HWKB-01: simulated keyboard = computer keys in 12-EDO / 31-EDO / tritave (BP), muted steps, beyond 32 keys, release / unplug / channel / learn / preset / monitor / report, failure paths');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
