'use strict';
/** Regression: discarded P32/P33 display layers never reappear after glyph failure. */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('src/rooms/00_forge_rack_presentation.js','utf8')+'\n'+fs.readFileSync('src/rooms/00_empty_audio_p32.js','utf8');
const css=fs.readFileSync('styles/areas/040_xen-p9-m9-cockpit-canonical.css','utf8');
const effects=[],refs=[],resizeListeners=[],frames=new Map();let sequence=0,width=700,masks=8;
const parent={getBoundingClientRect:()=>({left:0,top:0})},button={style:{}};
const triangle={parentElement:button,getBoundingClientRect:()=>({left:200,top:5,width:50,height:40})};
const canvases=[];
const P={useRef(){const r={current:null};refs.push(r);return r;},useState(){return [null,()=>{}]},useEffect(fn){effects.push(fn)},createElement(tag,props,...children){
 if(props?.ref){if(tag==='canvas'){
  const c={width:0,height:0,parentElement:parent,closest(){return {}},getBoundingClientRect(){return {left:5,top:5,width,height:42}},getContext(){return {}}};
  props.ref.current=c;canvases.push(c);
 }else props.ref.current=triangle;}
 return {tag,props:props||{},children};}};
function createMask(letters){const ink=new Uint8Array(90),runs=Array.from({length:90},()=>new Float32Array([-0.2,0.2]));
 const coverage=new Float32Array(90),env=new Float32Array(90),top=new Float32Array(90),bottom=new Float32Array(90);
 for(let i=0;i<letters;i++)for(let j=0;j<4;j++)ink[i*10+j]=1;
 return {width:90,height:40,ink,runs,coverage,env,top,bottom};}
const wave={IDLE:{sweep:1},IDLE_CYCLE:4,buildTextMask(text){return createMask(text==='NO SIGNAL'?masks:7)},drawTrack(){}};
const listeners={},document={hidden:false,fonts:{ready:new Promise(()=>{})},querySelector(){return null},addEventListener(){},removeEventListener(){}};
const window={devicePixelRatio:1,matchMedia(){return {matches:false}},addEventListener(n,fn){listeners[n]=fn},removeEventListener(n){delete listeners[n]},getComputedStyle(el){return {visibility:el?.style?.visibility||'hidden'}}};
const ctx={P,__XenIdleWaveDonorP33:wave,document,window,performance:{now:()=>0},innerHeight:700,Math,Float32Array,Uint8Array,requestAnimationFrame(cb){const n=++sequence;frames.set(n,cb);return n;},cancelAnimationFrame(n){frames.delete(n)},setTimeout(){return 1},clearTimeout(){},ResizeObserver:class{constructor(cb){resizeListeners.push(cb)}observe(){}disconnect(){}},IntersectionObserver:class{constructor(){}observe(){}disconnect(){}}};
vm.createContext(ctx);
vm.runInContext(source+'\n__XenForgeNoAudioP32({onImport(){}});',ctx);
const step=(now)=>{const f=[...frames];frames.clear();for(const [,cb] of f)cb(now)};
const cleanup=effects[1]();
step(34);assert.equal(button.style.visibility,'visible','valid A glyph should show the replacement triangle');
masks=7;width=690;
resizeListeners.at(-1)();step(68);
assert.equal(button.style.visibility,'hidden','invalid remeasurement must retire previously visible A triangle');
assert.equal(button.style.width,'0px','invalid glyph must release stale button geometry');
masks=8;width=705;resizeListeners.at(-1)();step(102);
assert.equal(button.style.visibility,'visible','a recovered eight-glyph layout must restore the replacement A');
assert(!source.includes('xen-p32-wave-word'), 'old P32 SVG copy of text must not be generated');
assert(!css.includes('xen-p32-wave-word'),'dead styles for hidden first-stage SVG text must be removed');
assert(!/\.xen-p32-mirror-button\{[^}]*left:77%/.test(css),'obsolete hardcoded triangle offset should not remain');
assert(!/\.xen-p33-meter-label\{[^}]*space-between/.test(css),'obsolete meter alignment must not survive the later override');
assert(!source.includes("h('line',{x1:208,x2:208,y1:1,y2:33"),'do not paint bar-zero boundary twice');
cleanup();console.log('PASS compact first-contact UI, A-glyph resize failure, no discarded CSS/DOM layer');
