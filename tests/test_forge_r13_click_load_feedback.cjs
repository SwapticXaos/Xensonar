'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const lab=fs.readFileSync('src/rooms/lab.js','utf8');
const featured=lab.match(/const __forgeFeaturedStampIds=\[([\s\S]*?)\];/)?.[0];
const start=lab.indexOf('function JHe('),end=lab.indexOf('function __createForgeMicCapture(',start);
const pix=lab.slice(lab.indexOf('function __forgeStampContentRect('),lab.indexOf('function __ForgeStampPreviewCanvas('));
assert(start>0&&end>start);
const calls=[];let hooks=[],cursor=0;
const P={
 createElement:(type,props,...children)=>({type,props:{...(props||{}),...(children.length?{children:children.length===1?children[0]:children}:{})}}),
 useState(initial){const index=cursor++;if(!(index in hooks))hooks[index]=initial;return [hooks[index],value=>{hooks[index]=typeof value==='function'?value(hooks[index]):value;}]},
 useEffect(){},useRef:(val)=>({current:val}),useMemo:(fn)=>fn(),
};
const stamps=['glass-orb','shimmer-rain','ee-beam','gamelan-plate'].map(id=>({
 id,name:id,description:'valid preset',tags:[],category:'texture',defaultSize:18,defaultIntensity:.5,
 stamp:{width:1,height:1,data:new Float32Array([.5]),grainData:new Float32Array([.4])}
}));
const store={setActiveTool:value=>calls.push(['tool',value]),updateToolSettings:value=>calls.push(['settings',value]),
 setStampData:value=>calls.push(['stamp',value]),resetStampTransform:()=>calls.push(['reset']),setStampPhase:value=>calls.push(['phase',value])};
const sandbox={P,Wb:stamps,__forgeRevisedStampPresetsP31:[],pe:{getState:()=>store},dB:()=>({entries:[]}),
 __XenStampAtlas2026:{refineSustains:()=>[],loadVariants:()=>Promise.resolve([])},
 __ForgeStampPreviewCanvas:function Preview(){},__CustomStampLibrary:function Custom(){},
 __XenStampFigureAudition:{create:()=>({})},__forgeObserveIntakeVisibility:()=>()=>{},
 console,Float32Array};
vm.createContext(sandbox);vm.runInContext(featured+'\n'+pix+'\n'+lab.slice(start,end)+'\nthis.createGallery=JHe;',sandbox);
const flat=(root,out=[])=>{if(Array.isArray(root)){root.forEach(n=>flat(n,out));return out;}if(!root||typeof root!=='object')return out;out.push(root);flat(root.props?.children,out);return out};
const render=()=>{cursor=0;return flat(sandbox.createGallery({}));};
let dom=render();
let glass=dom.find(n=>n.props?.['data-stamp-preset']==='glass-orb');
assert(glass,'Glass Orb rendered in Curated');
assert(!dom.some(n=>n.props?.className==='xen-stamp-loaded-check'),'unloaded presets have no checkmark');
glass.props.onClick();
assert.deepEqual(calls.map(x=>x[0]),['tool','settings','stamp','reset','phase'],'click must actually write selection before displaying loaded state');
dom=render();glass=dom.find(n=>n.props?.['data-stamp-preset']==='glass-orb');
assert.equal(glass.props['aria-pressed'],true);
const badge=flat(glass).find(n=>n.props?.className==='xen-stamp-loaded-check');
assert(badge,'loaded Glass Orb has a green check');
assert(flat(badge).some(n=>n.props?.className==='xen-stamp-check-stroke'),'loaded check is drawn as SVG stroke');
const shimmer=dom.find(n=>n.props?.['data-stamp-preset']==='shimmer-rain');
assert.equal(shimmer.props['aria-pressed'],false);assert(!flat(shimmer).some(n=>n.props?.className==='xen-stamp-loaded-check'));
shimmer.props.onClick();dom=render();
assert(!flat(dom.find(n=>n.props?.['data-stamp-preset']==='glass-orb')).some(n=>n.props?.className==='xen-stamp-loaded-check'));
assert(flat(dom.find(n=>n.props?.['data-stamp-preset']==='shimmer-rain')).some(n=>n.props?.className==='xen-stamp-loaded-check'));
console.log('PASS R13 real gallery component: click sets stamp first; loaded check follows and switches with selection');
