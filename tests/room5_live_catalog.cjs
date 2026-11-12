'use strict';
// ROOM5-10: Psy Lab rubric of the Live Room sound menus. The eager list of factory names must equal the chunk's FACTORY patches (the menu is built without
// loading the chunk); the rubric sits between Entrophon and Samples; only the Wave Starter / Keyboard lanes get it; a Psy Lab lane never runs Hold patterns.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');
const store={};
const mk=()=>{const box={console,Math,JSON,Object,Array,Number,String,Float32Array,Float64Array,Uint8Array,Date,WeakMap,Map,Set,P:{},u:{},localStorage:{getItem:k=>store[k]??null,setItem(k,v){store[k]=String(v)}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){}};box.globalThis=box;box.window={addEventListener(){}};return vm.createContext(box)};
// chunk
const chunkBox=mk();const Chunk=vm.runInContext(read('src/post-oct/034-xen-room-psylab.js'),chunkBox);
// eager catalog (the file also defines React components; only the two owners at the top are used here)
const box=mk();box.__xenLoadDeferred=kind=>{assert.equal(kind,'psylab');box.__loads=(box.__loads||0)+1;return Chunk};
vm.runInContext(read('src/mix/02_performance_catalog.js')+';globalThis.__out={psy:__XenPsyLab,cat:__XenPerformanceCatalog}',box);
const {psy,cat}=box.__out;
assert.deepEqual(Array.from(psy.FACTORY_NAMES),Array.from(Chunk.LiveHost.factoryNames()),'eager factory names = chunk FACTORY patches');
for(const e of psy.entries())assert(Chunk.LiveHost.find(e.value),'every listed id resolves in the chunk: '+e.value);
assert.equal(box.__loads||0,0,'listing does not load the chunk');
// user patches from Room V are listed
store['xensonar.psylab.instruments.v1']=JSON.stringify({format:'xensonar.psylab',version:1,working:{id:'w',name:'w',params:[]},user:[{id:'user:abc',name:'My Glide',params:[]}]});
const realNow=Date.now;Date.now=()=>realNow()+5000;// past the 1 s read throttle
assert(psy.entries().some(e=>e.value==='psylab:user:abc'&&e.label==='My Glide'),'saved Room V patches are listed');Date.now=realNow;
// rubric order and lanes
const entries=[{value:'tape_halo',label:'Tape'},{value:'nodal:x',label:'N'},{value:'entrophon:a',label:'E'},{value:'sample:1',label:'S'}];
const labels=cat.groups(entries,true,[]).map(g=>g.label);
assert.deepEqual(Array.from(labels),['Classic','Nodal','Entrophon','Psy Lab','Samples'],'Psy Lab below Entrophon, above Samples');
const psyGroup=cat.groups(entries,true,[]).find(g=>g.label==='Psy Lab');assert(psyGroup.entries.length>=9&&psyGroup.entries.every(e=>e.value.startsWith('psylab:')));
assert(!cat.groups(entries,false,[]).some(g=>g.label==='Psy Lab'),'the particle lane has no Psy Lab rubric');
assert.equal(cat.canPan('wave','psylab:factory:Liquid Bell'),false);
// Hold gate: a Psy Lab lane is never "Thunder on"; the other lane is untouched
const html=read('src/audio/05_live_voice_runtime.js');const i=html.indexOf('const __xenPsyLabLane='),j=html.indexOf('\n',html.indexOf('function __xenThunderLane('));
const g=vm.runInContext(html.slice(i,j)+';({lane:__xenThunderLane,psy:__xenPsyLabLane})',vm.createContext({}));
const p1={thunderModeEnabled:true,thunderKeyboardEnabled:true,waveStarterHoldSoundPreset:'psylab:factory:Liquid Bell',keyboardHoldSoundPreset:'entrophon'};
assert.equal(g.lane(p1,'wellenstart'),false);assert.equal(g.lane(p1,'klaviatur'),true);
const p2={thunderModeEnabled:true,waveStarterHoldSoundPreset:'tape_halo',keyboardHoldSoundPreset:'psylab:user:abc'};
assert.equal(g.lane(p2,'wellenstart'),true);assert.equal(g.lane(p2,'klaviatur'),false);
console.log('PASS ROOM5-10 Psy Lab catalog (names in sync, rubric order, lanes, Hold gate)');
