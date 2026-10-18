const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),current=path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).entry),baseline=path.join(root,'XenSonar_F448_S1_P4C2_N18_Pointer_Export_Fallback_Test.html');
const menus={grid:'button[title="Open Grid Workbench"]',material:'button[title^="Manage Material Track"]',rootFollow:'button[title^="Manage Root Follow"]',drum:'button[title^="Manage Drum"]',bass:'button[title^="Manage Bass"]'};
(async()=>{const measurements={};for(const [version,file] of [['n18',baseline],['n19',current]]){
 const b=await chromium.launch({headless:true,...(process.env.XEN_CHROMIUM_PATH?{executablePath:process.env.XEN_CHROMIUM_PATH}:{}),args:['--no-sandbox',...(process.env.XEN_SINGLE_PROCESS?['--no-zygote','--single-process']:[])]});
 try{const p=await b.newPage({viewport:{width:1740,height:950}});p.setDefaultTimeout(6000);await p.goto('file://'+file);await p.locator('.xen-quick-dock').waitFor();measurements[version]={};
 for(const [kind,trigger] of Object.entries(menus)){
  console.log('CHECK',version,kind);await p.locator(trigger).click();const pane=p.locator(`[data-xen-header-menu="${kind}"] > div`).last();await pane.waitFor();
  measurements[version][kind]={dialog:await pane.boundingBox()};
  if(kind==='drum')measurements[version][kind].live=await p.getByText('Live Drum Machine',{exact:true}).evaluate(e=>{const r=e.parentElement.getBoundingClientRect();return{width:r.width,height:r.height}});
  await pane.locator('button').filter({hasText:'×'}).first().click();await p.locator(`[data-xen-header-menu="${kind}"]`).waitFor({state:'detached'});
 }
 }finally{await b.close()}
 }
 assert.deepEqual(measurements.n19,measurements.n18,'all modal bounds and Live Drum Machine size must remain identical');
 fs.writeFileSync(path.join(root,'results/n19/window-preservation.json'),JSON.stringify(measurements,null,2));console.log('PASS exact original window bounds for all five menus and unchanged Live Drum Machine size');
})().catch(e=>{console.error(e);process.exitCode=1});
