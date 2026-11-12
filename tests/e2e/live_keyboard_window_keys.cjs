'use strict';
// KBD-WINDOW (real app): the Keyboard Window can be moved down AND back up with its two keys on every keyboard layout. On layouts whose physical Minus key types "-"
// (US / EN) the particle-system hotkey used to swallow the "up" key, so a window pushed to the bottom stayed there. Usage: node tests/e2e/live_keyboard_window_keys.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__ctxs=[];const A=window.AudioContext;window.AudioContext=class extends A{constructor(...a){super(...a);window.__ctxs.push(this)}}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);const win=()=>E('__NodalBallGrid.windowOffset()'),sys=()=>E('__NodalBallGrid.params().particleSystem');
  const press=async(code,key,shift=false)=>{await p.evaluate(([c,k,s])=>{const o={code:c,key:k,shiftKey:s,bubbles:true,cancelable:true};window.dispatchEvent(new KeyboardEvent('keydown',o));window.dispatchEvent(new KeyboardEvent('keyup',o))},[code,key,shift]);await p.waitForTimeout(70)};
  await p.evaluate(()=>document.activeElement?.blur());
  for(const layout of[{name:'US / EN keyboard',down:['BracketLeft','['],up:['Minus','-']},{name:'German keyboard',down:['BracketLeft','ü'],up:['Minus','ß']}]){
   for(let i=0;i<40;i++)await press(...layout.down);const bottom=await win();assert(bottom>=10,layout.name+': the window went down: '+bottom);
   const sysBefore=await sys();
   for(let i=0;i<3;i++)await press(...layout.up);const moved=await win();assert.equal(moved,bottom-3,layout.name+': the "up" key moves the window back: '+bottom+' → '+moved);
   assert.equal(await sys(),sysBefore,layout.name+': moving the window does not cycle the particle systems');
   for(let i=0;i<40;i++)await press(...layout.up);assert.equal(await win(),0,layout.name+': all the way back to the top');
  }
  // a browser that reports no physical key code (empty / "Unidentified"; reported for Opera) is matched by the typed character of the same keys
  for(const code of['','Unidentified']){
   for(let i=0;i<40;i++)await press(code,'Ü');const bottom=await win();assert(bottom>=10,'no code ('+(code||'empty')+'): Ü moves the window down: '+bottom);
   await press(code,'ß');assert.equal(await win(),bottom-1,'no code: ß moves it back');await press(code,'?',true);assert.equal(await win(),bottom-2,'no code: ? (Shift+ß) moves it back');
   for(let i=0;i<40;i++)await press(code,'ß');assert.equal(await win(),0);
  }
  // buttons beside the keys (Hotkeys panel): the window can always be moved without any key
  const panel=p.locator('[data-xen-keyboard-window]');await panel.scrollIntoViewIfNeeded();assert.match(await panel.innerText(),/Keyboard window · row 1 of \d+/);
  await panel.getByRole('button',{name:'Keyboard window down'}).click();await panel.getByRole('button',{name:'Keyboard window down'}).click();await p.waitForTimeout(500);
  assert.equal(await win(),2,'the ▼ button moves the window down');assert.match(await panel.innerText(),/row 3 of/);
  await panel.getByRole('button',{name:'Keyboard window up'}).click();await p.waitForTimeout(300);assert.equal(await win(),1,'the ▲ button moves it back');
  await panel.getByRole('button',{name:'Keyboard window to the start'}).click();await p.waitForTimeout(300);assert.equal(await win(),0,'⟲ start returns to the lowest Grid step');
  // the character hotkeys keep working where they are not the window key: Shift+Minus ("_") and the German "-" key (physical Slash)
  const s0=await sys();await press('Minus','_',true);const s1=await sys();assert.notEqual(s1,s0,'Shift+Minus ("_") still cycles the particle systems');
  await press('Slash','-');const s2=await sys();assert.notEqual(s2,s1,'the German "-" key (physical Slash) still cycles the particle systems');
  // KBD-WINDOW-03: moving the window is state, not sound. A suspended AudioContext whose resume() never settles (reported browsers pause audio for background / sleeping tabs) used to swallow the window keys completely.
  assert.equal(await win(),0);
  await p.evaluate(async()=>{for(const c of window.__ctxs){await c.suspend();c.resume=()=>new Promise(()=>{})}});
  for(let i=0;i<4;i++)await press('BracketLeft','ü');assert.equal(await win(),4,'suspended audio: the window still moves down');
  for(let i=0;i<3;i++)await press('Minus','ß');assert.equal(await win(),1,'suspended audio: the window still moves back up');
  assert.deepEqual(errors,[]);console.log('PASS KBD-WINDOW the keyboard window moves down and back up on US/EN and German keyboards');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
