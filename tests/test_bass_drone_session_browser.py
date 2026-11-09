"""Real Chromium wiring test: bass/drone are owned by named sessions, not last-used globals."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys,json
html=Path(sys.argv[1] if len(sys.argv)>1 else 'dist/XenSonar_Standalone.html').read_text()
anchor='const __XenMetaSessions=__createXenMetaSessionStore(localStorage,__XenQuick);'
assert html.count(anchor)==1
html=html.replace(anchor,anchor+'\nwindow.__BassProbe={sessions:__XenMetaSessions,bridge:__XenMainRoomSessionBridge,quick:__XenQuick};')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1360,'height':850})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{const data=new Map();data.set('xensonar.quick-menu.v2',JSON.stringify([{kind:'bass',id:'preset:offbeat',name:'Bass Pattern'}]));window.__disk=data;const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),get length(){return data.size},key:i=>[...data.keys()][i]};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('fixture IDB disabled')}}});}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=85000)
 page.wait_for_function('window.__XenBoot?.state().ready===true && window.__BassProbe?.bridge.available()',timeout=65000)
 result=page.evaluate('''()=>{
  const {sessions,bridge}=window.__BassProbe;
  const a={bassVoice:'hollow',bassTone:.34,bassGrit:.27,bassResonance:.61,bassEnvelope:1.3,bassDecay:.8,bassSub:.42,bassPatternMode:'preset',bassClipId:'',bassPattern:'offbeat',dronePreset:'dark_sub',droneFixedHz:55,droneRhythm:'Synkope'};
  const b={...a,bassVoice:'sub',bassTone:.84,bassResonance:.05,droneFixedHz:110,droneRhythm:'Off'};
  bridge.patch(a);
  if(!sessions.saveFromQuickAsNew('Session A',false))throw Error('Save A: '+sessions.snapshot().error);
  bridge.patch(b);
  if(!sessions.saveFromQuickAsNew('Session B',false))throw Error('Save B: '+sessions.snapshot().error);
  const rows=sessions.snapshot().saved,A=rows.find(v=>v.name==='Session A'),B=rows.find(v=>v.name==='Session B');
  if(!A||!B)throw Error('Saved rows missing');
  if(A.roomSettings||B.roomSettings)throw Error('Room Settings checkbox falsely enabled');
  if(A.songPerformance.sources.bass.timbre.bassVoice!=='hollow')throw Error('A Bass lost');
  if(B.songPerformance.sources.bass.timbre.bassVoice!=='sub')throw Error('B Bass lost');
  if(!sessions.activateSaved(A.id))throw Error('Activate A: '+sessions.snapshot().error);
  const first=bridge.captureSongSources();
  if(!sessions.activateSaved(B.id))throw Error('Activate B: '+sessions.snapshot().error);
  const second=bridge.captureSongSources();
  if(!sessions.activateSaved(A.id))throw Error('Activate A again: '+sessions.snapshot().error);
  const third=bridge.captureSongSources();
  return {A:{voice:first.bass.timbre.bassVoice,droneHz:first.drone.params.droneFixedHz},B:{voice:second.bass.timbre.bassVoice,droneHz:second.drone.params.droneFixedHz},A2:{voice:third.bass.timbre.bassVoice,droneHz:third.drone.params.droneFixedHz},persisted:!!window.__disk.get('xensonar.meta-sessions.v2')};
 }''')
 print('BASS_DRONE_BROWSER',json.dumps(result))
 assert result['A']==result['A2']=={'voice':'hollow','droneHz':55},result
 assert result['B']=={'voice':'sub','droneHz':110},result
 assert result['persisted']
 assert not errors,errors[:5]
 print('BASS_DRONE_NAMED_SESSION_BROWSER_PASS')
 browser.close()
