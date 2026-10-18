'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/forge/ui/02_donor_routing_and_hearing.js'),'utf8');
const section=source.slice(source.indexOf('function __F34LibrarySmallView('),source.indexOf('function jHe('));
const calls=[];
const mock={
 P:{useState:(()=>{let i=0;const vals=['id-beta',{id:'id-beta',snapshot:{spectralSnapshot:[0.5]}},false,''];return value=>[vals[i++]??value,()=>{}]})(),useMemo:fn=>fn(),useEffect:()=>{},useRef:()=>({current:null})},
 u:{jsx:(name,props)=>({name,props}),jsxs:(name,props)=>({name,props})},
 cB:()=>[{id:'id-alpha',name:'A figure',updatedAt:12},{id:'id-beta',name:'B figure',updatedAt:20}],
 pe:Object.assign(()=>((state)=>null),{getState:()=>({setCarrierIntegralSelection:p=>calls.push(['selection',p]),setCarrierIntegralSynthLab:p=>calls.push(['synth',p]),setCarrierIntegralHarmonicXplore:p=>calls.push(['harmonic',p])})}),
 jd:async id=>{assert.equal(id,'id-beta');return {spectralSnapshot:new Float32Array([0,1]),carrierIntegralSelection:{machineId:'emilia'},carrierIntegralSynthLab:{presetId:'foo'},carrierIntegralHarmonicXplore:{profileId:'x'}}},
 dHe:({storedSelection,storedSynthLab,storedHarmonicXplore})=>({selectionPatch:storedSelection,synthLabPatch:storedSynthLab,harmonicXplorePatch:storedHarmonicXplore})
};
mock.pe=()=>fn=>{if(typeof fn!=='function')throw Error('selector required');return x=>{}};
mock.pe.getState=()=>({setCarrierIntegralSelection:p=>calls.push(['selection',p]),setCarrierIntegralSynthLab:p=>calls.push(['synth',p]),setCarrierIntegralHarmonicXplore:p=>calls.push(['harmonic',p])});
const loadProjectSnapshot=x=>calls.push(['load',x]);
mock.pe=Object.assign(sel=>loadProjectSnapshot,{getState:mock.pe.getState});
mock.P.useState=(()=>{let i=0;const vals=['id-beta',{id:'id-beta',snapshot:{spectralSnapshot:[0.5]}},false,''];return v=>[vals[i++]??v,()=>{}]})();
vm.createContext(mock);vm.runInContext(section,mock);
function traverse(el,pred){if(!el)return null;if(Array.isArray(el)){for(const v of el){const r=traverse(v,pred);if(r)return r}return null}if(typeof el!=='object')return null;if(pred(el))return el;return traverse(el.props?.children,pred)}
(async()=>{const tree=mock.__F34CompactLibrary({onClose:()=>calls.push(['close'])});
 const button=traverse(tree,el=>el.props?.className==='f34-library-load');assert(button,'load action must exist');button.props.onClick(); await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls.map(x=>x[0]),['load','selection','synth','harmonic','close']);
 assert.equal(calls[0][1].carrierIntegralSelection.machineId,'emilia');
 console.log('PASS compact library loads persisted snapshot + preserved machine configuration, then closes');
})().catch(e=>{console.error(e);process.exit(1)});
