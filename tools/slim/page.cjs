'use strict';
/* Builds the page in memory exactly like tools/build.py and remembers which source file every character comes from. */
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const SEP='⁣';
function load(){
 const man=JSON.parse(fs.readFileSync(path.join(ROOT,'source-manifest.json'),'utf8'));
 const tpl=fs.readFileSync(path.join(ROOT,man.template),'utf8');
 const sections=new Map(man.sources.map(s=>[s.id,s.files]));
 const pieces=[];let out='';
 const re=new RegExp(SEP+'XEN-SECTION:([^'+SEP+']+)'+SEP,'g');let last=0,m;
 const push=(file,text)=>{pieces.push({file,start:out.length,end:out.length+text.length});out+=text};
 while((m=re.exec(tpl))){push(null,tpl.slice(last,m.index));for(const f of sections.get(m[1]))push(f,fs.readFileSync(path.join(ROOT,f),'utf8'));last=m.index+m[0].length}
 push(null,tpl.slice(last));
 const fileAt=pos=>{let lo=0,hi=pieces.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(pieces[mid].start<=pos)lo=mid;else hi=mid-1}return pieces[lo]};
 const blocks=[];const sre=/<script\b([^>]*)>/gi;
 while((m=sre.exec(out))){const start=m.index+m[0].length,e=out.slice(start).search(/<\/script\s*>/i);if(e<0)break;
  const attrs=m[1],type=(attrs.match(/type="([^"]*)"/)||[])[1]||'';
  const kind=type==='module'?'module':type==='application/x-xensonar-room'?'room':type==='application/x-xensonar-function'?'island':type===''||/javascript/.test(type)?'classic':'other';
  blocks.push({kind,id:(attrs.match(/id="([^"]*)"/)||[])[1]||'',start,end:start+e});sre.lastIndex=start+e}
 /* rewrite source files after deleting [start,end) ranges of the page (sorted, non-overlapping) */
 function applyDeletions(merged){
  for(const d of merged){const a=fileAt(d[0]),b=fileAt(d[1]-1);if(!a.file||!b.file)throw Error('deletion touches the template: '+out.slice(d[0],d[0]+80))}
  const newText=new Map();
  for(const p of pieces){if(!p.file)continue;let t='',pos=p.start;
   for(const d of merged){if(d[1]<=p.start||d[0]>=p.end)continue;const s=Math.max(d[0],p.start),e=Math.min(d[1],p.end);t+=out.slice(pos,s);pos=e}
   t+=out.slice(pos,p.end);newText.set(p.file,(newText.get(p.file)||'')+t)}
  let changed=0;for(const [f,t] of newText){const fp=path.join(ROOT,f);if(fs.readFileSync(fp,'utf8')!==t){fs.writeFileSync(fp,t);changed++}}
  return changed;
 }
 return {ROOT,out,pieces,blocks,fileAt,applyDeletions};
}
module.exports={load,ROOT};
