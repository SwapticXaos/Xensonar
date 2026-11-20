'use strict';
// TS-MOD-01: compile one TypeScript module from src/ts/** for the ordered concat build.
// Output: `var __XenTs_<basename>=(()=>{...})();` exposing the module's exports. Types are stripped (no typecheck here;
// `npm run typecheck --prefix tools/slim` checks them). Deterministic: pinned esbuild, fixed options.
// Usage: node tools/ts_module.cjs <file.ts>   (stdout: JavaScript)
const path=require('node:path'),fs=require('node:fs');
const esbuild=require(path.join(__dirname,'slim/node_modules/esbuild'));
const file=process.argv[2];
const name='__XenTs_'+path.basename(file,'.ts').replace(/[^A-Za-z0-9_]/g,'_');
const out=esbuild.transformSync(fs.readFileSync(file,'utf8'),{loader:'ts',format:'iife',globalName:name,target:'es2020',sourcefile:file,legalComments:'none'});
process.stdout.write(out.code);
