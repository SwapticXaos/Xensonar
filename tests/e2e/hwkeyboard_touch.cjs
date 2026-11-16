'use strict';
// HWKB-02 (real app, SIMULATED devices - no hardware available): touch, layouts and controls of the hardware keyboard layer.
//  - how hard a key is played reaches the voice: the level factor of the first note AND of every Hold pulse of that key follows the velocity curve; computer keys stay at 1
//  - curve, softest / loudest level and "use what I played" (range of this keyboard) are set in the dialog and act at once
//  - "several channels in a row" (Lumatone-like): a key on the next channel continues the row; it plays the same Grid line as the computer key at that position, also in a tritave tuning
//  - controls press existing XenSonar keys: sustain pedal → Sustain key; a learned pad → Keyboard window down (the window really moves); removing an assignment
//  - several messages in one packet and running status play; pitch bend never changes anything
// Usage: node tests/e2e/hwkeyboard_touch.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const mock=()=>{window.__midi={};const mk=(id,name,man)=>({id,name,manufacturer:man,state:'connected',onmidimessage:null});
 const a=mk('in1','Test 61','Acme'),b=mk('in2','Hex 280','Luma');const access={inputs:new Map([['in1',a],['in2',b]]),onstatechange:null};
 window.__midi.send=(...x)=>a.onmidimessage&&a.onmidimessage({data:Uint8Array.from(x)});window.__midi.send2=(...x)=>b.onmidimessage&&b.onmidimessage({data:Uint8Array.from(x)});
 window.__midi.attached=()=>typeof a.onmidimessage==='function';navigator.requestMIDIAccess=()=>Promise.resolve(access)};
const near=(a,b,t,m)=>assert(Math.abs(a-b)<=t,m+': '+a+' vs '+b);
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(mock);
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await p.locator('[data-xen-hw-keyboard]').first().scrollIntoViewIfNeeded();await p.getByRole('button',{name:'Set up hardware keyboard…'}).click();
 await p.getByRole('checkbox',{name:'Use a hardware keyboard'}).check();await p.waitForFunction(()=>window.__midi.attached());
 // every voice that starts tells its level factor (touchGain, as the voice starter receives it) and the volume it computes from it
 await E(`(()=>{window.__v=[];const o=pL;pL=function(e){const r=o(e);window.__v.push({g:e.options?.touchGain??1,vol:r.volume});return r}})()`);
 const voices=async act=>{await p.evaluate(()=>{window.__v.length=0});await act();await p.waitForTimeout(250);return p.evaluate(()=>window.__v.slice())};
 const hw=(note,vel,hold=900,ch=0)=>voices(async()=>{await p.evaluate(([n,v,c])=>window.__midi.send(0x90+c,n,v),[note,vel,ch]);await p.waitForTimeout(hold);await p.evaluate(([n,c])=>window.__midi.send(0x80+c,n,0),[note,ch])});
 const held=()=>E('JSON.stringify(__xenHeldKeys.hz())').then(JSON.parse);
 // ---- touch reaches the voice ----
 const hard=await hw(55,127),soft=await hw(55,1),mid=await hw(55,64);
 assert(hard.length>=1&&soft.length>=1,'a held key starts voices ('+hard.length+' / '+soft.length+')');
 const base=hard[0].g;assert(base>0,'level factor of the hardest touch: '+base);
 for(const v of hard)near(v.g,base,1e-9,'every voice of the hard key (first note and Hold pulses) has the same touch');
 for(const v of soft)near(v.g/base,.15,1e-6,'softest touch = 15 % (first note and every Hold pulse)');
 near(mid[0].g/base,.15+.85*(63/126),1e-6,'linear curve in the middle');
 near(soft[0].vol/hard[0].vol,.15,.02,'… and the voice volume follows');
 const comp=await voices(async()=>{await p.keyboard.down('q');await p.waitForTimeout(500);await p.keyboard.up('q')});
 assert(comp.length>=1,'computer key plays');for(const v of comp)near(v.g,base,1e-9,'a computer key is not touched by the velocity settings');
 // ---- the dialog steers it ----
 await p.getByLabel('Velocity curve').selectOption('hard');near((await hw(55,64))[0].g/base,.15+.85*Math.pow(63/126,2),1e-6,'hard curve');
 await p.getByLabel('Velocity curve').selectOption('soft');near((await hw(55,64))[0].g/base,.15+.85*Math.sqrt(63/126),1e-6,'soft curve');
 await p.getByLabel('Velocity curve').selectOption('fixed');near((await hw(55,3))[0].g/base,1,1e-9,'fixed: a keyboard without velocity plays at full level');
 await p.getByLabel('Velocity curve').selectOption('linear');await p.getByLabel('Softest level').fill('0.5');near((await hw(55,1))[0].g/base,.5,1e-6,'softest level 50 %');
 await p.getByLabel('Loudest level').fill('0.6');near((await hw(55,127))[0].g/base,.6,1e-6,'loudest level 60 %');await p.getByLabel('Loudest level').fill('1');await p.getByLabel('Softest level').fill('0.15');
 // a keyboard that only sends 30..100: "use what I played"
 await E('__XenHwKeyboard._reset()');await hw(55,30,150);await hw(55,100,150);await p.waitForTimeout(200);
 const cal=p.locator('[data-xen-hw-calibrate]');assert(/30–100/.test(await cal.innerText()),'the played range is shown: '+await cal.innerText());await cal.click();
 assert.equal(await p.getByLabel('Softest velocity').inputValue(),'30');assert.equal(await p.getByLabel('Hardest velocity').inputValue(),'100');
 near((await hw(55,100))[0].g/base,1,1e-6,'its hardest touch is full level now');near((await hw(55,30))[0].g/base,.15,1e-6,'its softest touch is the softest level');
 // ---- packed messages and running status play; pitch bend changes nothing ----
 await p.evaluate(()=>window.__midi.send(0x90,50,100,52,100));await p.waitForTimeout(150);const two=await held();assert.equal(two.length,2,'two notes in one packet with running status sound together');
 await p.evaluate(()=>{for(let i=0;i<40;i++)window.__midi.send(0xE0,i*3,i*3)});await p.waitForTimeout(150);assert.deepEqual(await held(),two,'pitch bend does not move a note: the Grid decides the pitch');
 await p.evaluate(()=>window.__midi.send(0x80,50,0,52,0));await p.waitForTimeout(150);assert.equal((await held()).length,0);
 // ---- several channels in a row (Lumatone-like) ----
 const POS_KEYS=['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','z','u','i','o','p','a','s','d','f','g','h','j','k','l','Semicolon','Quote','Backslash'];
 const computer=async k=>{await p.evaluate(()=>document.activeElement?.blur?.());await p.keyboard.down(POS_KEYS[k]);await p.waitForTimeout(120);const h=await held();await p.keyboard.up(POS_KEYS[k]);await p.waitForTimeout(120);return h};
 const tone=async(ch,note)=>{await p.evaluate(([c,n])=>window.__midi.send(0x90+c-1,n,100),[ch,note]);await p.waitForTimeout(120);const h=await held();await p.evaluate(([c,n])=>window.__midi.send(0x80+c-1,n,0),[ch,note]);await p.waitForTimeout(120);return h};
 await p.getByLabel('Hardware key layout').selectOption('blocks');await p.waitForSelector('[data-xen-hw-blocks]');
 await p.getByLabel('Keys per channel').fill('12');await p.getByLabel('First channel').fill('1');await p.getByLabel('First key of a channel').fill('0');
 for(const tuning of ['12edo','bp']){await p.evaluate(t=>__xenProbe.bridge.patch({gridTuning:t,manualGridMutedSteps:[]}),tuning);await p.waitForTimeout(900);
  for(const [ch,note,pos] of [[1,0,0],[1,11,11],[2,0,12],[2,3,15],[3,7,31]]){const h=await tone(ch,note),c=await computer(pos);assert(h.length===1&&c.length===1&&Math.abs(h[0]/c[0]-1)<1e-9,tuning+': channel '+ch+' key '+note+' = position '+pos+' ('+JSON.stringify([h,c])+')')}}
 assert.equal((await tone(1,5)).length,1);await p.getByLabel('First channel').fill('2');assert.equal((await tone(1,5)).length,0,'a channel below the first channel plays nothing (never another note)');
 // learn the first key in this layout: key number and channel
 await p.getByRole('button',{name:'Learn first key'}).click();await p.evaluate(()=>window.__midi.send(0x93,20,90));await p.waitForTimeout(300);
 assert.equal(await p.getByLabel('First channel').inputValue(),'4');assert.equal(await p.getByLabel('First key of a channel').inputValue(),'20');
 {const h=await tone(4,21),c=await computer(1);assert(Math.abs(h[0]/c[0]-1)<1e-9,'after learning, the next key is position 2')}
 await p.getByLabel('Hardware key layout').selectOption('linear');await p.evaluate(()=>__xenProbe.bridge.patch({gridTuning:'12edo'}));await p.waitForTimeout(600);
 // ---- controls press XenSonar keys ----
 await p.evaluate(()=>{window.__keys=[];window.addEventListener('keydown',e=>window.__keys.push('down:'+e.code),true);window.addEventListener('keyup',e=>window.__keys.push('up:'+e.code),true)});
 await p.evaluate(()=>{window.__midi.send(0xB0,64,127);window.__midi.send(0xB0,64,90);window.__midi.send(0xB0,64,0)});await p.waitForTimeout(150);
 assert.deepEqual(await p.evaluate(()=>window.__keys.filter(k=>/Equal/.test(k))),['down:Equal','up:Equal'],'the sustain pedal holds the Sustain key once');
 assert(/controller CC64 → Sustain/.test(await p.locator('[data-xen-hw-controls]').innerText()),'the pedal is listed as a control');
 // learn a pad (key on channel 10) and let it move the Keyboard window down
 await p.locator('[data-xen-hw-learn-control]').click();await p.evaluate(()=>window.__midi.send(0x99,36,110));await p.waitForTimeout(300);
 assert(/Learned: key \/ pad C2 \(36\) on channel 10/.test(await p.locator('[data-xen-hw-learn-control]').innerText()),'the moved control is named');
 assert.equal((await held()).length,0,'the learned pad is not played');await p.evaluate(()=>window.__midi.send(0x89,36,0));
 await p.getByLabel('Control action').selectOption('winDown');await p.locator('[data-xen-hw-add-control]').click();await p.waitForTimeout(300);
 const off0=await E('__NodalBallGrid.windowOffset()');await p.evaluate(()=>{window.__midi.send(0x99,36,110);window.__midi.send(0x89,36,0)});await p.waitForTimeout(400);
 assert.equal(await E('__NodalBallGrid.windowOffset()')-off0,1,'the pad moves the Keyboard window down by one step, through the owner of the Ü key');assert.equal((await held()).length,0,'… and plays no note');
 // any other computer key: learn a program button, press "m"
 await p.locator('[data-xen-hw-learn-control]').click();await p.evaluate(()=>window.__midi.send(0xC0,7));await p.waitForTimeout(300);
 await p.getByLabel('Control action').selectOption('other');await p.locator('[data-xen-hw-add-control]').click();await p.keyboard.press('m');await p.waitForTimeout(300);
 assert(/program button 7 on channel 1 → key M/.test(await p.locator('[data-xen-hw-controls]').innerText()),'the program button is bound to the pressed key');
 await p.evaluate(()=>{window.__keys.length=0;window.__midi.send(0xC0,7)});await p.waitForTimeout(150);assert.deepEqual(await p.evaluate(()=>window.__keys.filter(k=>/KeyM/.test(k))),['down:KeyM','up:KeyM'],'the program button taps that key');
 // remove an assignment; settings survive a reload
 const n=await p.locator('[data-xen-hw-assign]').count();await p.getByRole('button',{name:/^Remove program button 7/}).click();await p.waitForTimeout(200);assert.equal(await p.locator('[data-xen-hw-assign]').count(),n-1);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.hwkeyboard.v1')));assert.deepEqual([saved.vel.min,saved.vel.max,saved.assigns.length],[30,100,2],'settings are kept in the layer\'s own browser key');
 // ---- one profile per device ----
 await p.getByLabel('Keyboard device').selectOption('in2');await p.waitForTimeout(200);await p.getByLabel('Hardware key layout').selectOption('blocks');await p.getByLabel('Keys per channel').fill('56');
 await p.getByLabel('Keyboard device').selectOption('in1');await p.waitForTimeout(200);assert.equal(await p.getByLabel('Hardware key layout').inputValue(),'linear','the first keyboard keeps its own layout');
 await p.getByLabel('Keyboard device').selectOption('in2');await p.waitForTimeout(200);assert.equal(await p.getByLabel('Keys per channel').inputValue(),'56','the second keyboard has its own');
 await p.evaluate(()=>window.__midi.send2(0x93,21,100));await p.waitForTimeout(150);assert.equal((await held()).length,1,'the chosen device plays');await p.evaluate(()=>window.__midi.send2(0x83,21,0));
 const rep=await E('__XenHwKeyboard.report()');assert(/stage 2/.test(rep)&&/layout blocks \(56 keys per channel/.test(rep)&&/Velocity: curve linear/.test(rep),'the device report carries layout and velocity:\n'+rep);
 await p.screenshot({path:process.env.XEN_SHOT||'/dev/null'}).catch(()=>{});
 assert.deepEqual(errors,[]);console.log('PASS HWKB-02: touch reaches first note and Hold pulses ('+hard.length+' voices), curves / levels / played range, channel blocks = Grid positions (12-EDO, tritave), pedal / pad / program button press XenSonar keys, packed messages, profiles per device');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
