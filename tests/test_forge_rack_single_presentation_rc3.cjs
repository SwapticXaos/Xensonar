'use strict';
// Contract-first regression for a unified, presentation-only Forge action rack.
// Expected RED on RC2: no canonical presentation descriptor or shared row owner.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const helper='src/rooms/00_forge_rack_presentation.js';
assert(fs.existsSync(path.join(root,helper)),'a single shared rack presenter should exist');
const src=read(helper),lab=read('src/rooms/lab.js'),empty=read('src/rooms/00_empty_audio_p32.js');
const ids=['load','repair','apply','extract','play','material','pink','root','sample','donor','carrier'];
for(const id of ids)assert(src.includes(`${id}:`),`missing canonical presentation identity ${id}`);
assert(src.includes('function __ForgeRackRows('),'one owner of rack row DOM');
assert(!src.includes('__ForgeRackInactivePreview'),'shadow action factory is eliminated');
assert(lab.includes('const __forgeSharedControls=u.jsxs('),'live controls assembled once');
assert(empty.includes('},controls);') && lab.includes('controls:__forgeSharedControls'),'no-audio uses real action JSX and name band');
assert(!empty.includes('xen-p33-name-dummy'),'no shadow NAME field');
assert(!empty.includes("const tile=(className,caption)"),'no shadow tile factory');
assert(!/(?:AudioContext|AudioWorklet|indexedDB|localStorage|\.play\(|\.importPackage\()/i.test(src),'shared presentation module remains pure');
console.log('PASS RC3 shared rack presentation contract');

// Execute the actual row factory and verify one canonical set of action rows.
const vm=require('node:vm');
const P={createElement:(tag,props,...children)=>({tag,props:props||{},children})};
const context=vm.createContext({P});vm.runInContext(src,context);
const node=vm.runInContext('__ForgeRackRows({primary:["A"],secondary:["B"]})',context);
assert.equal(node.props.className,'xen-forge-action-rack');
assert.deepEqual(node.children.map(x=>x.props.className),[
 'xen-forge-action-row xen-forge-action-row-primary',
 'xen-forge-action-row xen-forge-action-row-secondary'
]);
console.log('PASS: RC3 presenter shared by both live and inert states');
