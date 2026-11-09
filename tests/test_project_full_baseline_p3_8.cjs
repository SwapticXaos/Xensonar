'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/contracts/16_project_commit_boundary.js'),'utf8');
const ctx=vm.createContext({Object,JSON,Map,Set,Error,TypeError});vm.runInContext(source,ctx);
const boundary=vm.runInContext('__XenProjectCommitP37',ctx);
const old=[{id:'project-1',name:'Pulse',sourcePackageId:'pack',contentHash:'cached',composer:{notes:[{pitch:60}]}}];
const edited=[{id:'project-1',name:'Pulse',sourcePackageId:'pack',contentHash:'cached',composer:{notes:[{pitch:61}]}}];
assert.throws(()=>boundary.assertBaseline(JSON.stringify(edited),old),/stale|different|mismatch|changed/i,
 'same metadata with edited notes must NEVER be treated as same project');
const keyOrder=[{name:'Pulse',id:'project-1',composer:{notes:[{pitch:60}]},contentHash:'cached',sourcePackageId:'pack'}];
assert.equal(boundary.assertBaseline(JSON.stringify(keyOrder),old),true,'JSON key ordering is not content change');
console.log('P3.8 PASS: full-content project baseline compares musical notes, independent of JSON key order');
