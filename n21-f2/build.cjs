'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=__dirname,manifestFile=path.join(root,'source-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let html=read('template/head.html');
for(const file of manifest.files)html+=read(file);
html+=read('template/script-close.html');
for(const item of manifest.styles)html+=item.tag+read(item.file)+'</style>'+item.after;
html+=read('template/foot.html');
const buf=Buffer.from(html,'utf8'),sha=crypto.createHash('sha256').update(buf).digest('hex');
if(process.argv.includes('--verify')){
 if(sha!==manifest.sha256||buf.byteLength!==manifest.bytes||!fs.existsSync(path.join(root,manifest.entry))||!fs.readFileSync(path.join(root,manifest.entry)).equals(buf)){
  console.error('FAIL build reproducibility',sha,buf.byteLength);process.exit(1);
 }
 console.log('PASS reproducible standalone HTML',sha,buf.byteLength);
}else{
 fs.writeFileSync(path.join(root,manifest.entry),buf);
 manifest.sha256=sha;manifest.bytes=buf.byteLength;
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 console.log('BUILT',manifest.entry,sha,buf.byteLength);
}
