const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
async function checkPictographs(page,cdp,documentId){
 const seen=await page.evaluate(()=>{
  document.querySelectorAll('[data-emoji-probe]').forEach(e=>delete e.dataset.emojiProbe);
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),out=[];let text;
  while(text=walker.nextNode()){
   if(!/[\u{1F300}-\u{1FAFF}]/u.test(text.textContent))continue;
   const el=text.parentElement,r=el.getBoundingClientRect();
   if(r.width&&r.height&&getComputedStyle(el).visibility!=='hidden'){
    el.dataset.emojiProbe=String(out.length);out.push({index:el.dataset.emojiProbe,text:text.textContent.slice(0,45)});
   }
  }
  return out;
 });
 for(const row of seen){
  const node=await cdp.send('DOM.querySelector',{nodeId:documentId,selector:'[data-emoji-probe="'+row.index+'"]'});
  const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
  assert(fonts.fonts.some(f=>/Emoji/.test(f.familyName)&&f.glyphCount>0),'visible pictograph needs a real glyph: '+row.text);
 }
 return seen;
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(process.argv[2]||root+'/dist/XenSonar_Standalone.html'));
  await page.waitForFunction(()=>window.__XenBoot?.state().ready);await page.evaluate(()=>document.fonts.ready);
  const icons=await page.locator('.xen-lane-tab-icon').allTextContents();
  assert.deepEqual(icons,['📀','🎼','🎸','🥁'],'four explicit visible lane symbols');
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const doc=await cdp.send('DOM.getDocument');
  const main=await checkPictographs(page,cdp,doc.root.nodeId);
  const family=await page.locator('.xen-lane-controls').evaluate(e=>getComputedStyle(e).fontFamily);
  assert(!family.includes('Courier'),'control labels must not fall back to Courier');
  await page.getByRole('button',{name:'Meta-Menu',exact:true}).click();await page.waitForTimeout(150);await page.evaluate(()=>document.fonts.ready);
  const meta=await checkPictographs(page,cdp,doc.root.nodeId);
  assert(meta.length>main.length,'Meta Menu contributes its own visible library pictographs');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(root+'/docs/UI_VISUAL_RESTORE.json',JSON.stringify({icons,family,main,meta,errors},null,2));
  console.log('PASS actual Emoji glyph fonts in Main Room and Meta Menu; sans control typography',main.length,meta.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
