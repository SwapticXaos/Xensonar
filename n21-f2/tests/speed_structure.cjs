const fs=require('node:fs');
const assert=require('node:assert/strict');
const files=[
 'src/forge/original/02_material.js',
 'src/forge/original/03_gestalt_material.js',
 'src/forge/original/04_gestalt.js',
 'src/forge/revised/01_material.js',
 'src/forge/revised/02_gestalt.js',
];
for(const path of files){
 const code=fs.readFileSync(path,'utf8');
 const remaining=(code.match(/Math\.sin\(\(?Math\.PI\s*\*\s*\(j\s*\+\s*(?:0\.5|\.5)\)\)?\s*\/\s*size\)/g)||[]).length;
 assert.equal(remaining,1,`The sine formula must occur exactly once in its shared precomputed window in ${path}`);
 assert.match(code,/const analysisWindow\s*=\s*Float64Array\.from/);
 assert.ok((code.match(/analysisWindow\[j\]/g)||[]).length>=2,path);
}
console.log('PASS: all five material/gestalt DSPs reuse immutable FFT window values');
