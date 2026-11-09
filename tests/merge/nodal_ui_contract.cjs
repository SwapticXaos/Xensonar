'use strict';
/** Source-provenance regression: preserve the A+B base and admit only the signed C overlay.
 * The original A+B SOURCE_LOCK.json remains frozen and authoritative for its 297 files.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const ab=require('../../docs/merge/SOURCE_LOCK.json').source_sha256;
const c=require('../../docs/merge/UI_C_SOURCE_LOCK.json');
const {expected,patch,additions}=require('./source_expectations.cjs');
const overlay=Object.keys(c.added_sources);
const manifest=require('../../source-manifest.json');
const actualFiles=[];
for(const top of ['src','styles']){
 function walk(dir){for(const dirent of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,dirent.name);
  if(dirent.isDirectory())walk(full);
  else if(dirent.isFile())actualFiles.push(path.relative(root,full).split(path.sep).join('/'));
 }}
 walk(path.join(root,top));
}
assert.equal(overlay.length,4,'C must contain exactly four new source files');
assert.deepEqual(actualFiles.sort(),Object.keys(expected).sort(),'No missing or unreviewed product files');
for(const [name,hash] of Object.entries(additions))assert.equal(digest(fs.readFileSync(path.join(root,name))),hash,'New module changed: '+name);
for(const name of Object.keys(ab))assert.equal(digest(fs.readFileSync(path.join(root,name))),expected[name],'Unreviewed A+B descendant: '+name);
for(const [name,sha] of Object.entries(c.added_sources))assert.equal(digest(fs.readFileSync(path.join(root,name))),sha,'C overlay changed: '+name);
const integration=require('../../docs/patches/UI_R2_INTEGRATION_SOURCE_LOCK.json');
assert.equal(integration.template_delta.parent_sha256,c.template_sha256,'template delta must start at the exact C/R2 template');
assert.equal(digest(fs.readFileSync(path.join(root,'template/standalone.html'))),integration.template_delta.sha256,'unreviewed template delta');
const originals=manifest.sources.slice(0,60);
const added=manifest.sources.slice(60,64);
const extensions=manifest.sources.slice(64);
assert.equal(manifest.sources.length,64+integration.added_components.length);
assert.deepEqual(extensions,integration.added_components,'exact added UI component order/content changed');
const extensionFiles=new Set(extensions.flatMap(x=>x.files));
assert.deepEqual([...new Set(originals.flatMap(x=>x.files))].sort(),[...Object.keys(ab),...Object.keys(additions).filter(p=>!extensionFiles.has(p))].sort(),'Original component ancestry or exact module additions changed');
assert.deepEqual(added.map(x=>x.files[0]),c.component_files,'C component ordering changed');
assert.deepEqual(added.map(x=>x.id),c.component_ids,'C component IDs changed');
assert.deepEqual(added.map(x=>x.marker),c.component_markers,'C markers changed');
assert.equal(manifest.ui_overlay.parent_sha256,c.parent_html_sha256);
assert.equal(manifest.input_sha256,patch?.result_html_sha256??c.result_html_sha256);
assert.equal(manifest.input_bytes,patch?.result_bytes??c.result_bytes);
const html=fs.readFileSync(path.join(root,'dist/XenSonar_Standalone.html'));
assert.equal(digest(html),patch?.result_html_sha256??c.result_html_sha256);
for(const id of c.component_ids)assert.equal((html.toString().match(new RegExp('id="'+id+'"','g'))||[]).length,1,'C component should occur once: '+id);
for(const wrong of ['xen-nodal-v6-reference-warp','xen-nodal-room-iii-concave-shell-v4','xen-nodal-room-iii-spatial-bow-v5'])assert(!html.includes('id="'+wrong+'"'),'rejected Nodal branch is present: '+wrong);
console.log('PASS A+B+C additive source provenance',Object.keys(ab).length,'original +',overlay.length,'C sources; original bytes and built HTML pinned');
