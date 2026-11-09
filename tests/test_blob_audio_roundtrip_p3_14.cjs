'use strict';
/* P3.14 user-reported export blocker: persisted audio assets contain Blob/File.
 * Execute the real Donor and Forge package bridges, not a JSON-only mock.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({console,Blob,File,Float32Array,Float64Array,Uint8Array,Uint16Array,
  Int8Array,Int16Array,Int32Array,Uint32Array,Uint8ClampedArray,DataView,ArrayBuffer,
  btoa,atob,Date,Map,Set,WeakSet,Error,TypeError,Number});
vm.runInContext(read('src/01_app_runtime.js').split('// F3_39 control-side')[0],ctx);
vm.runInContext(read('src/contracts/03_package_transaction.js'),ctx);
vm.runInContext(read('src/storage/02_donor_packages.js'),ctx);
vm.runInContext(read('src/storage/03_forge_packages.js'),ctx);
const bridge=vm.runInContext('__createF3568DonorPackageBridge',ctx);
const forgeBridge=vm.runInContext('__createF3568ForgePackageBridge',ctx);
const pcm=()=>({monoSamples:new Float32Array([.125,-.5,.75]),sampleRate:48000,channelCount:1});
const blobBytes=new Uint8Array([0,1,2,127,128,254,255,0,42,91,3]);
const wav=new Blob([blobBytes],{type:'audio/wav'});
const sourceFile=new File([blobBytes],'field take.wav',{type:'audio/wav',lastModified:987654});
function makeRepo(rows){
 const data=new Map(rows.map(row=>[row.id,row]));
 return {
  get:async id=>data.get(id)??null,
  listPrefix:async prefix=>[...data.values()].filter(r=>r.id.startsWith(prefix)),
  importPackage:async({assets,metadata})=>{
   for(const a of assets)data.set(a.id,a);
   for(const r of metadata)data.set(r.id,r);
   return {audioImported:assets.length,audioReused:0,metadataCount:metadata.length,
     metadataWrittenIds:metadata.map(r=>r.id)};
  },
  putMany:async()=>{},
 };
}
async function checkBytes(original, restored, label){
 assert(restored instanceof Blob,label+' needs to be a real Blob');
 assert.equal(restored.type,original.type,label+' MIME type');
 assert.equal(restored.size,original.size,label+' byte length');
 assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),new Uint8Array(await original.arrayBuffer()),label+' binary bytes');
}
async function main(){
 const donorRepo=makeRepo([
  {id:'asset:audio',value:{...pcm(),blob:wav,originalFile:sourceFile,details:{takes:[wav]}}},
  {id:'donor-library:preset:p',value:{id:'p',version:'donor-library-v1',name:'Field',assetId:'asset:audio'}}
 ]);
 const donor=bridge(donorRepo);
 const pack=await donor.exportLibrary();
 assert.equal(pack.assets.length,1);
 assert.equal(pack.assets[0].value.blob.__xensonarPortableBlob,1,'binary Blob should be encoded losslessly');
 assert.equal(pack.assets[0].value.originalFile.__xensonarPortableBlob,1,'File should be encoded losslessly');
 assert.equal(pack.assets[0].value.monoSamples.__xensonarPortableBytes,1,'PCM must remain lossless');
 const copy=JSON.parse(JSON.stringify(pack));
 const target=makeRepo([]);
 await bridge(target).importLibrary(copy,'merge');
 const restored=(await target.get('asset:audio')).value;
 await checkBytes(wav,restored.blob,'asset.blob');
 await checkBytes(wav,restored.details.takes[0],'nested audio');
 await checkBytes(sourceFile,restored.originalFile,'original file');
 assert(restored.originalFile instanceof File,'File must be restored as a File');
 assert.equal(restored.originalFile.name,sourceFile.name);
 assert.equal(restored.originalFile.lastModified,sourceFile.lastModified);
 assert.deepEqual(Array.from(restored.monoSamples),Array.from(pcm().monoSamples));
 const repacked=await bridge(target).exportLibrary();
 assert.deepEqual(JSON.parse(JSON.stringify(repacked)),copy,'Donor reexport must preserve Blob, File and PCM');
 // Forge uses the same donor codec but has its own store and workspace metadata.
 const forgeRepo=makeRepo([
  {id:'asset:forge',value:{...pcm(),blob:wav}},
  {id:'workspace:autosave-v1',value:{mainSource:{assetId:'asset:forge'},attachment:sourceFile}}
 ]);
 const forge=forgeBridge(forgeRepo,donor);
 const forgePkg=await forge.exportState();
 assert.equal(forgePkg.assets[0].value.blob.__xensonarPortableBlob,1);
 assert.equal(forgePkg.workspaces[0].value.attachment.__xensonarPortableBlob,1);
 const forgeTarget=makeRepo([]);
 await forgeBridge(forgeTarget,donor).importState(JSON.parse(JSON.stringify(forgePkg)),'merge');
 await checkBytes(wav,(await forgeTarget.get('asset:forge')).value.blob,'Forge asset');
 await checkBytes(sourceFile,(await forgeTarget.get('workspace:autosave-v1')).value.attachment,'Forge workspace file');
 // A tampered base64 length must fail before starting a persistence commit.
 const corrupted=JSON.parse(JSON.stringify(pack));
 corrupted.assets[0].value.blob.base64=corrupted.assets[0].value.blob.base64.slice(4);
 let writes=0;
 const corruptTarget=makeRepo([]);
 const previous=corruptTarget.importPackage;
 corruptTarget.importPackage=async (...args)=>{writes++;return previous(...args)};
 await assert.rejects(bridge(corruptTarget).importLibrary(corrupted,'merge'),/audio|length|data|blob|invalid/i);
 assert.equal(writes,0,'corrupted Blob must fail before write');
 console.log('P3.14 PASS: real donor and forge export/import/reexport, Blob+File+PCM bytes, metadata, preflight corruption');
}
main().catch(error=>{console.error(error);process.exitCode=1});
