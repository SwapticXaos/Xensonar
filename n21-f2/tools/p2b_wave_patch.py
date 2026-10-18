from pathlib import Path
p=Path('src/runtime/instrument/10_entrophon_and_voice_control.js')
s=p.read_text()
helper='''// S1/P2B: the menu owns the explicit Entrophon/Classic return path.
// Keep the remembered Classic/Sample/Nodal preset while Entrophon is active.
function __xenChooseWaveStarterSource(next,{selectPreset,setNParams,setWaveEnabled}) {
  if(next==='entrophon'){
    const current=Ew('wave');
    dG('wave',{enabled:true,...(current.engineAmount<=1e-4?{engineAmount:1}:{})});
    setWaveEnabled(true);
    return 'entrophon';
  }
  dG('wave',{enabled:false});
  selectPreset(next);
  setNParams({waveStarterHoldSoundPreset:next});
  return next;
}
'''
assert 'function __xenChooseWaveStarterSource' not in s
assert 'function fse(' in s
s=s.replace('function fse(',helper+'function fse(',1)
old='const[de,oe]=P.useState(null),ue=a.filter(re=>re.groupId!=="samples"),fe=a.filter(re=>re.groupId==="samples"),he=()=>u.jsxs(u.Fragment,{children:['
new='const[de,oe]=P.useState(null),[__entMenuRevision,__refreshEntMenu]=P.useState(0);P.useEffect(()=>Kie(()=>__refreshEntMenu(re=>re+1)),[]);const ue=a.filter(re=>re.groupId!=="samples"),fe=a.filter(re=>re.groupId==="samples"),he=(includeEntrophon=false)=>u.jsxs(u.Fragment,{children:[includeEntrophon&&u.jsx("option",{value:"entrophon",children:"Entrophon"}),'
assert old in s
s=s.replace(old,new,1)
old='u.jsx("select",{value:L,onChange:re=>{K(re.target.value),t({waveStarterHoldSoundPreset:re.target.value})},className:"w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300",children:he()})'
new='u.jsx("select",{value:Hd()?"entrophon":L,onChange:re=>__xenChooseWaveStarterSource(re.target.value,{selectPreset:K,setNParams:t,setWaveEnabled:O}),className:"w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300",children:he(!0)})'
assert old in s
s=s.replace(old,new,1)
p.write_text(s)
