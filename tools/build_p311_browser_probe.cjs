'use strict';
/** Build an independent browser probe from actual source; NO app DB operations. */
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sources=[
 read('src/01_app_runtime.js').split('// F3_39 control-side')[0],
 ...['src/contracts/03_package_transaction.js','src/storage/02_donor_packages.js','src/storage/03_forge_packages.js'].map(read)
];
const sha=crypto.createHash('sha256').update(sources.join('')).digest('hex');
const js=String.raw`
'use strict';
const logElement=document.getElementById('log');
const lines=[];
function log(kind,message){lines.push(kind+' '+message);logElement.textContent=lines.join('\n');}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function openDelete(dbName){return new Promise(resolve=>{try{
 const r=indexedDB.deleteDatabase(dbName);r.onsuccess=()=>resolve('cleaned');r.onerror=()=>resolve('cleanup failed');
 r.onblocked=()=>resolve('blocked; close this tab and delete the test DB manually');
 }catch(e){resolve(String(e));}});}
async function run(){
 document.getElementById('start').disabled=true;lines.length=0;
 const runId=Date.now()+'-'+Math.random().toString(36).slice(2,10);
 const names=['donor-source','forge-source','donor-target','forge-target'].map(k=>'xensonar-p311-test-'+k+'-'+runId);
 log('INFO','Origin: '+location.origin); log('INFO','Quell-SHA: '+document.body.dataset.sourceSha);
 log('INFO','Exclusive temporary DBs: '+names.join(', '));
 const make=(id)=>__f35612RecordStore(id,{});
 try{
  const ds=make(names[0]),fs=make(names[1]),dt=make(names[2]),ft=make(names[3]);
  const donorSource=__createF3568DonorPackageBridge(ds),forgeSource=__createF3568ForgePackageBridge(fs,donorSource);
  const donorTarget=__createF3568DonorPackageBridge(dt),forgeTarget=__createF3568ForgePackageBridge(ft,donorTarget);
  const pcm=(a,sampleRate=48000)=>({monoSamples:new Float32Array(a),sampleRate,channelCount:1});
  await ds.putMany([{id:'asset:shared',value:pcm([.125,-.5,.75])},
   {id:'donor-library:preset:voice',value:{id:'voice',version:'donor-library-v1',assetId:'asset:shared'}},
   {id:'workspace:material-test',value:{source:{sourceAsset:{__materialIntakeAssetRef:'asset:shared'}}}}],[]);
  await fs.putMany([{id:'asset:shared',value:pcm([-.625,.25],44100)},
   {id:'workspace:autosave-v1',value:{mainSource:{assetId:'asset:shared'},recipe:{mix:.42}}}],[]);
  const p1=await donorSource.exportLibrary(),p2=await forgeSource.exportState();
  log('PASS','Donor + Forge package export (production codecs)');
  await donorTarget.importLibrary(p1,'merge');await forgeTarget.importState(p2,'merge');
  const round1=await donorTarget.exportLibrary(),round2=await forgeTarget.exportState();
  if(!equal(p1,round1)||!equal(p2,round2))throw Error('Import/export package roundtrip differs');
  log('PASS','Native IndexedDB roundtrip, PCM and references unchanged');
  const left=(await dt.get('asset:shared')).value.monoSamples[0];
  const right=(await ft.get('asset:shared')).value.monoSamples[0];
  if(left===right)throw Error('Repository collision: equal asset ID resolved across databases');
  log('PASS','Equal asset ID stays repository-scoped');
  await donorTarget.importLibrary(p1,'merge');await forgeTarget.importState(p2,'merge');
  if(!equal(p1,await donorTarget.exportLibrary())||!equal(p2,await forgeTarget.exportState()))
    throw Error('Second merge modified the stored payload');
  log('PASS','Idempotent repeated merge');
  const corrupt=structuredClone(p2);corrupt.workspaces[0].value.mainSource.assetId='asset:missing';
  let refused=false;try{await forgeTarget.importState(corrupt,'merge');}catch{refused=true;}
  if(!refused||!equal(p2,await forgeTarget.exportState()))throw Error('Invalid reference mutated target');
  log('PASS','Invalid reference rejected without write');
  const failed=structuredClone(p1);failed.assets[0].value.monoSamples.base64='not-base64';
  refused=false;try{await donorTarget.importLibrary(failed,'replace');}catch{refused=true;}
  if(!refused||!equal(p1,await donorTarget.exportLibrary()))throw Error('Malformed PCM damaged imported data');
  log('PASS','Malformed PCM rejected before replace');
  log('RESULT','PASS: native browser test, actual package bridges, 5 checked properties.');
 }catch(error){log('FAIL',String(error?.stack||error));log('RESULT','NO RELEASE APPROVAL from this test');}
 finally{
  for(const name of names){const status=await openDelete(name);log(status==='cleaned'?'CLEAN':'WARN',name+': '+status);}
  document.getElementById('start').disabled=false;
 }
}
document.getElementById('start').addEventListener('click',run);
`;
const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>XenSonar P3.11 – Native Package Roundtrip Lab</title><style>
body{margin:2rem auto;padding:0 1.25rem;max-width:900px;background:#091e26;color:#e2f4f2;font:16px/1.6 system-ui,sans-serif}
h1{color:#8ce8e0}strong{color:#b6ffda}button{background:#114c5b;color:white;border:1px solid #50b8c7;border-radius:7px;padding:.8rem 1.3rem;cursor:pointer}button:disabled{opacity:.5}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#14313a;border-radius:8px;padding:1rem;font-size:13px}.warn{color:#f2cf94}
</style></head><body data-source-sha="${sha}"><h1>XenSonar · P3.11 Native Package Roundtrip</h1>
<p>Dieser Test öffnet <strong>ausschließlich neue, zufällig benannte Testdatenbanken</strong>. Er schreibt keine persönlichen XenSonar-Projekte oder -Bibliotheken. Er testet die realen Donor- und Forge-Paketfunktionen mit nativer IndexedDB; nach dem Test versucht er alle vier Testdatenbanken zu löschen.</p>
<p>Eigenständige HTML im eigenen Opera-/Firefox-Testprofil öffnen. Falls <code>file://</code> keinen IndexedDB-Zugriff erlaubt, über einen lokalen HTTP-Server auf dem eigenen Rechner öffnen. Nicht während eines laufenden XenSonar-Imports ausführen.</p>
<button id="start">Native Tests starten</button><pre id="log">Noch nicht ausgeführt.</pre>
<p class="warn">Diese Probe ist kein vollständiger Workspace-Test: Samples, Materialspuren, Drums, Nodal, Session-V2, Browserabsturz, Quota und parallele Tabs werden hier nicht abschließend geprüft. Ein PASS ist allein keine Produktionsfreigabe.</p>
<script>\n${sources.join('\n').replace(/<\/script/gi,'<\\/script')}\n${js.replace(/<\/script/gi,'<\\/script')}\n<\/script></body></html>`;
const target=path.join(root,'dist','XenSonar_P3_11_Native_Package_Probe.html');
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,html);
console.log('BUILT native package probe',target,Buffer.byteLength(html),'bytes',sha);
