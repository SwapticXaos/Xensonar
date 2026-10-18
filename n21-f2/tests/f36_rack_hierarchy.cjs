// F3.6 regression: assert the ACTUAL rendered element tree, not only matching CSS selectors.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/forge/editor/09_workflow_controls.js'),'utf8');
const part=src.slice(src.indexOf('function __ForgeTransportRack('),src.indexOf('function __PureDieterControls('));
const helpers=`
const P={Fragment:'fragment',createElement:(type,props,...children)=>({type:typeof type==='function'?type.name:type,props:props||{},children})};
const __useForgeListeningMode=()=>({error:''}),__ForgeTransportAccess={activate:()=>null},__F3564TransportTrim=()=>null,__ForgeListeningPicker=()=>null,Z_=()=>null,eVe=()=>null,jHe=()=>null,w6e=()=>null,f6e={},J_=(v)=>v;
`;
const stub={rendering:false,renderFillActive:false,isPlaying:false,renderFillPercent:0,playButtonView:{title:'',symbol:'▶',className:'',screenReaderLabel:''},statusMessage:'',fileInputRef:{current:null},materialExport:{bars:4,guideSegments:4},previewBpmInputValue:120,previewLoopEnabled:false};
const tree=(new Function(helpers+part+';return __ForgeTransportRack;'))()(stub);
const find=(v,cls)=>v?.children?.find(c=>c?.props?.className===cls);
const rack=find(tree,'f31-play-rack');assert(rack,'rack should be rendered');
const main=find(rack,'f31-transport-main'),bottom=find(rack,'f31-transport-bottom');
assert(main,'top row exists');assert(bottom,'bottom row is sibling of top row, not a child');
assert.equal(main.children.length,5,'top row has exactly five slots: transport, export, tempo, trim/image, project name/save');
assert.equal(main.children[0].props.className,'f34-transport-and-status');
assert.equal(main.children[3].props.className,'f31-trim-import');
assert.equal(main.children[4].props.className,'f34-project-save-on-main','Project Name/Save must sit beside Import Image IN THE SAME GRID');
assert.equal(bottom.children.length,2,'bottom row only contains hearing/export strip and Library');
assert.equal(bottom.children[0].props.className,'f33-rack-destinations');
assert.equal(bottom.children[1].props.className,'f33-rack-project-corner');
const status=find(main.children[0],'f34-transport-status');assert(status,'status is inside transport buttons cell');
const css=fs.readFileSync(path.join(__dirname,'../styles/08_forge_workflow.css'),'utf8');
assert.match(css,/\.f31-play-rack \.f31-transport-main\s*\{[^}]*display:grid/s,'top row is a grid');
assert.match(css,/\.f31-play-rack \.f34-transport-status\s*\{[^}]*position:absolute/s,'status overlay does not occupy another row');
console.log('PASS F3.6 rack rendered tree: 5 top + 2 bottom; project name shares import row; status nested under transport');
