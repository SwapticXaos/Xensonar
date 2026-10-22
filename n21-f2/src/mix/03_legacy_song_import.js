/* P7.24 Songs stay in their original store. Import is an explicit copy of one
   saved/draft Part; hierarchy and provenance are never flattened or overwritten. */
function __xenLegacySongParts(storage){
 const raw=storage.getItem('xensonar.song-projects.v1');
 if(!raw)return {raw:null,parts:[]};
 if(raw.length>4*1024*1024)throw Error('P7.24 Song library exceeds the import limit.');
 const library=JSON.parse(raw);
 if(library?.version!==1||!Array.isArray(library.saved)||!Array.isArray(library.drafts))throw Error('Invalid P7.24 Song library. Export the original data before repairing it.');
 const parts=[];
 for(const variant of ['saved','drafts'])for(const song of library[variant]){
  if(!song||typeof song.id!=='string'||typeof song.name!=='string'||!Array.isArray(song.parts))throw Error('Invalid P7.24 song.');
  for(const part of song.parts){
   if(!part||typeof part.id!=='string'||typeof part.name!=='string'||!Array.isArray(part.items))throw Error('Invalid P7.24 song part.');
   parts.push({origin:{store:'xensonar.song-projects.v1',variant,songId:song.id,partId:part.id},
    name:song.name+' · '+part.name,items:part.items,
    label:song.name+' / '+part.name+' · '+(variant==='saved'?'Saved':'Draft')+' · '+part.items.length+' references'});
  }
 }
 return {raw,parts};
}
function __XenLegacySongImport(){
 const [open,setOpen]=P.useState(false),[choice,setChoice]=P.useState('0'),[message,setMessage]=P.useState('');
 let library={raw:null,parts:[]},error='';
 try{library=__xenLegacySongParts(localStorage)}catch(failure){error=failure.message;library.raw=localStorage.getItem('xensonar.song-projects.v1')}
 const selectRef=P.useRef(null),trigger=P.useRef(null);
 P.useEffect(()=>{if(open)selectRef.current?.focus();},[open]);
 const selected=library.parts[Number(choice)];
 const exportOriginal=()=>{
  const raw=localStorage.getItem('xensonar.song-projects.v1');if(!raw)return;
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='XenSonar_P7_24_Original_Songs.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
 };
 return u.jsxs(P.Fragment,{children:[u.jsx('button',{type:'button',ref:trigger,onClick:()=>setOpen(true),children:'P7.24 Songs'}),open&&ao.createPortal(u.jsx('div',{className:'xen-grid-bass-modal',onPointerDown:e=>e.stopPropagation(),onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape')setOpen(false)},children:u.jsxs('section',{className:'xen-grid-bass-dialog',role:'dialog','aria-modal':true,'aria-label':'Import P7.24 Songs',children:[
  u.jsxs('header',{children:[u.jsx('strong',{children:'P7.24 Songs · import a Part'}),u.jsx('button',{type:'button',onClick:()=>setOpen(false),'aria-label':'Close P7.24 Songs',children:'×'})]}),
  u.jsx('p',{children:'Choose a saved or draft Part to copy into a Session. The original Songs and Parts stay unchanged.'}),
  u.jsx('select',{'aria-label':'P7.24 Song and Part',ref:selectRef,value:choice,onChange:e=>setChoice(e.target.value),children:library.parts.map((part,index)=>u.jsx('option',{value:String(index),children:part.label},JSON.stringify(part.origin)))}),
  u.jsx('p',{role:'status',children:error||message||(!library.parts.length?'No P7.24 Songs found.':library.parts.length+' saved/draft Parts available.')}),
  u.jsxs('footer',{children:[u.jsx('button',{type:'button',disabled:!library.raw,onClick:exportOriginal,children:'Export original JSON'}),u.jsx('button',{type:'button',disabled:!selected||!!error,onClick:()=>{const ok=__XenMetaSessions.importLegacyPart(selected);setMessage(ok?'Part copied into the Session editor. Engage when ready.':__XenMetaSessions.snapshot().error)},children:'Import selected Part'})]})
 ]})}),document.body)]});
}
