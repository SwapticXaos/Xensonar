const fs=require('node:fs'),path=require('node:path');
exports.readNodalSources=root=>require(path.join(root,'source-manifest.json')).files.filter(f=>f.startsWith('src/nodal/')).map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
