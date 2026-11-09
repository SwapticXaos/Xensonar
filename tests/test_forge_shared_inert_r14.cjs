'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const lab=fs.readFileSync('src/rooms/lab.js','utf8');
const idle=fs.readFileSync('src/rooms/00_empty_audio_p32.js','utf8');
const rack=fs.readFileSync('src/rooms/00_forge_rack_presentation.js','utf8');
const css=fs.readFileSync('styles/areas/040_xen-p9-m9-cockpit-canonical.css','utf8');
assert.match(lab,/const __forgeSharedControls=u\.jsxs\(/,'single shared live rack and NAME render tree must exist');
assert.match(lab,/controls:__forgeSharedControls/,'first-contact must receive SAME React controls tree');
assert(lab.includes('}),__forgeSharedControls]}):u.jsx(__XenForgeNoAudioP32'), 'loaded view must render same controls tree');
assert.match(idle,/function __XenForgeNoAudioP32\(\{onImport,disabled=false,controls\}\)/,'idle stage receives controls from active owner');
assert.match(idle,/controls\);/,'idle stage renders supplied controls');
assert.doesNotMatch(idle,/__ForgeRackInactivePreview|xen-p33-name-dummy|xen-forge-name-word|xen-forge-quick-field/,'idle stage must not recreate NAME and rack markup');
assert.doesNotMatch(rack,/__ForgeRackInactivePreview|xen-p33-inactive-tile/,'no second independent button representation');
assert.doesNotMatch(css,/\.xen-p33-name-dummy|\.xen-p33-inactive-tile/,'no abandoned dummy geometry overrides');
assert.match(idle,/inert:true/,'idle rack must be inert even if new actions are added');
assert.match(lab,/disabled:!E\|\|T\|\|__micBusy/,'carrier cannot activate without source');
assert.match(lab,/disabled:!E\|\|!F\|\|T/,'export action cannot activate without source');
assert.match(lab,/value:oe,onChange:qe=>ue\(qe\.target\.value\),disabled:!E/,'shared input is disabled in no-audio mode');
console.log('PASS: R14 one owner for both states; no separate dummy layout, no active idle controls');

// Render the real first-contact component with a React-compatible lightweight
// element factory. The SAME caller-owned object must be present exactly once.
const vm=require('node:vm');
const P={createElement:(type,props,...children)=>({type,props:props||{},children}),useRef:()=>({current:null}),useState:x=>[x,()=>{}],useEffect:()=>{}};
const ctx=vm.createContext({P,Float32Array});
vm.runInContext(idle,ctx);
const controls=P.createElement('section',{'data-identity':'real-forge-rack'},'one shared rack and name band');
const tree=vm.runInContext('__XenForgeNoAudioP32({onImport:()=>{},disabled:true,controls:__testControls})',vm.createContext({...ctx,P,__testControls:controls}));
const seen=[];
function traverse(node){if(!node||typeof node!=='object')return;if(node===controls)seen.push(node);
 for(const child of node.children||[])Array.isArray(child)?child.forEach(traverse):traverse(child);
}
traverse(tree);
assert.equal(seen.length,1,'idle stage includes exactly one copy of caller-owned actual rack');
const inertRack=tree.children.find(x=>x&&x.props&&x.props['data-p33-inactive-rack']);
assert(inertRack&&inertRack.props.inert===true,'whole shared rack is genuinely inert in DOM');
assert.strictEqual(inertRack.children[0],controls,'not a recreated/dummy rack tree');
console.log('PASS R14 actual first-contact component renders the identical controls instance once');
