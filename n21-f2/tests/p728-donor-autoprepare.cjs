'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/forge_and_melodic/10_audition_and_persistence.js','utf8');
function extract(name){const start=source.indexOf(`async function ${name}(`);assert(start>=0,name);const next=source.indexOf('async function __f333RenderCurrent(',start);assert(next>start);return source.slice(start,next)}
// A donor chosen as the listening mode must prepare lazily, not reject Play.
async function run(){let prepared=0,selected=false,route='donor-pending',played=false,notice=[];let epoch=0;
 const current={sourceAsset:{id:'audio'},renderVersion:23,materialExport:{bars:1,bpm:120,beatsPerBar:4}};
 const scope={__f333Route:()=>route,__f3562EnsureDonor:async()=>{prepared++;selected=true;route='donor';return{source:'mask-analyzed'}},Vt:{selectDonor:()=>selected},__f333Epoch:epoch,pe:{getState:()=>current},__ForgeNavigatorSample:{snapshot:()=>({previewBusy:true,message:''}),current:()=>({}),update:v=>notice.push(v.message)},Zp:()=>1,KO:async()=>({foo:'PCM'}),__F352Runtime:{render:()=>{}},xt:{}};
 vm.createContext(scope);vm.runInContext(extract('__f333RenderCurrentRaw'),scope);
 const out=await scope.__f333RenderCurrentRaw(current);
 assert.equal(out.route,'donor');assert.equal(prepared,1);assert(notice.some(v=>v?.toLowerCase().includes('donor')),'progress must be visible to navigator user');
 route='donor';prepared=0;selected=true;notice=[];
 const out2=await scope.__f333RenderCurrentRaw(current);assert.equal(prepared,0,'valid cache/prepared donor must bypass extraction');assert.equal(out2.route,'donor');
 console.log('PASS P7.28 donor auto-prepare and prepared-cache priority');}
run().catch(e=>{console.error(e);process.exitCode=1});
