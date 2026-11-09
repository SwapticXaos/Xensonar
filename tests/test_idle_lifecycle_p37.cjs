'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const {read}=require('./p37_test_tools.cjs');
const canvas=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
function exercise(view){
 const effects=[],frames=new Map(),events=new Map(),docEvents=new Map(),refs=[],canvases=[];
 let next=1,reads=0,observer=null,resize=null;
 const parent={getBoundingClientRect:()=>({left:0,top:0})},button={style:{}},root={};
 const mirror={parentElement:button,getBoundingClientRect:()=>({left:0,top:0,width:30,height:50})};
 const P={useRef:()=>{const r={current:null};refs.push(r);return r;},useState:()=>[null,()=>{}],useEffect:fn=>effects.push(fn),
 createElement:(tag,props,...children)=>{if(props?.ref){
  if(tag==='canvas'){
   const c=canvas.createCanvas(1,1),i=canvases.length;c.getBoundingClientRect=()=>{reads++;return {width:700+i*100,height:88+i*30,left:0,top:0};};
   c.parentElement=parent;c.closest=()=>root;props.ref.current=c;canvases.push(c);
  }else props.ref.current=mirror;
 }return {tag,props,children};}};
 const document={hidden:false,createElement:()=>canvas.createCanvas(1,1),addEventListener:(n,f)=>docEvents.set(n,f),removeEventListener:n=>docEvents.delete(n)};
 const window={devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const ctx={P,window,document,performance:{now:()=>0},console,Float32Array,Uint8Array,Math,Object,Array,Map,Set,Path2D:canvas.Path2D,
  requestAnimationFrame:f=>{const n=next++;frames.set(n,f);return n;},cancelAnimationFrame:n=>frames.delete(n),
  ResizeObserver:class{constructor(cb){resize=cb;}observe(){}disconnect(){}},IntersectionObserver:class{constructor(cb){observer=cb;}observe(){}disconnect(){}}};
 vm.createContext(ctx);vm.runInContext(read('src/rooms/00_idle_wave_donor_p33.js')+'\n'+read('src/rooms/00_forge_rack_presentation.js')+'\n'+view+'\n__XenForgeNoAudioP32({onImport(){}});',ctx);
 const cleanup=effects[1]();const tick=now=>{for(const [id,fn]of [...frames]){frames.delete(id);fn(now);}};
 for(let i=0;i<60;i++)tick(i*34);
 const hashes=canvases.map(c=>crypto.createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex'));
 const steadyReads=reads;
 if(observer){observer([{isIntersecting:false}]);assert.equal(frames.size,0,'offscreen stops scheduling');observer([{isIntersecting:true}]);assert.equal(frames.size,1,'visible resumes once');tick(2200);}
 if(docEvents.has('visibilitychange')){document.hidden=true;docEvents.get('visibilitychange')();assert.equal(frames.size,0,'background stops RAF');document.hidden=false;docEvents.get('visibilitychange')();assert.equal(frames.size,1);}
 cleanup();assert.equal(frames.size,0);assert.equal(events.size,0);assert.equal(docEvents.size,0);
 return {hashes,steadyReads};
}
const previous=require('node:zlib').gunzipSync(fs.readFileSync(require('node:path').join(__dirname,'fixtures/p36_empty_audio.js.gz'))).toString('utf8');
const old=exercise(previous),now=exercise(read('src/rooms/00_empty_audio_p32.js'));
assert.deepEqual(now.hashes,old.hashes,'same original canvas pixels at the same times/sizes');assert(now.steadyReads<old.steadyReads/10);
console.log('P37 IDLE PASS:',JSON.stringify({oldLayoutReads:old.steadyReads,newLayoutReads:now.steadyReads,pixels:'identical',hidden:'zero pending frames',cleanup:'complete'}));
