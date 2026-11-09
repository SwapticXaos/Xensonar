'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const path=require('path');
const lab=fs.readFileSync('src/rooms/lab.js','utf8');
const idle=fs.readFileSync('src/rooms/00_empty_audio_p32.js','utf8');
const css=fs.readFileSync('styles/areas/040_xen-p9-m9-cockpit-canonical.css','utf8');
// RED on R17: visible shared metadata absent without audio.
assert.match(lab,/function __ForgeMaterialQuickFields\(\{meta,onPatch,disabled=false\}\)/,'QuickFields accepts disabled state');
assert.match(lab,/disabled:disabled/,'quick input is actually disabled when audio is absent');
assert.match(lab,/s&&i\?u\.jsx\(__ForgeMaterialQuickFields,\{meta:s,onPatch:i,disabled:!E\}\):null/,'real metadata fields exist independently of loaded source');
assert.doesNotMatch(lab,/E&&s&&i\?u\.jsx\(__ForgeMaterialQuickFields/,'must not hide original metadata controls when source is missing');
// Raw status is never rendered in the top-level rack, even before the diagnostics portal exists.
assert.doesNotMatch(lab,/\(\s*__diagTargetP29\s*\?\s*ao\.createPortal\(__diagnosticsP29,\s*__diagTargetP29\)\s*:\s*null\s*\)\s*:\s*__diagnosticsP29/,'no diagnostic fallback outside details');
assert.match(lab,/__diagTargetP29\?ao\.createPortal\(__diagnosticsP29,\s*__diagTargetP29\):null/,'status only inside existing details portal');
assert(!lab.includes('or choose a Donor Library entry'),'no misleading suggested action in provenance');
assert((lab.match(/"data-forge-material-diagnostics-slot":"true"/g)||[]).length===2,'both Forge layouts expose the same diagnostics slot');
assert.match(idle,/controls\);/,'actual live controls still shared with idle view');
assert.doesNotMatch(idle,/name-dummy|inactive-tile|__ForgeMaterialQuickFields/,'no alternate NAME or metadata controls in dummy');
// Directly exercise actual field factory with no source, preserving canonical values and inactive click behavior.
const begin=lab.indexOf('function __ForgeMaterialQuickFields('),end=lab.indexOf('function __ForgeMaterialMetadata(',begin);
assert(begin>=0&&end>begin);
const P={createElement:(type,props,...children)=>({type,props:props||{},children})};
const scope=vm.createContext({P,__forgeMaterialRootHz:n=>n});
vm.runInContext(lab.slice(begin,end),scope);
const writes=[];
const metadata=vm.runInContext('__ForgeMaterialQuickFields({meta:{bars:7,guideSegments:3,rootHz:440},onPatch:x=>__testWrites.push(x),disabled:true})',vm.createContext({...scope,__testWrites:writes}));
const inputs=[];function visit(node){if(!node||typeof node!=='object')return;if(node.type==='input')inputs.push(node);for(const c of node.children||[])Array.isArray(c)?c.forEach(visit):visit(c);}
visit(metadata);
assert.deepStrictEqual(inputs.map(n=>n.props.value),[7,3,440]);
assert(inputs.every(n=>n.props.disabled===true),'all three controls disabled when no audio');
inputs[0].props.onChange({currentTarget:{value:'9'}});
inputs[1].props.onChange({currentTarget:{value:'5'}});
inputs[2].props.onChange({currentTarget:{value:'330'}});
assert.strictEqual(writes.length,0,'inactive metadata cannot modify state');
assert.match(css,/\.xen-forge-name-rack>\.xen-forge-inline-metadata/,'existing one-row layout maintained');
console.log('PASS R18: one real inactive rack, bars/segments/anchor present, diagnostics only in disclosure, no duplicate controls');
