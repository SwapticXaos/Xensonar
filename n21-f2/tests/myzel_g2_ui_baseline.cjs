'use strict';const {chromium}=require('playwright'),path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--single-process','--no-zygote']});const page=await browser.newPage({viewport:{width:1490,height:900}}),report=[];
try{for(const [name,file] of [['G','Xensonar_F3_56_55_CLEAN5_MYZEL_G.html'],['G2','Xensonar_F3_56_55_CLEAN5_MYZEL_G2.html']]){
 await page.goto(pathToFileURL(path.resolve(__dirname,'..',file)).href);await page.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();await page.locator('[data-nodal-designer]').waitFor();await page.waitForTimeout(250);
 const values=await page.evaluate(()=>{const room=document.querySelector('.nd-room'),footer=room.querySelector('.nd-footer').getBoundingClientRect();return {height:innerHeight,footerBottom:footer.bottom,roomHeight:room.getBoundingClientRect().height,scrollHeight:document.documentElement.scrollHeight}});report.push({name,...values});}
 console.log(JSON.stringify(report));fs.writeFileSync(path.join(__dirname,'../results/myzel_g2_ui_baseline.json'),JSON.stringify(report,null,2)+'\n');}
finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
