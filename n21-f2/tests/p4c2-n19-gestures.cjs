// Real pointer input against the shipped file. No storage shims, synthetic drags,
// or calls into private application state. Run against N18 to reproduce RED.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).entry));
const menus={drum:'button[title^="Manage Drum"]',bass:'button[title^="Manage Bass"]',grid:'button[title="Open Grid Workbench"]',material:'button[title^="Manage Material Track"]',rootFollow:'button[title^="Manage Root Follow"]'};
const results=[];
const pause=p=>p.evaluate(()=>new Promise(requestAnimationFrame));
async function drag(p,row,dest,lead='diagonal'){
 const r=await row.boundingBox(),x=r.x+r.width*.65,y=r.y+r.height*.5;
 await p.mouse.move(x,y);await p.mouse.down();
 if(lead==='left')await p.mouse.move(x-16,y,{steps:6});
 if(lead==='vertical-first')await p.mouse.move(x,y+30,{steps:8});
 if(lead==='right-first')await p.mouse.move(x+18,y+4,{steps:6});
 await p.mouse.move(dest.x,dest.y,{steps:25});
}
async function order(p,kind){return p.locator(`[data-xen-quick-kind="${kind}"]`).evaluateAll(es=>es.map(e=>e.dataset.xenQuickId))}
async function setup(b,kind,size={width:1740,height:950}){
 const p=await b.newPage({viewport:size});p.setDefaultTimeout(8000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.errors=errors;
 await p.goto('file://'+file);await p.locator('.xen-quick-dock').waitFor();
 // Per-test profiles already start clean; a file navigation shares no previous page's context.
 await p.locator(menus[kind]).first().click();await p.locator(`[data-xen-header-menu="${kind}"]`).waitFor();
 if(['material','rootFollow'].includes(kind))for(const name of ['test-loop.wav','test-loop-b.wav']){
  await p.locator('input[type=file][accept="audio/*"]').first().setInputFiles(path.join(root,'tests/fixtures',name));
  await p.locator(`[data-xen-quick-kind="${kind}"]`).filter({hasText:name.replace('.wav','')}).first().waitFor();
 }
 return p;
}
async function runCase(unused,name,fn){let p;const b=await launch();try{p=await fn(b);assert.deepEqual(p.errors,[]);results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message.slice(0,650));if(process.env.XEN_FAIL_FAST)throw e}finally{await b.close()}}
async function launch(){return chromium.launch({headless:true,...(process.env.XEN_CHROMIUM_PATH?{executablePath:process.env.XEN_CHROMIUM_PATH}:{}),args:['--no-sandbox',...(process.env.XEN_SINGLE_PROCESS?['--no-zygote','--single-process']:[])]})}
(async()=>{
 const b=null;
 try{
  const kinds=(process.env.XEN_KINDS||'drum,bass,grid,material,rootFollow').split(',');
  for(const kind of kinds)for(const lead of ['left','diagonal','vertical-first','right-first'])await runCase(b,`${kind}: export ${lead}`,async(b)=>{
   const p=await setup(b,kind),row=p.locator(`[data-xen-quick-kind="${kind}"]`).first(),id=await row.getAttribute('data-xen-quick-id'),before=await order(p,kind);
   const d=await p.locator('.xen-quick-dock').boundingBox(),dest={x:d.x+d.width*.7,y:d.y+d.height*.5};
   await drag(p,row,dest,lead);
   assert.equal(await p.locator('.xen-quick-pointer-ghost').count(),1,'drag preview must escape the playlist in every initial direction');
   assert.equal(await p.locator('.xen-quick-pointer-over').count(),1,'visible landing area must accept the pointer');
   await p.mouse.up();await pause(p);
   assert.equal(await p.locator(`[data-xen-quick-column="${kind}"] .xen-quick-tile`).count(),1,'release must create one shortcut');
   assert.deepEqual(await order(p,kind),before,'export must preserve playlist order');
   assert.equal(await row.getAttribute('data-xen-quick-id'),id);assert.equal(await p.locator('.xen-quick-pointer-ghost').count(),0);
   await p.keyboard.press('Escape');await p.locator(`[data-xen-quick-column="${kind}"] .xen-quick-tile`).click();
   assert.equal(await p.locator('[data-xen-header-menu]').count(),0,'recall must not open a manager');
   return p;
  });
  if(!process.env.XEN_EXPORT_ONLY)for(const kind of kinds.filter(k=>k!=='grid'&&k!=='bass'))await runCase(b,`${kind}: actual swap`,async(b)=>{
   const p=await setup(b,kind),rows=p.locator(`[data-xen-quick-kind="${kind}"]`),before=await order(p,kind);assert(before.length>=2);
   const r=await rows.nth(1).boundingBox();await drag(p,rows.first(),{x:r.x+r.width*.65,y:r.y+r.height*.5});await p.mouse.up();
   await p.waitForFunction(({kind,before})=>document.querySelector(`[data-xen-quick-kind="${kind}"]`)?.dataset.xenQuickId===before[1],{kind,before});
   const after=await order(p,kind);assert.equal(after[1],before[0]);assert.equal(await p.locator('.xen-quick-tile').count(),0);
   return p;
  });
 }finally{fs.mkdirSync(path.join(root,'results/n19'),{recursive:true});fs.writeFileSync(path.join(root,'results/n19/gestures.json'),JSON.stringify({file,results},null,2))}
 assert(results.every(r=>r.pass),'gesture failures');
})().catch(e=>{console.error(e.message);process.exitCode=1});
