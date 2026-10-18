'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','src/nodal/07_sound_designer.js'),'utf8');
const from=src.indexOf('function NodalRoomHeader('),to=src.indexOf('\n}',src.indexOf('function koe(props)',from));
assert(from>0&&to>from,'Shared Nodal header and dispatch functions exist');
function Legacy(){}
function Designer(){}
const env={P:{createElement:(type,props,...children)=>({type,props:props||{},children})},koeLegacy:Legacy,NodalSoundDesigner:Designer};
vm.runInNewContext(src.slice(from,to+2)+';this.openRoom=koe;',env);
for(const mode of ['sounddesign','installation','enhancer']){
  let switched=null;const view=env.openRoom({mode,onModeChange:m=>switched=m});
  assert.equal(view.type,'section');assert.equal(view.props.className,'nd-room nd-room-shell');
  assert.equal(view.props['data-nodal-mode'],mode);
  const header=env.NodalRoomHeader(view.children[0].props);
  assert.equal(header.type,'header');
  const nav=header.children[1];assert.equal(nav.type,'nav');assert.equal(nav.props['aria-label'],'Nodal modes');
  const tabs=nav.children;assert.equal(tabs.length,3);
  assert.deepEqual(Array.from(tabs,t=>t.children[0]),['Sound Design','Installation','Enhancer']);
  assert.equal(tabs.filter(t=>t.props['aria-pressed']).length,1);
  const ix=['sounddesign','installation','enhancer'].indexOf(mode);assert.equal(tabs[ix].props['aria-pressed'],true);
  const click=(ix+1)%3;tabs[click].props.onClick();assert.equal(switched,['sounddesign','installation','enhancer'][click]);
  const body=view.children[1];
  if(mode==='sounddesign')assert.equal(body.type,Designer);else{assert.equal(body.type,'div');assert.equal(body.children[0].type,Legacy)}
}
console.log('PASS functional Room III mode navigation uses one shell, 3 accessible buttons, original mode components');
