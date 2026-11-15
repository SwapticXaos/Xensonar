'use strict';
// LOOPREC-BARS-01 (real app): the bars of a Loop-Rec take are visible and its edges can be dragged.
//  - while recording, the Loop-Rec ("Enough!") button counts the bars of the take
//  - right-click on the take tile opens the Loop Editor with a bar map: waveform of the take, bar lines, two handles (beginning / end)
//  - dragging a handle snaps to bar lines: inwards trims a bar, outwards adds a silent bar; the same edit as the − / + buttons (Session intent, LOOP LENGTH)
//  - arrow keys on a handle move it by one bar; an impossible position (no bar of the take left) is not taken
// Usage: node tests/e2e/looprec_bars.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const phase=()=>E('__XenLoopRec.snapshot().phase');
 const takes=()=>E('JSON.stringify(bs().entries.filter(e=>e.sessionTake).map(e=>({id:e.id,bars:e.bars,name:e.name})))').then(JSON.parse);
 // ---- record about three bars while playing a note ----
 const before=await takes();const btn=p.locator('[data-xen-loop-rec]');const press=()=>btn.evaluate(e=>e.click());/* the Loop-Rec shape (SVG silhouette) lies over the button; a click on the button element runs its own handler */await press();
 for(let i=0;i<80&&await phase()!=='recording';i++)await p.waitForTimeout(100);assert.equal(await phase(),'recording');
 const barSec=240/Number(await E('__NodalBallGrid.params().quantizeBpm||108'));
 await p.keyboard.down('q');await p.waitForTimeout(300);const t1=await p.locator('[data-xen-loop-rec-bar]').innerText();
 await p.waitForTimeout(barSec*1000*1.6);const t2=await p.locator('[data-xen-loop-rec-bar]').innerText();
 assert(/· bar 1$/.test(t1),'the button counts the bars while recording: '+t1);assert(/· bar [23]$/.test(t2),'… and goes on: '+t2);
 assert(/Enough!/.test(await btn.innerText()),'the button still says Enough!');
 await p.waitForTimeout(barSec*1000*.9);await p.keyboard.up('q');await press();
 for(let i=0;i<150;i++){if((await takes()).length>before.length)break;await p.waitForTimeout(100)}
 const take=(await takes()).find(x=>!before.some(y=>y.id===x.id));assert(take&&take.bars>=2,'a take of at least two bars: '+JSON.stringify(take));
 assert.equal(await p.locator('[data-xen-loop-rec-bar]').count(),0,'no bar counter when not recording');
 // ---- open the Loop Editor on the tile ----
 const tile=p.locator('[data-xen-shortcut-id="'+take.id+'"]').first();await tile.scrollIntoViewIfNeeded();await tile.click({button:'right'});
 const dlg=p.getByRole('dialog',{name:'Material Loop Editor'});await dlg.waitFor();const map=dlg.locator('[data-xen-loop-bar-map]');await map.waitFor();
 await p.waitForFunction(()=>{const c=document.querySelector('[data-xen-loop-bar-map] canvas');if(!c)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let lit=0;for(let i=0;i<d.length;i+=16)if(d[i+1]>200&&d[i+2]>180)lit++;return lit>20},null,{timeout:15000});
 const total=async()=>Number((await dlg.locator('.xen-rack-bar-total strong').innerText()).replace(/\D/g,''));
 assert.equal(await total(),take.bars,'LOOP LENGTH = bars of the take');
 assert(new RegExp('Take: '+take.bars+' bars · loop: '+take.bars+' bars').test(await map.innerText()),'the legend names take and loop length: '+await map.innerText());
 const intent=()=>E(`JSON.stringify(__XenRackLiveBarEdits.intentFor(${JSON.stringify(take.id)})??null)`).then(JSON.parse);
 const box=await map.boundingBox();const pxPerBar=async()=>{const h=await dlg.locator('.xen-loop-bar-handle').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().left));return (h[1]-h[0])/(await total())};
 const dragHandle=async(edge,bars)=>{const h=dlg.locator('.xen-loop-bar-handle[data-edge="'+edge+'"]');const r=await h.boundingBox(),ppb=await pxPerBar();const x=r.x+r.width/2,y=r.y+r.height/2;
  await p.mouse.move(x,y);await p.mouse.down();for(let k=1;k<=10;k++)await p.mouse.move(x+bars*ppb*k/10,y);await p.mouse.up();await p.waitForTimeout(400)};
 // beginning inwards by one bar = trim one bar
 await dragHandle('front',1);assert.deepEqual(await intent(),{id:take.id,front:-1,back:0},'dragging the beginning one bar inwards trims a bar');assert.equal(await total(),take.bars-1);
 assert.equal(await dlg.locator('.xen-rack-bar-edges .xen-rack-bar-ctrl span').first().innerText(),'-1','the − / + display shows the same edit');
 // end outwards by two bars = two silent bars
 await dragHandle('back',2);assert.deepEqual(await intent(),{id:take.id,front:-1,back:2},'dragging the end two bars outwards adds two silent bars');assert.equal(await total(),take.bars+1);
 // arrow keys move a handle by one bar
 await dlg.locator('.xen-loop-bar-handle[data-edge="back"]').focus();await p.keyboard.press('ArrowLeft');await p.waitForTimeout(300);assert.deepEqual(await intent(),{id:take.id,front:-1,back:1},'arrow left on the end handle: one bar less');
 // an impossible position is not taken: the end cannot pass the beginning
 await dragHandle('back',-(take.bars+4));const i2=await intent();assert(take.bars+i2.front+i2.back>=1&&Math.max(0,-i2.front)+Math.max(0,-i2.back)<take.bars,'at least one bar of the take stays: '+JSON.stringify(i2));
 // the − / + buttons and the handles are one edit
 await dlg.getByRole('button',{name:/Restore one trimmed original bar at beginning/}).click();await p.waitForTimeout(300);assert.equal((await intent())?.front??0,0,'+ at the beginning undoes the trim');
 const lh=await dlg.locator('.xen-loop-bar-handle').first().getAttribute('aria-valuetext');assert.equal(lh,'unchanged','the handle follows the buttons');
 await p.screenshot({path:process.env.XEN_SHOT||'/dev/null',clip:await dlg.boundingBox()}).catch(()=>{});
 assert.deepEqual(errors,[]);console.log('PASS LOOPREC-BARS-01 bar counter while recording ('+t1.trim()+' → '+t2.trim()+'), bar map of a '+take.bars+'-bar take, handles snap to bars (trim / add silence), arrow keys, limits, one edit with − / +');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
