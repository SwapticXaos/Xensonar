'use strict';
// User-reported failure: donor linked to a saved melodic sample cannot be exported
// when the UI snapshot omits it. Exercise the REAL pB package builder, not a toy.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
const station=fs.readFileSync(path.join(root,'src/runtime/instrument/05_timing_and_admission.js'),'utf8');
const exportTrace=fs.readFileSync(path.join(root,'src/contracts/16_workspace_export_stream.js'),'utf8');
const segment=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,`missing ${a}`);return s.slice(i,j)};
const archived='sample-1778081918977-epo5rn';
const sample={id:archived,name:'Recovered Sample',createdAt:5,sizeBytes:4,durationSec:1};
function makePackageTest({records=[sample],blob=()=>new Blob([new Uint8Array([1,2,3,4])],{type:'audio/wav'}),failLibrary=null}={}){
 const stats={reads:[],list:0,linked:null};
 const env={Set,Map,Date,Blob,console,
  __xenP23SampleListStrict:async()=>{stats.list++;return records;},
  __xenP23SampleBlobStrict:async(id)=>{stats.reads.push(id);return blob(id);},
  gw:async(id)=>{stats.reads.push('old:'+id);return blob(id);},
  vw:s=>s||'Test',wS:()=> 'pkg-id', Sw:buffer=>Buffer.from(buffer).toString('base64'),
  $n:x=>x,Bi:x=>x,Di:x=>x,YS:()=> 'hash',BQ:x=>x,
  RLe:async()=>({entries:[]}),eFe:()=>({memberIds:[]}),K7:()=>({clips:[]}),
  yfe:async()=>{if(failLibrary==='drums')throw Error('database unavailable');return null},xFe:async()=>{if(failLibrary==='forgeProjects')throw Error('database unavailable');return null},LFe:async()=>{if(failLibrary==='forgeStamps')throw Error('database unavailable');return null},DLe:async()=>{if(failLibrary==='synthetic')throw Error('database unavailable');return []},oLe:x=>x,
  mB:()=>({}),rLe:()=>({}),__ForgeF33:{flushMaterialIntakePersistence:async()=>{}},
  yH:()=>({entries:[]}),IS:()=>({customTunings:[]}),
  SLe:p=>({...p,donorLibrary:null,forgeExperiment:null}),
  HLe:p=>`exported ${p.archive.samples.length}`,
  __PaketDonorF3568:{exportLibrary:async valid=>{stats.linked=[...valid];if(!valid.has(archived))throw Error('Experiment package / donor library: Sample is missing from the experiment package: melodic-sample:'+archived);return {presets:[{id:'linked'}]}}},
  __PaketForgeF3568:{exportState:async()=>({})},
  globalThis:{__SpectralForgeF35:{saveExperiment:async()=>true}}
 };
 vm.runInNewContext(exportTrace+'\n'+segment(app,'async function pB(e){','async function NQ(e){'),env);
 const arg={selectedProjectName:'Project',packageLabel:'Project',loopComposer:{tracks:[]},patternVariants:{},patternLinks:{},savedMelodicProjects:[],melodicSampleEntries:[]};
 return {run:()=>env.pB(arg),stats};
}
(async()=>{
 const missingUI=makePackageTest();
 const success=await missingUI.run();
 assert.equal(success.archive.samples.length,1,'saved sample must be exported even if not present in the UI snapshot');
 assert.equal(success.archive.samples[0].archivedId,archived);
 assert.equal(success.archive.samples[0].dataBase64,'AQIDBA==');
 assert.deepEqual(missingUI.stats.linked,[archived],'donor must see packaged canonical sample');
 assert.equal(missingUI.stats.list,1,'sample listing must use canonical database');
 assert.deepEqual(missingUI.stats.reads,[archived]);
 const disappeared=makePackageTest({blob:()=>null});
 await assert.rejects(disappeared.run(),/Recovered Sample.*sample-1778081918977-epo5rn|sample-1778081918977-epo5rn.*Recovered Sample/,
 'a true missing blob must raise actionable error, not produce incomplete backup');
 // A complete workspace backup must fail closed if any persistent sub-library cannot be read.
 for(const [library,label] of [['drums','Drum'],['forgeProjects','Forge'],['forgeStamps','Stempel'],['synthetic','Synthetic']]){
   await assert.rejects(makePackageTest({failLibrary:library}).run(),/Paketstation.*konnte nicht vollständig gelesen werden/,library+' must not be omitted from complete backup');
 }
 // Check the real donor-export bridge reports the human donor label for orphan links.
 const donorSrc=fs.readFileSync(path.join(root,'src/storage/02_donor_packages.js'),'utf8');
 const repo={listPrefix:async prefix=>prefix==='donor-library:preset:'?[{id:'donor-library:preset:v',value:{id:'v',version:'donor-library-v1',name:'Vocal Test Donor',assetId:'melodic-sample:'+archived}}]:[],get:async()=>null,putMany:async()=>{}};
 const denv={Float32Array,Float64Array,Uint8Array,Uint16Array,Int8Array,Int16Array,Int32Array,Uint32Array,Uint8ClampedArray,DataView,Set,Map,WeakSet,ArrayBuffer,Blob,console,
   __F35614AudioRef:{samplePrefix:'melodic-sample:',fromSource:()=>null},
   __F35613Archive:{exportAssets:async()=>[]},__f35612RecordStore:()=>repo};
 vm.runInNewContext(donorSrc,denv);
 const donor=vm.runInNewContext('__createF3568DonorPackageBridge(globalThis.__repo)',{...denv,__repo:repo});
 await assert.rejects(donor.exportLibrary(new Set()),/Vocal Test Donor.*sample-1778081918977-epo5rn/,
  'the donor-specific error must name the affected preset as well as the internal sample ID');
 const readFailure=makePackageTest({blob:()=>{throw Error('IndexedDB read failed')}});
 await assert.rejects(readFailure.run(),/IndexedDB read failed/,'do not swallow database errors');
 // The Package Station may export without the Melodic editor; missing UI must
 // delegate to the complete headless export, never manufacture a blank snapshot.
 const entry=segment(station,'async function Ute(e){','function Kte(e,t)');
 let headless=0;
 const env={vw:x=>x||'',__XenPackageExportTraceP315:{},__xenFlushWorkspace4:()=>{},__xenCaptureWorkspace4:()=>{},
  __xenPackageStation4:()=>({configure(){},prepare:async()=>{headless++;return{download:{filename:'full.json'}}}})};
 vm.runInNewContext(entry,env);
 const result=await env.Ute({packageLabel:'Backup'});
 assert.equal(result.download.filename,'full.json');
 assert.equal(headless,1,'complete headless export must be invoked without a Melodic editor');
 console.log('P3.12 PASS: package station includes linked canonical samples, fails on real loss, uses complete editor-independent export');
})().catch(e=>{console.error(e);process.exitCode=1});
