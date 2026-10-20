'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),base=require('../docs/p7-review/baseline.json'),fixes=require('../docs/p7-review/corrections.json'),m=require('../source-manifest.json');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),anchors={};
const paths=new Set([...Object.keys(base.hashes),...Object.keys(base.stage22).filter(p=>/^(src|styles|template)\//.test(p))]);
for(const file of paths){let text=fs.readFileSync(file,'utf8');const current=sha(text);
 for(const c of [...(fixes[file]||[])].reverse()){assert.equal(text.split(c.new).length-1,c.count,'exact review correction '+file);text=text.split(c.new).join(c.old)}
 assert.equal(sha(text),base.stage22[file]||base.hashes[file],'declared P7 chain or untouched input '+file);
 if(base.stage22[file])anchors[file]=current;
}
assert.deepEqual(m.files,['src/handoff/00_chat_feature_addons.js',...base.files]);assert.deepEqual(m.styles,base.styles);
console.log('PASS P7 exact 00–22 source ancestry, explicit corrections and all untouched source/style/template hashes');
module.exports={anchors,additions:['src/handoff/00_chat_feature_addons.js','src/nodal/13_installation_ball_grid.js']};
