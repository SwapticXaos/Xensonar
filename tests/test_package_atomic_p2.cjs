'use strict';
/* P2 RED→GREEN: exercise the production persistence implementation with a
 * deterministic IndexedDB transaction adapter. No user/browser storage touched.
 */
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fakeIndexedDB(){
 const databases=new Map();
 const clone=value=>structuredClone(value);
 function db(name){
  if(!databases.has(name))databases.set(name,new Map());
  const data=databases.get(name);
  return {
   objectStoreNames:{contains:()=>true},close(){},createObjectStore(){},
   transaction(_,mode){
    const rows=new Map([...data].map(([k,v])=>[k,clone(v)]));
    let pending=0,ended=false,aborted=false,finishTimer=null;
    const tx={error:null,oncomplete:null,onabort:null,onerror:null,
      abort(){if(ended||aborted)throw Error('InactiveTransaction');aborted=true;clearTimeout(finishTimer);setImmediate(()=>tx.onabort?.());},
      objectStore(){
        const enqueue=doit=>{
          const req={result:null,onsuccess:null,onerror:null};pending++;
          setImmediate(()=>{
            if(aborted)return;
            try{req.result=doit(req);req.onsuccess?.();}
            catch(error){tx.error=error;tx.abort();}
            finally{pending--;complete();}
          });return req;
        };
        return {
          get(id){return enqueue(()=>clone(rows.get(id)));},
          getKey(id){return enqueue(()=>rows.has(id)?id:undefined);},
          openCursor(range){
            const keys=[...rows.keys()].filter(k=>k>=range.low&&k<=range.high).sort();let index=0;
            return enqueue(req=>{
              if(index===keys.length)return null;
              const k=keys[index];return {value:clone(rows.get(k)),primaryKey:k,continue(){
                index++;pending++;setImmediate(()=>{req.result=index===keys.length?null:{value:clone(rows.get(keys[index])),primaryKey:keys[index],continue:this.continue};req.onsuccess?.();pending--;complete();});
              }};
            });
          },
          openKeyCursor(range){
            const keys=[...rows.keys()].filter(k=>k>=range.low&&k<=range.high).sort();let index=0;
            const req={result:null,onsuccess:null,onerror:null};pending++;
            const advance=()=>setImmediate(()=>{
              if(aborted)return;
              req.result=index===keys.length?null:{primaryKey:keys[index],continue(){index++;pending++;advance();}};
              req.onsuccess?.();pending--;complete();
            });advance();return req;
          },
          put(row){if(mode==='readonly')throw Error('Readonly');rows.set(row.id,clone(row));setImmediate(complete);return {};},
          delete(id){if(mode==='readonly')throw Error('Readonly');rows.delete(id);setImmediate(complete);return {};},
        };
      },
    };
    function complete(){
      if(pending===0 && !aborted && !ended){
        clearTimeout(finishTimer);
        finishTimer=setTimeout(()=>{
          if(pending||aborted||ended)return;
          ended=true;
          if(mode==='readwrite'){data.clear();for(const [k,v] of rows)data.set(k,v);}
          tx.oncomplete?.();
        },0);
      }
    }
    return tx;
   }
  };
 }
 return {open(name){const request={result:null,onsuccess:null,onupgradeneeded:null,onerror:null};
   setImmediate(()=>{request.result=db(name);request.onsuccess?.();});return request;},
   databases};
}
const idb=fakeIndexedDB();
const ctx=vm.createContext({indexedDB:idb,IDBKeyRange:{bound:(low,high)=>({low,high})},
 Float32Array,Uint8Array,Uint16Array,Float64Array,Uint32Array,Int8Array,Int16Array,Int32Array,Uint8ClampedArray,
 ArrayBuffer,Map,Set,Date,Object,Number,Error,TypeError,WeakSet,WeakMap,Blob,structuredClone,
 btoa,atob,console,setTimeout,clearTimeout,setImmediate});
// This is the actual production code. The unrelated audio/runtime is not evaluated.
vm.runInContext(read('src/contracts/03_package_transaction.js'),ctx);
vm.runInContext(read('src/01_app_runtime.js').split('// F3_39 control-side')[0],ctx);
vm.runInContext(read('src/storage/02_donor_packages.js'),ctx);
vm.runInContext(read('src/storage/03_forge_packages.js'),ctx);
const store=vm.runInContext("__f35612RecordStore('p2-test-atomic', {})",ctx);
const workRef=id=>({source:{sourceAsset:{__materialIntakeAssetRef:id}}});
const pcm=(...values)=>({monoSamples:new Float32Array(values),sampleRate:48000,channelCount:1});
async function run(){
 assert.equal(typeof store.importPackage,'function','RED: atomic import port required');
 const shared={id:'asset:shared',value:pcm(.1,.2)};
 const stale={id:'workspace:old',value:{old:true}};
 await store.putMany([shared,stale],[]);
 const incoming={id:'asset:new',value:pcm(.3,.4)};
 const preset={id:'donor-library:preset:one',value:{version:'donor-library-v1',assetId:incoming.id}};
 const plan={assets:[incoming],metadata:[preset],mode:'merge',metadataPrefixes:['donor-library:preset:','workspace:'],archiveIds:[incoming.id,preset.id]};
 await assert.rejects(store.importPackage({...plan,metadata:[{...preset,value:{bad:()=>{}}}]}),/clone|function|abort/i);
 assert.equal(await store.get(incoming.id),null,'Failed metadata commit left an audio orphan');
 assert.equal(await store.get(preset.id),null,'Failed metadata commit left a preset');
 assert.ok(await store.get(stale.id),'Abort deleted existing metadata');
 assert.equal((await store.get(shared.id)).value.monoSamples[0],Math.fround(.1),'Abort altered shared PCM');
 let result=await store.importPackage({...plan,assets:[incoming,shared],archiveIds:[incoming.id,shared.id,preset.id]});
 assert.equal(result.audioImported,1);assert.equal(result.audioReused,1);assert.equal(result.metadataCount,1);
 result=await store.importPackage({...plan,assets:[incoming,shared],archiveIds:[incoming.id,shared.id,preset.id],metadata:[{...preset,value:{changed:true}}]});
 assert.equal(result.metadataCount,0);assert.equal(result.audioReused,2);
 assert.equal((await store.get(preset.id)).value.assetId,incoming.id);
 result=await store.importPackage({...plan,mode:'replace'});
 assert.equal(result.metadataDeleted,1);assert.equal(await store.get(stale.id),null);
 assert.ok(await store.get(shared.id),'Replace deleted unreferenced/shared PCM');
 await assert.rejects(store.importPackage({...plan,assets:[{id:incoming.id,value:pcm(.9,.8)}],metadata:[{id:'workspace:collision',value:workRef(incoming.id)}],archiveIds:[incoming.id,'workspace:collision']}),/collision/);
 assert.equal(await store.get('workspace:collision'),null,'Collision created metadata');
 assert.equal((await store.get(incoming.id)).value.monoSamples[0],Math.fround(.3));
 // Exercise the actual importer through its public factory (not a synthetic copy).
 const bridge=vm.runInContext('__createF3568ForgePackageBridge',ctx);
 const fakeCodec={pack:v=>v,unpack:v=>v};
 const testStore=vm.runInContext("__f35612RecordStore('p2-test-forge',{})",ctx);
 const forge=bridge(testStore,fakeCodec);
 const pack={schemaVersion:1,assets:[{id:'asset:original',value:pcm(.5,.6)}],workspaces:[
   {id:'workspace:autosave-v1',value:{mainSource:{assetId:'asset:original'}}}]};
 const imported=await forge.importState(pack,'merge');
 assert.equal(imported.audioImported,1);assert.equal(imported.activeWorkspaceImported,true);
 assert.equal((await testStore.get('asset:original')).value.monoSamples[1],Math.fround(.6));
 await assert.rejects(forge.importState({...pack,assets:[{id:'asset:original',value:pcm(.1,.2)}]},'merge'),/collision/);
 assert.equal((await testStore.get('asset:original')).value.monoSamples[0],.5);
 // No new metadata or assets from a malformed package.
 await assert.rejects(forge.importState({...pack,assets:[]},'merge'),/reference is missing/i);
 const donorBridge=vm.runInContext('__createF3568DonorPackageBridge',ctx);
 const donorStore=vm.runInContext("__f35612RecordStore('p2-test-donor',{})",ctx);
 const donor=donorBridge(donorStore);
 const donorRecord={id:'donor-library:preset:dr1',value:{id:'dr1',version:'donor-library-v1',assetId:'asset:dr'}};
 const donorPkg={schemaVersion:1,presets:[donorRecord],workspaces:[],assets:[{id:'asset:dr',value:donor.pack(pcm(.1,.25))}]};
 const done=await donor.importLibrary(donorPkg,'merge');
 assert.equal(done.audioImported,1);assert.equal(done.donorCount,1);
 assert.ok((await donorStore.get(donorRecord.id)).value.assetId==='asset:dr');
 // Actual Donor importer: second metadata write throws; first staged asset must roll back.
 const before=await donorStore.get('asset:dr');
 const damagedDonor={schemaVersion:1,
   presets:[{id:'donor-library:preset:bad',value:{id:'bad',version:'donor-library-v1',
     assetId:'asset:second',uncloneable:()=>true}}],
   workspaces:[],assets:[{id:'asset:second',value:donor.pack(pcm(.31,.41))}]};
 await assert.rejects(donor.importLibrary(damagedDonor,'merge'),/clone|function|abort/i);
 assert.equal(await donorStore.get('asset:second'),null,'Donor failure leaked new PCM');
 assert.equal(await donorStore.get('donor-library:preset:bad'),null,'Donor failure leaked preset');
 assert.equal((await donorStore.get('asset:dr')).value.monoSamples[0],before.value.monoSamples[0]);
 // Outgoing schema remains v1; binary representation still lossless.
 const exported=await donor.exportLibrary();
 assert.equal(exported.schemaVersion,1);
 assert.equal(exported.assets.length,1);
 assert.equal(exported.assets[0].value.monoSamples.__xensonarPortableBytes,1);
 console.log('P2 PASS: actual package importers, atomic abort, collision, merge/replace, repository ownership and shared PCM');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
