'use strict';
/* Automatic tour for coverage (analysis only): in every room, operate every visible button, checkbox, select and slider once,
 * two passes (the second pass reaches what the first one opened), plus keys and pointer gestures in the Live Room.
 *   XEN_COV_DIR=dist/coverage NODE_OPTIONS="--require $PWD/tools/slim/cov_preload.cjs" node tools/slim/tour.cjs [index.html] [seed]
 * Runs in a fresh browser profile; nothing of the user's data is involved. Errors of single actions are ignored. */
const path=require('path');const {chromium}=require('playwright');
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const seed=Number(process.argv[3]||1);
const ROOMS=['LIVE ROOM','MATERIAL FORGE','NODAL CENTER','MULTITRACK','PSY LAB'];
const SKIP=/^(LIVE ROOM|MATERIAL FORGE|NODAL CENTER|MULTITRACK|PSY LAB)$|fullscreen|⛶/i;
(async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const ctx=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message).slice(0,160)));
 page.on('dialog',d=>{(seed%2?d.accept():d.dismiss()).catch(()=>{})});
 await page.goto('file://'+html);await page.waitForTimeout(4000);
 const room=async name=>{await page.evaluate(n=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,' ').trim().includes(n));b&&b.click()},name);await page.waitForTimeout(2500)};
 const stats={clicks:0,inputs:0,keys:0};
 const mark=()=>page.evaluate(()=>{let i=0;for(const e of document.querySelectorAll('button,[role=button],[role=tab],[role=menuitem],summary,input,select,textarea,label[for]')){if(!e.dataset.xt)e.dataset.xt='n'+(window.__xt=(window.__xt||0)+1)}});
 const todo=()=>page.evaluate(()=>[...document.querySelectorAll('[data-xt]')].filter(e=>!e.dataset.xtDone&&e.getClientRects().length&&!e.disabled).map(e=>({id:e.dataset.xt,tag:e.tagName,type:e.type||'',text:(e.innerText||e.getAttribute('aria-label')||e.title||'').replace(/\s+/g,' ').trim().slice(0,50)})));
 async function operate(el){
  await page.evaluate(id=>{const e=document.querySelector('[data-xt="'+id+'"]');if(e)e.dataset.xtDone='1'},el.id);
  if(SKIP.test(el.text))return;
  const loc=page.locator('[data-xt="'+el.id+'"]');
  try{
   if(el.tag==='SELECT'){const n=await loc.evaluate(e=>e.options.length);for(const i of [n-1,Math.floor(n/2),0].filter((v,k,a)=>v>=0&&a.indexOf(v)===k)){await loc.selectOption({index:i},{timeout:800}).catch(()=>{});await page.waitForTimeout(60)}stats.inputs++;return}
   if(el.tag==='INPUT'&&el.type==='range'){for(const f of [1,0,.5]){await loc.evaluate((e,f)=>{const lo=Number(e.min||0),hi=Number(e.max||100),v=lo+(hi-lo)*f;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(v));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},f);await page.waitForTimeout(40)}
    await loc.dispatchEvent('pointerup').catch(()=>{});stats.inputs++;return}
   if(el.tag==='INPUT'&&(el.type==='number'||el.type==='text'||el.type==='search')){await loc.fill(el.type==='number'?'3':'tour',{timeout:800}).catch(()=>{});await loc.press('Enter',{timeout:500}).catch(()=>{});stats.inputs++;return}
   if(el.tag==='INPUT'&&el.type==='file')return;
   if(el.tag==='TEXTAREA'){await loc.fill('tour note',{timeout:800}).catch(()=>{});return}
   await loc.click({timeout:900,force:false}).catch(async()=>{await loc.click({timeout:600,force:true}).catch(()=>{})});stats.clicks++;
   await page.waitForTimeout(90);
   if((stats.clicks+seed)%7===0)await loc.click({button:'right',timeout:600}).catch(()=>{});
  }catch{}
 }
 async function sweep(label,budgetMs){
  const t0=Date.now();
  for(let pass=0;pass<3&&Date.now()-t0<budgetMs;pass++){
   await mark();const list=await todo();if(!list.length)break;
   for(const el of list){if(Date.now()-t0>budgetMs)break;await operate(el);
    if(stats.clicks%25===24){await page.keyboard.press('Escape').catch(()=>{});await page.waitForTimeout(50)}}
   await page.keyboard.press('Escape').catch(()=>{});
  }
  console.log(label.padEnd(16),'clicks',stats.clicks,'inputs',stats.inputs,'pageerrors',errors.length);
 }
 async function playLive(){
  const box={x:300,y:380,w:900,h:480};
  for(let i=0;i<60;i++){await page.mouse.move(box.x+box.w*(.5+.45*Math.sin(i/9+seed)),box.y+box.h*(.5+.45*Math.cos(i/7)));await page.waitForTimeout(50);
   if(i%10===5){await page.mouse.down();await page.waitForTimeout(120);await page.mouse.up()}}
  for(const k of ['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m','ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','Shift','Tab']){
   await page.keyboard.down(k).catch(()=>{});await page.waitForTimeout(70);await page.keyboard.up(k).catch(()=>{});stats.keys++}
  await page.mouse.wheel(0,300);await page.mouse.wheel(0,-300);
 }
 // Live Room: power on, play, then operate everything; power on again (the sweep toggles it) and play once more
 await page.getByRole('button',{name:'Power'}).click().catch(()=>{});await page.waitForTimeout(2500);
 await playLive();
 await sweep('LIVE ROOM',240000);
 await page.evaluate(()=>{const b=document.querySelector('button[aria-label="Power"]');if(b&&b.getAttribute('aria-pressed')!=='true')b.click()}).catch(()=>{});await page.waitForTimeout(1500);
 await playLive();
 for(const r of ROOMS.slice(1)){await room(r);await sweep(r,150000);
  // canvas gestures in every room
  for(const c of await page.locator('canvas').all()){try{const b=await c.boundingBox();if(!b||b.width<40)continue;
    await page.mouse.move(b.x+b.width*.3,b.y+b.height*.4);await page.mouse.down();await page.mouse.move(b.x+b.width*.6,b.y+b.height*.6,{steps:6});await page.mouse.up();
    await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5,{button:'right'});await page.keyboard.press('Escape');await page.mouse.wheel(0,120)}catch{}}}
 await room('LIVE ROOM');await sweep('LIVE ROOM again',60000);
 console.log('tour done',JSON.stringify(stats),'pageerrors:',errors.length,[...new Set(errors)].slice(0,8));
 await browser.close();
})().catch(e=>{console.error('TOUR FAILED',String(e.message||e).split('\n')[0]);process.exit(1)});
