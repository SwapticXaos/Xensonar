'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),base=require('../docs/forge-request-ownership/baseline.json'),fixes=require('../docs/forge-request-ownership/corrections.json'),m=require('../source-manifest.json');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),anchors={};
for(const [file,hash]of Object.entries(base.hashes)){let text=fs.readFileSync(file,'utf8');const current=sha(text);for(const c of [...(fixes[file]||[])].reverse()){assert.equal(text.split(c.new).length-1,c.count,'declared hearing request change '+file);text=text.split(c.new).join(c.old)}assert.equal(sha(text),hash,'unchanged source/synthesis/master protection '+file);if(fixes[file])anchors[file]=current}
assert.deepEqual(m.files,base.files);assert.deepEqual(m.styles,base.styles);console.log('PASS shared hearing request and guarded preparation; synthesis algorithms, live DSP, UI, schemas and source order unchanged');module.exports={anchors};
