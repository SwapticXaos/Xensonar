'use strict';
// ROOM5-01: the Psychedelic Lab engine (xen-psylab-v1) and its pure helpers, without a browser.
// Stability under every factory patch and random settings, exact silence and sleep without notes,
// free tuning (EDO of any period, ratios, cents), deterministic offline script, no garbage per block.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const file=path.resolve(__dirname,'../src/post-oct/034-xen-room-psylab.js');const src=fs.readFileSync(file,'utf8');
function makeChunk(){const box={console,Math,JSON,Object,Array,Number,String,Float32Array,Float64Array,Uint8Array,Date,WeakMap,Map,
  P:{useEffect(){},useState(){},useMemo(){},useRef(){},useCallback(){}},u:{},localStorage:{getItem:()=>null,setItem(){}}};box.globalThis=box;vm.createContext(box);return{box,api:vm.runInContext(src,box)}}
const{api}=makeChunk();const T=api.__test;assert.equal(typeof api.XenPsyLabRoom,'function');
function makeProcessor(options,sr=44100){const scope={sampleRate:sr,currentFrame:0,Math,Float32Array,Float64Array,Uint8Array,Array,JSON};
  scope.AudioWorkletProcessor=class{constructor(){this.port={onmessage:null,postMessage(){throw Error('the engine must not post messages')}}}};
  scope.registerProcessor=(n,k)=>{scope.name=n;scope.K=k};vm.createContext(scope);vm.runInContext(T.moduleCode(),scope);assert.equal(scope.name,'xen-psylab-v1');
  const p=new scope.K({processorOptions:options});const F32=vm.runInContext('Float32Array',scope);const out=[[new F32(128),new F32(128)]];const noInputs=[];
  return{p,scope,out,block(){out[0][0].fill(0);out[0][1].fill(0);/* the browser hands in zeroed outputs */const r=p.process(noInputs,out);scope.currentFrame+=128;return r},send:m=>p.port.onmessage({data:m})}}
const stats=(e,blocks)=>{let peak=0,sum=0,finite=true;for(let b=0;b<blocks;b++){assert.equal(e.block(),true);for(const ch of e.out[0])for(let i=0;i<128;i++){const v=ch[i];if(!(v===v)||Math.abs(v)===Infinity)finite=false;const a=Math.abs(v);if(a>peak)peak=a;sum+=v*v}}return{peak,rms:Math.sqrt(sum/(blocks*256)),finite}};
// --- helpers ---
{for(const p of T.PARAMS){for(const t of[0,.13,.5,.87,1]){const v=T.fromUnit(p,t);assert(v>=p[3]-1e-9&&v<=p[4]+1e-9,p[1]);assert(Math.abs(T.toUnit(p,v)-t)<1e-6,p[1]+' slider mapping is invertible')}
  assert(p[5]>=p[3]&&p[5]<=p[4],p[1]+' default inside range')}
 assert.equal(new Set(T.PARAMS.map(p=>p[0])).size,T.PARAMS.length);
 const bad=T.sanitizePatch({name:7,root:-3,scale:'',params:['x',1e9,NaN]});assert.equal(bad.root,undefined,'an invalid legacy root is dropped');assert(bad.params.every((v,i)=>v>=T.RANGES.lo[i]&&v<=T.RANGES.hi[i]));
 // patches saved by the first version keep their scale / root untouched (never deleted), they are just not used any more
 const legacy=T.sanitizePatch({id:'user:1',name:'old',scale:'1/1 9/8 5/4',root:196,params:T.RANGES.def});assert.equal(legacy.scale,'1/1 9/8 5/4');assert.equal(legacy.root,196);
 assert(/instruments/.test(T.STORE_KEY)&&/^xensonar[.:-]/.test(T.STORE_KEY),'storage key lands in the Package Station instrument category');
 const m=T.sanitizeMetro({bpm:'x',beats:-3,vol:7});assert.equal(m.bpm,108);assert.equal(m.beats,.5);assert.equal(m.vol,1);assert.equal(JSON.stringify(T.sanitizeMetro({bpm:'140.5',beats:7,vol:.25})),JSON.stringify({bpm:140.5,beats:7,vol:.25}));
 for(const f of T.FACTORY)assert(typeof f.grid==='string'&&f.grid.length,f.name+' has a grid suggestion');}
// --- silence and sleep ---
{const e=makeProcessor({});const s=stats(e,700);assert.equal(s.peak,0,'no notes: exact silence');assert(e.p.quiet>=e.p.sleepBlocks,'engine sleeps');}
// --- every factory patch: sounds, stays finite and bounded, falls silent and sleeps after release ---
assert(T.FACTORY.length>=8);
for(const patch of T.FACTORY){const root=220;const e=makeProcessor({params:patch.params,res:[110,220,330,440,660]});
 e.send({t:'on',id:1,hz:root,vel:1});e.send({t:'on',id:2,hz:root*Math.pow(2,5/12),vel:.8});
 const on=stats(e,500);assert(on.finite,patch.name+' finite');assert(on.rms>.004,patch.name+' is audible (rms '+on.rms+')');assert(on.peak<=1.0001,patch.name+' bounded (peak '+on.peak+')');
 e.send({t:'bend',id:1,hz:root*1.5});e.send({t:'p',i:36,v:99});assert(e.p.target[36]<=1,'parameters are clamped inside the engine');
 // shorten the tail (release, echo feedback) so the sleep check stays fast; the sleep logic itself is patch independent
 e.send({t:'p',i:17,v:.05});e.send({t:'p',i:22,v:.2});e.send({t:'p',i:27,v:20});e.send({t:'alloff'});let slept=false;for(let k=0;k<40&&!slept;k++){const tail=stats(e,345);assert(tail.finite);if(e.p.active===0&&e.p.quiet>=e.p.sleepBlocks)slept=true}
 assert(slept,patch.name+' falls silent and sleeps after release');assert.equal(stats(e,20).peak,0);
 e.send({t:'on',id:9,hz:root,vel:1});assert(stats(e,200).rms>.001,patch.name+' wakes up again');}
// --- fuzz: random settings incl. extremes never produce non-finite or runaway output ---
{let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};let worst=0;
 for(let round=0;round<45;round++){const params=T.RANGES.def.slice();for(const p of T.PARAMS)params[p[0]]=rnd()<.25?(rnd()<.5?p[3]:p[4]):T.fromUnit(p,rnd());
  const e=makeProcessor({params,res:[55,110*rnd()+60,440,1760,7000]},round%3===0?96000:round%3===1?48000:44100);
  for(let v=0;v<8;v++)e.send({t:'on',id:v+1,hz:20+rnd()*rnd()*9000,vel:rnd()});
  const s=stats(e,170);assert(s.finite,'fuzz '+round+' finite');assert(s.peak<=1.0001,'fuzz '+round+' bounded: '+s.peak);if(s.peak>worst)worst=s.peak;
  for(let k=0;k<12;k++){const p=T.PARAMS[(rnd()*T.PARAMS.length)|0];e.send({t:'p',i:p[0],v:T.fromUnit(p,rnd())})}e.send({t:'p',i:3,v:NaN});e.send({t:'on',id:1,hz:NaN});e.send({t:'res',hz:[NaN,-1,1e9,330]});
  const s2=stats(e,80);assert(s2.finite&&s2.peak<=1.0001,'fuzz '+round+' after live changes')}
 assert(worst>.05,'fuzz actually made sound');}
// --- more notes than voices: the oldest released voice is reused, never more than six ---
{const e=makeProcessor({});for(let i=0;i<20;i++)e.send({t:'on',id:i+1,hz:200+i*10});assert.equal(e.p.active,6);stats(e,10);e.send({t:'off',id:20});stats(e,2);assert.equal(e.p.vGate.reduce((a,b)=>a+b,0),5)}
// --- offline script (bounce) is deterministic and needs no messages ---
{const run=()=>{const e=makeProcessor({params:T.FACTORY[0].params,res:[220],script:[{f:0,m:{t:'on',id:1,hz:220,vel:1}},{f:22050,m:{t:'off',id:1}}]});const chunks=[];for(let b=0;b<300;b++){e.block();chunks.push(Buffer.from(new Uint8Array(e.out[0][0].buffer.slice(0))))}return Buffer.concat(chunks)};
 const a=run(),b=run();assert(a.some(x=>x!==0));assert(a.equals(b),'same script → same PCM');}
// --- no allocation per block once warm (measured in a child process with a large young generation) ---
if(process.argv[2]==='--alloc'){const e=makeProcessor({params:T.FACTORY[3].params,res:[110,220,330,440]});for(let v=0;v<6;v++)e.send({t:'on',id:v+1,hz:110*(v+1)});
 for(let b=0;b<30000;b++)e.block();const before=process.memoryUsage().heapUsed;const N=30000;for(let b=0;b<N;b++)e.block();const per=(process.memoryUsage().heapUsed-before)/N;
 console.log('ALLOC '+per.toFixed(2));process.exit(0)}
{const outText=execFileSync(process.execPath,['--max-semi-space-size=256',__filename,'--alloc'],{encoding:'utf8'});const per=Number(/ALLOC (-?[\d.]+)/.exec(outText)[1]);
 // Per-sample boxing would show as kilobytes per block. A few bytes are noise of this harness (vm context, heap statistics);
 // the authoritative check is the audio-thread GC count in tools/probes/room5_load_probe.js (real browser).
 assert(per<64,'process() must not allocate per block (measured '+per+' bytes/block)');console.log('PASS ROOM5-01 psylab engine',{patches:T.FACTORY.length,params:T.PARAMS.length,bytesPerBlock:per})}
