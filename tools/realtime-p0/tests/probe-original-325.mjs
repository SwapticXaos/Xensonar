// Run against the unchanged incoming Sol 325, never against the repaired core.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2] || 'ORIGINAL_SOL_325/tools/realtime-p0');
const f=await import(pathToFileURL(path.join(root,'web/p0-fixtures.js')));
const bytes=fs.readFileSync(path.join(root,'artifacts/p0_core.wasm'));
const results=[];
async function core(){const {instance}=await WebAssembly.instantiate(bytes,{});const e=instance.exports;e.p0_init(48000);const a=new Float32Array(e.memory.buffer,e.p0_sine_table_ptr(),4096);a.forEach((_,i)=>a[i]=Math.sin(2*Math.PI*i/4096));e.p0_arm(1,960000n);return e;}
function enqueue(e,id,start,deadline,note){let r=e.p0_begin_attack_group(1,BigInt(id),1,BigInt(start),BigInt(deadline));if(r!==1)return r;let n=note;r=e.p0_set_attack_note(0,n.tokenSlot,n.tokenGeneration,n.kind,n.frequencyHz,n.peak,n.b0,n.b1,n.b2,n.a1,n.a2,n.attackFrames,n.releaseStartFrames,n.stopFrames,n.releaseCoef);return r===1?e.p0_commit_attack_group():r;}
{
const e=await core();e.p0_panic(1,240);results.push({id:'A01',finding:'closed owner epoch can rearm unchanged',actual:e.p0_arm(1,960000n),required:'reject'});
}
{
const e=await core(),n=f.makeLegacyNote(48000,1,1,220);enqueue(e,1,256,5000,n);enqueue(e,1,256,5000,n);for(let i=0;i<8;i++)e.p0_render(128);results.push({id:'A02',finding:'duplicate token starts twice',actual:Number(e.p0_started_external()),required:1});
}
{
const e=await core();for(let i=0;i<16;i++)enqueue(e,i+1,48000,52000,f.makeLegacyNote(48000,i+1,1,220));enqueue(e,17,128,1000,f.makeLegacyNote(48000,17,1,330));for(let i=0;i<16;i++)e.p0_render(128);results.push({id:'A03',finding:'16 future entries hide due attack',actual:Number(e.p0_started_external()),required:1});
}
{
const e=await core();enqueue(e,1,0,5000,f.makeGatedNote(48000,1,1,220));for(let i=0;i<10;i++)e.p0_render(128);for(let i=0;i<40;i++){e.p0_release(1,1,1,1440);e.p0_render(128);}results.push({id:'A04',finding:'duplicate releases repeatedly restart fade',actual:e.p0_active_voices(),required:0});
}
{
const e=await core();e.p0_panic(1,240);e.p0_set_frame(5000n);e.p0_arm(2,960000n);let n=f.makeLegacyNote(48000,1,1,220);e.p0_begin_attack_group(2,1n,1,776n,5096n);e.p0_set_attack_note(0,n.tokenSlot,n.tokenGeneration,n.kind,n.frequencyHz,n.peak,n.b0,n.b1,n.b2,n.a1,n.a2,n.attackFrames,n.releaseStartFrames,n.stopFrames,n.releaseCoef);e.p0_commit_attack_group();e.p0_render(128);let a=new Float32Array(e.memory.buffer,e.p0_output_ptr(),256);let first=-1;for(let i=0;i<128;i++)if(Math.abs(a[2*i])>1e-12){first=5000+i;break;}results.push({id:'A05',finding:'late accepted tone loses 323 safe-start lead',actualFirstNonzeroFrame:first,requiredEarliestFrame:5240});
}
{
const e=await core();results.push({id:'A06',finding:'nonfinite state admitted',actual:e.p0_set_state(1,1n,Infinity,1),required:'reject'});
}
const main=fs.readFileSync(path.join(root,'web/main.js'),'utf8');const code=main.slice(main.indexOf('class P0BoundedClient'),main.indexOf('\nlet live ='))+'\nglobalThis.Client=P0BoundedClient;';const scope=vm.createContext({});vm.runInContext(code,scope);
{
const posted=[],c=new scope.Client({postMessage:m=>posted.push(m)},()=>{});for(let i=0;i<17;i++)c.postSafety({kind:'release',tokenSlot:i,tokenGeneration:1});results.push({id:'A07',finding:'panic rejected behind 17 releases',actual:c.postSafety({kind:'panic'}),required:true});
}
{
const posted=[],c=new scope.Client({postMessage:m=>posted.push(m)},()=>{});for(let i=0;i<4;i++)c.postNormal({kind:'attack-group',id:i});c.handle({kind:'receipt',op:'attack-group'});c.handle({kind:'receipt',op:'attack-group'});results.push({id:'A08',finding:'receipts have no packet identity; duplicates free credits',postedAfterTwoIndistinguishableReceipts:posted.length,required:'exact id/epoch match'});
}
results.push({id:'A09',finding:'browser overall verdict omits computed audio thresholds and silence',evidenceClass:'source',verdictExpression:main.slice(main.indexOf('result.pass = Boolean('),main.indexOf('window.__P0_RESULT__ = result;'))});

console.log(JSON.stringify(results,null,2));
