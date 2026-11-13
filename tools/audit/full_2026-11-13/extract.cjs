// Extract <script>/<style> blocks from index.html the way the HTML parser does (script: raw text until </script)
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(process.argv[2],'utf8');
const out=process.argv[3]; fs.mkdirSync(out,{recursive:true});
const blocks=[]; let i=0;
const re=/<(script|style)\b([^>]*)>/gi; let m;
while((m=re.exec(html))){
  const tag=m[1].toLowerCase(); const start=m.index+m[0].length;
  const endRe=new RegExp('</'+tag+'\\s*>','i'); const rest=html.slice(start); const e=rest.search(endRe);
  if(e<0){console.log('UNTERMINATED',tag,m.index);break;}
  const body=rest.slice(0,e);
  blocks.push({tag,attrs:m[2].trim(),offset:m.index,len:body.length,body});
  re.lastIndex=start+e;
}
let si=0,ci=0; const idx=[];
for(const b of blocks){
  const n=b.tag==='script'?('s'+String(si++).padStart(2,'0')+'.js'):('c'+String(ci++).padStart(2,'0')+'.css');
  fs.writeFileSync(path.join(out,n),b.body); idx.push({file:n,attrs:b.attrs,offset:b.offset,len:b.len});
}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(idx,null,1));
console.log('scripts',si,'styles',ci);
for(const x of idx) if(x.file[0]==='s') console.log(x.file,String(x.len).padStart(8),x.attrs.slice(0,110));
// what's outside
let outside=html; 
