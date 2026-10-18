/* Performance shortcuts read the canonical catalog. History stores IDs only. */
const __XenPerformanceCatalog=(()=>{
 const key='xensonar-performance-recent-sounds-v1',lanes=['particle','wave','keyboard'],listeners=new Set();
 const valid=id=>typeof id==='string'&&id.length>0&&id.length<240;
 function read(){let saved;try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}return Object.freeze(Object.fromEntries(lanes.map(lane=>[lane,Object.freeze([...new Set(Array.isArray(saved?.[lane])?saved[lane].filter(valid):[])].slice(0,7))])))}
 let state=read();
 function publish(next){if(lanes.every(lane=>next[lane].join('\0')===state[lane].join('\0')))return;state=next;for(const fn of listeners)fn()}
 function remember(lane,id){if(!lanes.includes(lane)||!valid(id)||state[lane][0]===id)return;publish(Object.freeze({...state,[lane]:Object.freeze([id,...state[lane].filter(x=>x!==id)].slice(0,7))}));try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null)publish(read())});
 function groups(entries=[],includeCurrent=false,latest=[]){
  const catalog=new Map();for(const item of entries)if(valid(item?.value)&&!catalog.has(item.value))catalog.set(item.value,item);
  if(includeCurrent&&!catalog.has('entrophon'))catalog.set('entrophon',{value:'entrophon',label:'Entrophon · Current'});
  const family=item=>item.groupId==='samples'||item.value.startsWith('sample:')?'Samples':item.value.startsWith('nodal:')?'Nodal':item.value==='entrophon'||item.value.startsWith('entrophon:')?'Entrophon':'Classic';
  const result=[],recent=[...new Set(latest)].map(id=>catalog.get(id)).filter(Boolean).slice(0,7);
  if(recent.length)result.push({label:'Latest',entries:recent});
  for(const label of ['Classic','Nodal','Entrophon','Samples']){const list=[...catalog.values()].filter(x=>family(x)===label).sort((a,b)=>String(a.label).localeCompare(String(b.label)));if(list.length)result.push({label,entries:list})}return result;
 }
 // C11 Entrophon and Wave main outputs currently aggregate voices. Do not
 // route that whole mix to the last triggering particle's private panner.
 function canPan(lane,id){if(typeof id!=='string'||id==='entrophon'||id.startsWith('entrophon:'))return false;return id.startsWith('nodal:')||id.startsWith('sample:')||lane==='particle'&&!(typeof Hd==='function'&&Hd())}
 return {key,snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),remember,groups,canPan};
})();

function __PerformancePan({kind,label,disabled=false}){
 const saved=P.useSyncExternalStore(__XenPan.subscribe,__XenPan.snapshot,__XenPan.snapshot),value=saved[kind]??0;
 return u.jsxs('label',{className:'xen-performance-pan',children:[u.jsxs('span',{children:[label+' Pan',u.jsx('output',{children:disabled?'—':value===0?'C':(value<0?'L ':'R ')+Math.round(Math.abs(value)*100)})]}),
 u.jsx('input',{type:'range',min:-1,max:1,step:.01,value,disabled,'aria-label':label+' Pan',title:disabled?'Pan is available for Nodal, samples and classic particles.': 'Double-click to centre',onChange:e=>__XenPan.set(kind,Number(e.target.value)),onDoubleClick:()=>!disabled&&__XenPan.set(kind,0)})]});
}
