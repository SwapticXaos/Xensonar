const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('file://'+path.resolve(process.argv[2]||path.join(__dirname,'../dist/XenSonar_Standalone.html')));
 await page.waitForFunction(()=>window.__XenBoot?.state().ready);await page.evaluate(()=>document.fonts.ready);
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const doc=await cdp.send('DOM.getDocument'),proof=[];
 for(const [selector,expected] of [['.xen-performance header button',['◀','▶']],['.xen-quick-collapse-trigger',['>','<']]]){
 for(let i=0;i<2;i++){
 const button=page.locator(selector).first(); // Stufe 2b: since Nov the One-Shot Fills panel has the same collapse arrow; the test targets the first (Instruments)await button.waitFor({state:'visible'});
 await page.mouse.move(700,10);await page.waitForTimeout(180);
 const style=await button.evaluate(e=>{const s=getComputedStyle(e);return {text:e.textContent,color:s.color,background:s.backgroundColor,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}});
 assert.equal(style.text,expected[i]);assert.equal(style.color,selector.startsWith('.xen-performance')?'rgb(232, 121, 249)':'rgb(241, 145, 255)');if(selector.startsWith('.xen-performance'))assert.equal(style.background,'rgb(0, 0, 0)');
 const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});
 const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
 assert(fonts.some(f=>f.glyphCount>0));assert(!fonts.some(f=>/Emoji/.test(f.familyName)&&f.glyphCount>0),'designed arrow must use a tintable text glyph');
 proof.push({selector,state:i===0?'expanded':'collapsed',...style,fonts});
 await button.click();
 }
 }
 await page.screenshot({path:path.join(__dirname,'../../side-arrows.png')});
 fs.writeFileSync(path.join(__dirname,'../docs/UI_SIDE_ARROWS.json'),JSON.stringify(proof,null,2));
 console.log('PASS both original pink side controls: glyph, tint, black body and collapse/expand');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
