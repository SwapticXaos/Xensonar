'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function declaration(file,name,kind='function'){
 const source=read(file),needle=kind+' '+name+(kind==='function'?'(':''),at=source.indexOf(needle);
 if(at<0)throw Error('Missing '+needle+' in '+file);
 const start=source.slice(at-6,at)==='async '?at-6:at;
 for(let end=source.indexOf('}',at);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(start,end+1);try{new vm.Script(text+';');return text;}catch{}
 }
 throw Error('Unclosed '+needle);
}
module.exports={root,read,declaration};
