const {chromium}=require('playwright');
const fs=require('node:fs');
const file=process.argv[2];
(async()=>{
 for(const [kind,lead] of [['drum','left'],['drum','diagonal'],['drum','vertical-first'],['bass','diagonal'],['grid','diagonal']]){
  const b=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH,args:['--no-sandbox','--no-zygote','--single-process'],headless:true});
  const p=await b.newPage({viewport:{width:1740,height:950}});await p.goto('file://'+file);
  await p.locator('.xen-quick-dock').waitFor();
  await p.locator(kind==='grid'?'button[title="Open Grid Workbench"]':`button[title^="Manage ${kind==='bass'?'Bass':'Drum'}"]`).click();
  await p.evaluate(()=>{window.trace=[]; for(const type of ['pointerdown','pointermove','pointercancel','pointerup','mousedown','dragstart','dragover','drop','dragend'])window.addEventListener(type,e=>{if(type==='pointermove'&&window.trace.filter(v=>v.type===type).length>10)return;window.trace.push({type,x:e.clientX,y:e.clientY,target:e.target.tagName,canceled:e.defaultPrevented,ghost:!!document.querySelector('.xen-quick-pointer-ghost')})},true)});
  const r=await p.locator(`[data-xen-quick-kind="${kind}"]`).first().boundingBox(),d=await p.locator('.xen-quick-dock').boundingBox();
  const x=r.x+r.width*.65,y=r.y+r.height*.5,dx=d.x+d.width*.65,dy=d.y+d.height*.5;
  await p.mouse.move(x,y);await p.mouse.down();
  if(lead==='left')await p.mouse.move(x-15,y,{steps:7});
  if(lead==='vertical-first')await p.mouse.move(x,y+30,{steps:8});
  await p.mouse.move(dx,dy,{steps:30});const ghost=await p.locator('.xen-quick-pointer-ghost').count();await p.mouse.up();
  const out={kind,lead,ghost,tiles:await p.locator('.xen-quick-tile').count(),trace:await p.evaluate(()=>window.trace)};
  console.log(JSON.stringify(out));await b.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
