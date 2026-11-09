'use strict';
/* Render the actual P32 React element tree with a tiny no-effect host; no mock image. */
const vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('src/rooms/00_forge_rack_presentation.js','utf8')+'\n'+fs.readFileSync('src/rooms/00_empty_audio_p32.js','utf8');
const P={createElement:(type,props,...children)=>({type,props:props||{},children}),
 useState:val=>[val,()=>{}],useEffect:()=>{},useRef:()=>({current:null})};
const ctx={P,Math,Number,JSON,console};vm.createContext(ctx);vm.runInContext(code,ctx);
const tree=vm.runInContext('__XenForgeNoAudioP32({onImport:()=>{},disabled:false})',ctx);
function escape(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function serialize(el){if(el===null||el===undefined||el===false)return '';
 if(Array.isArray(el))return el.map(serialize).join('');
 if(typeof el!=='object')return escape(el);
 const attrs=Object.entries(el.props).filter(([k,v])=>!['ref','onClick','key'].includes(k)&&v!==undefined&&v!==null&&v!==false)
 .map(([k,v])=>{if(k==='className')k='class';if(k==='textAnchor')k='text-anchor';if(k==='dominantBaseline')k='dominant-baseline';if(k==='strokeWidth')k='stroke-width';if(k==='strokeLinecap')k='stroke-linecap';if(k==='strokeDasharray')k='stroke-dasharray';if(k==='fillRule')k='fill-rule';if(k==='style'){v=Object.entries(v).map(([a,b])=>a.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+b).join(';')}
 return ` ${k}="${escape(v)}"`}).join('');
 return '<'+el.type+attrs+'>'+el.children.map(serialize).join('')+'</'+el.type+'>';
}
process.stdout.write(serialize(tree));
