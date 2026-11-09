'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const path=require('node:path');
const root=path.join(__dirname,'..');
const manifestPath=path.join(root,'source-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const section of manifest.sources){
 const content=section.files.map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('');
 section.sha256=sha(content);
 section.chars=Array.from(content).length;
}
const template=fs.readFileSync(path.join(root,'template/standalone.html'),'utf8');
let html=template;
for(const section of manifest.sources){
 const content=section.files.map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('');
 if(html.split(section.marker).length!==2)throw Error('Marker count invalid '+section.marker);
 html=html.replace(section.marker,()=>content);
}
manifest.input_sha256=sha(Buffer.from(html,'utf8'));
manifest.input_bytes=Buffer.byteLength(html,'utf8');
manifest.build='P4.1 × P37 RC4 × PCM1 + Forge R15 single live/inert rack + Emilia seven-node starter';
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('PINNED R15',manifest.input_sha256,manifest.input_bytes);
