'use strict';
// Evaluate the real upper performance panel and source callbacks. Only React
// hooks and unrelated, unexpanded child components are simulated.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=file=>fs.readFileSync(file,'utf8');
function flatten(node){return node&&typeof node==='object'?[node,...[node.props?.children].flat(Infinity).flatMap(flatten)]:[];}
function performanceMenus(overrides={}){
  const panel=read('src/runtime/instrument/08_library_and_tuning_editor.js');
  const controls=read('src/runtime/instrument/10_entrophon_and_voice_control.js');
  const code=read('src/mix/02_performance_catalog.js')+'\n'+
    controls.slice(controls.indexOf('function __xenChooseWaveStarterSource('),controls.indexOf('function fse('))+'\n'+
    panel.slice(panel.indexOf('function __PerformanceSoundLane('),panel.indexOf('const B6='));
  const env={
    P:{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useRef:()=>({current:null}),useId:()=> 'test-performance',useSyncExternalStore:(_subscribe,snapshot)=>snapshot()},
    u:{Fragment:'fragment',jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},
    __SourceOctave:()=>null,__QuickDock:()=>null,Hd:()=>false,Ew:()=>({engineAmount:1}),dG:()=>{},...overrides
  };
  const api=new Function(...Object.keys(env),code+';return {Ioe,__PerformanceSoundLane};')(...Object.values(env));
  return {flatten,menu(props,lane){
    const tree=api.Ioe({isRecording:false,recordingActive:false,sideMarkerPulses:[],scrollbarInsetPx:0,soundPaletteProps:props});
    const child=flatten(tree).find(node=>node.type===api.__PerformanceSoundLane&&node.props.lane===lane);
    assert(child,`actual performance lane ${lane}`);
    const menu=flatten(api.__PerformanceSoundLane(child.props)).find(node=>node.type==='select');
    assert(menu,`actual ${lane} sound menu`);return menu;
  }};
}
module.exports={performanceMenus,flatten};
