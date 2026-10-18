'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const fn=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)+start.length));
const jsx=(component,props,...children)=>({component,props:{...props,...(children.length?{children}: {})}});
const u={jsx,jsxs:jsx};const calls=[];
const P={createElement:jsx,Fragment:'Fragment',cloneElement:(el,props)=>({...el,props:{...el.props,...props}})};
const f6e={height:32};
const context={P,u,f6e,Z_:()=>null,__F3564TransportTrim:()=>null,eVe:()=>null,jHe:()=>null,w6e:()=>null,
 __useForgeListeningMode:()=>({error:'',value:'additive',label:'Pure Dieter'}),
 __ForgeListeningPicker:()=>null,ZHe:()=>null,JHe:()=>null,__ForgeListeningMode:{choose:id=>calls.push('choose:'+id)},
 __ForgeTransportAccess:{activate:()=>calls.push('play')},document:{querySelector:()=>null}};
vm.createContext(context);
vm.runInContext(fn(read('src/forge/editor/09_workflow_controls.js'),'function __ForgeTransportRack(', 'function __PureDieterControls('),context);
vm.runInContext(fn(read('src/forge_and_melodic/01_donor_selection_and_edits.js'),'function tVe(', 'function nVe('),context);
const walk=(element,out=[])=>{if(!element||typeof element!=='object')return out;if(Array.isArray(element))return element.reduce((acc,x)=>walk(x,acc),out);if('component' in element){out.push(element);walk(element.props.children,out)}return out};
let actions=[];const controls={rendering:false,isPlaying:false,playButtonView:{className:'original-play',title:'Play',symbol:'▶',screenReaderLabel:'Play'},
 renderFillActive:false,materialExport:{bars:4,guideSegments:4},previewBpmInputValue:100,previewLoopEnabled:true,previewBpmDisabled:false,previewLoopToggleDisabled:false,
 fileInputRef:{current:{click:()=>actions.push('import')}},statusMessage:'Rendering 64%',
 handleSendCurrentPreviewToXensonar:id=>actions.push('send:'+id),handleStop:()=>actions.push('stop'),
 handleDownloadCurrentPreview:format=>actions.push('download:'+format),handleExport:()=>actions.push('canvas'),
 updateMaterialExport:change=>actions.push('change:'+JSON.stringify(change)),handlePlay:()=>actions.push('play2')};
const elements=walk(context.__ForgeTransportRack(controls));
const attr=(name,value)=>elements.filter(el=>el.props?.[name]===value);
const buttons=elements.filter(el=>el.component==='button');
assert.equal(attr('data-forge-hearing-status',true).length,1,'single status owner');
assert.equal(attr('data-forge-project-corner','true').length,1,'single project corner');
assert.equal(attr('data-forge-hearing-destinations','v2').length,1,'all exports grouped');
assert.equal(elements.filter(x=>x.component===context.eVe && x.props.compact===true).length,1,'real Save component mounted once');
assert.equal(elements.filter(x=>x.component===context.jHe && x.props.compact===true).length,1,'real Project Library component mounted once');
assert.equal(attr('data-forge-transport-picker','true').length,1,'intentional lower listening picker restored');
assert.equal(elements.filter(x=>x.component===context.__ForgeListeningPicker).length,1,'lower picker is the same shared selector as the heading');
const status=attr('data-forge-hearing-status',true)[0];assert.match(status.props.className,/f34-transport-status/);
assert.equal(status.props.children[0],'Rendering 64%');
buttons.find(b=>b.props['data-forge-import-image']).props.onClick();
buttons.find(b=>b.props['data-xensonar-spectralforge-render-fill-button']).props.onClick();
for(const key of ['material','root','pink'])buttons.find(b=>b.props['data-f318-export-target']===key).props.onClick();
assert.deepEqual(actions,['import','send:material','send:root','send:pink']);assert.deepEqual(calls,['play']);
const hearing={component:'ListeningModeSelector',props:{oldProp:true}};
const sidebar=walk(context.tVe({variant:'forge3',sidebarTop:null,hearingPanel:hearing,onToggle:()=>calls.push('collapse')}));
assert.equal(sidebar.filter(el=>el.component===context.eVe).length,0,'project name removed from sidebar');
assert.equal(sidebar.filter(el=>el.component===context.jHe).length,0,'library removed from sidebar');
const header=sidebar.find(el=>el.props['data-forge-synth-lab-header']==='true');assert(header);
assert.equal(header.props.children.length,3,'Synth Lab | listening modes | Collapse');
const synthHeading=header.props.children[0];
assert.match(synthHeading.props.className,/inline-flex items-center/, 'Synth Lab label aligned vertically with icon');
const synthParts=synthHeading.props.children.props.children;
assert.equal(synthParts[0].props.children,'🎛️');
assert.equal(synthParts[0].props.style.fontSize,'28px');
assert.equal(synthParts[1].props.children,'Synth Lab');
assert.equal(header.props.children[1].props.selectedPicker,'additive');
header.props.children[1].props.onPickerChange('fractalia');
header.props.children[2].props.onClick();
assert.deepEqual(calls,['play','choose:fractalia','collapse']);
console.log('PASS F3.3 runtime render tree, genuine project ownership, routes, picker and transport dispatch');
