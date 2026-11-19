'use strict';
// PSY-EXPR-REL-01 (real app, Live Room, Keyboard plays Psy Lab): expressive playing leaves nothing behind.
//  1. a chord of six keys held together with Backspace (octave), left Alt (damp) and B (swell), released in a shuffled order:
//     afterwards no Psy Lab key voice is left, every hold (octave/sustain/swell/damp) is off, and the engine falls silent
//  2. the same chord while the window loses the focus (blur) before any key is released: everything is released at once, and the
//     key releases that arrive later do no harm
//  3. 60 random overlapping presses/releases (several keys at a time, holds in between): at the end nothing hangs
// Usage: node tests/e2e/psylab_expressive_release.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(x=>__xenProbe.bridge.patch(x),{keyboardHoldSoundPreset:'psylab:factory:Barber Spiral',thunderModeEnabled:false,drumActive:false,bassActive:false});await p.waitForTimeout(1500);
 const cv=await p.locator('canvas[data-xen-play-area]').boundingBox();await p.mouse.move(cv.x+cv.width*.5,cv.y+cv.height*.5);
 const state=async()=>JSON.parse(await p.evaluate(()=>__xenProbe.draw.evalInBundle("(()=>{const h=__XenPsyLab.host(false);return JSON.stringify({keys:h?h.keys('keyboard'):[],active:h?h.status().active:0,loaded:!!h,holds:globalThis.__XenLiveHolds.snapshot()})})()")));
 const clean=async label=>{await p.waitForTimeout(700);const s=await state();
  assert.deepEqual(s.keys,[],label+': no Psy Lab key voice left ('+s.keys.join(',')+')');
  assert.deepEqual(s.holds,{octave:false,sustain:false,swell:false,damp:false},label+': every hold is off');
  assert.equal(s.active,0,label+': Psy Lab is silent (active '+s.active+')');return s};
 const notes=['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY'],holds=['Backspace','AltLeft','KeyB'];
 const shuffle=(a,seed)=>{a=[...a];let x=seed;for(let i=a.length-1;i>0;i--){x=(x*1103515245+12345)&0x7fffffff;const j=x%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
 // 1. chord + holds, shuffled release
 for(const k of [...notes.slice(0,3),...holds,...notes.slice(3)]){await p.keyboard.down(k);await p.waitForTimeout(40)}
 await p.waitForTimeout(500);const during=await state();
 assert.ok(during.loaded&&during.keys.length>=4,'the chord sounds on several Psy Lab key voices: '+during.keys.length);
 assert.equal(during.holds.octave,true,'Backspace holds the octave');assert.equal(during.holds.damp,true,'left Alt holds the damp');assert.equal(during.holds.swell,true,'B holds the swell');
 for(const k of shuffle([...notes,...holds],7)){await p.keyboard.up(k);await p.waitForTimeout(30)}
 await clean('shuffled release');
 // 2. chord + holds, the window loses the focus before any release
 for(const k of [...notes,...holds])await p.keyboard.down(k);await p.waitForTimeout(400);
 await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await clean('focus lost while held');
 for(const k of [...notes,...holds])await p.keyboard.up(k);// the late releases arrive afterwards
 await clean('late releases after the focus loss');
 // 3. random overlapping play
 let x=12345;const rnd=n=>{x=(x*1103515245+12345)&0x7fffffff;return x%n};const down=new Set();const pool=[...notes,'KeyU','KeyI','Backspace','KeyB'];
 for(let i=0;i<60;i++){const k=pool[rnd(pool.length)];if(down.has(k)){await p.keyboard.up(k);down.delete(k)}else{await p.keyboard.down(k);down.add(k)}await p.waitForTimeout(15+rnd(60))}
 for(const k of down)await p.keyboard.up(k);
 await clean('60 random overlapping presses');
 assert.deepEqual(errors,[]);console.log('PASS PSY-EXPR-REL-01: chord with octave/damp/swell holds, focus loss and 60 random overlapping presses leave no Psy Lab voice and no hold behind ('+during.keys.length+' voices in the chord)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
