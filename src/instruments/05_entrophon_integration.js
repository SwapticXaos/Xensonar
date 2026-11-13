/* Saved instruments use the existing selectors, composer snapshots and transport. */
const __EntrophonLiveDefinitions=new Map();
if(typeof window!=='undefined')window.addEventListener('xensonar:entrophon-library-changed',()=>__EntrophonLiveDefinitions.clear());
/* Session recipes are immutable values, independent of mutable library ownership. */
const __XenSongInstrumentDefinitions=(()=>{
  let bank=Object.freeze({version:1,nodal:Object.freeze(Object.create(null)),entrophon:Object.freeze(Object.create(null))}),epoch=0;
  const kind=id=>typeof id==='string'&&/^(nodal|entrophon):[^\s]+@[1-9][0-9]*$/.exec(id)?.[1];
  function normalize(value){
    if(value==null)value={version:1,nodal:{},entrophon:{}};
    if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||Object.keys(value).some(key=>!['version','nodal','entrophon'].includes(key)))throw new Error('Invalid song instrument definitions');
    const result={version:1};let count=0;
    for(const type of ['nodal','entrophon']){
      const items=value[type]??{};
      if(!items||typeof items!=='object'||Array.isArray(items))throw new Error('Invalid song instrument bank');
      const out=Object.create(null);
      for(const [id,recipe]of Object.entries(items)){
        if(kind(id)!==type||id.length>220||id.startsWith('entrophon:factory:')||++count>48)throw new Error('Invalid song instrument source');
        out[id]=type==='nodal'?__XenNodalModel.normalize(recipe):normalizeEntrophonInstrument(recipe);
      }
      result[type]=Object.freeze(out);
    }
    return Object.freeze(result);
  }
  function find(id){return bank[kind(id)]?.[id]??null;}
  function capture(ids){
    if(!Array.isArray(ids))throw new Error('Invalid song instrument sources');
    const result={version:1,nodal:Object.create(null),entrophon:Object.create(null)};
    for(const id of new Set(ids)){
      const type=kind(id);
      if(id==='nodal:factory:troodle')continue;/* built-in, read-only, resolved by key; never part of the song bank */
      if(typeof id==='string'&&/^(nodal|entrophon):/.test(id)&&!type)throw new Error('Invalid song instrument source');
      if(!type||id.startsWith('entrophon:factory:'))continue;
      let recipe=find(id);
      if(!recipe){
        if(type==='entrophon')recipe=entrophonFindInstrument(id);
        else recipe=__XenNodalLibrary.list().find(entry=>'nodal:'+entry.id+'@'+entry.revision===id)?.instrument;
      }
      if(!recipe)throw new Error('Missing song instrument: '+id);
      result[type][id]=recipe;
    }
    return normalize(result);
  }
  function restore(value){
    const next=normalize(value);bank=next;epoch++;__EntrophonLiveDefinitions.clear();
    if(typeof window!=='undefined'&&typeof Event==='function')window.dispatchEvent(new Event('xensonar:song-instrument-definitions-changed'));
    return bank;
  }
  function options(type){return Object.entries(bank[type]??{}).map(([value,recipe])=>({value,label:recipe.name+' · '+(type==='nodal'?'Nodal':'Entrophon'),originLabel:type==='nodal'?'Nodal Sounddesign':'Entrophon',hint:'Song instrument'}));}
  return Object.freeze({normalize,capture,restore,find,options,snapshot:()=>bank,epoch:()=>epoch});
})();
function isSavedEntrophonSound(id){return typeof id==='string'&&id.startsWith('entrophon:');}
function entrophonLiveDefinition(id){
  if(!isSavedEntrophonSound(id))return null;
  const owned=__XenSongInstrumentDefinitions.find(id);if(owned)return owned;
  if(__EntrophonLiveDefinitions.has(id))return __EntrophonLiveDefinitions.get(id);
  const value=entrophonFindInstrument(id);
  if(value){if(__EntrophonLiveDefinitions.size>=96)__EntrophonLiveDefinitions.delete(__EntrophonLiveDefinitions.keys().next().value);__EntrophonLiveDefinitions.set(id,value);return value;}
  return null;
}
function entrophonSoundOptions(existing=[]){
  let entries=[];try{entries=__XenEntrophonLibrary.list();}catch{}
  const factory=Yx.map(profile=>({value:'entrophon:factory:'+profile.id+'@1',label:profile.label+' · Entrophon',originLabel:'Entrophon',hint:profile.hint}));
  const owned=__XenSongInstrumentDefinitions.options('entrophon');
  return [...existing,...factory,...owned,...entries.filter(entry=>!owned.some(option=>option.value==='entrophon:'+entry.id+'@'+entry.revision)).map(entry=>({value:'entrophon:'+entry.id+'@'+entry.revision,label:entry.instrument.name+' · Entrophon',originLabel:'Entrophon',hint:'Saved synthetic instrument'}))];
}
function entrophonComposerSourceFields(composer){
  const bank=Object.create(null),stored=composer.entrophonInstruments??{};
  // Keep definitions referenced by a slot or note; replaced drafts must not grow the project forever.
  const keys=new Set();
  for(const track of composer.tracks??[])if(isSavedEntrophonSound(track.instrumentPreset))keys.add(track.instrumentPreset);
  for(const note of composer.notes??[])if(isSavedEntrophonSound(note.instrumentPresetOverride))keys.add(note.instrumentPresetOverride);
  if(keys.size>48)throw new Error('Too many Entrophon project instruments');
  for(const key of keys){
    if(!/^entrophon:.+@[1-9][0-9]*$/.test(key)||key.length>220)throw new Error('Invalid Entrophon project source');
    const value=stored[key]??entrophonFindInstrument(key,composer);
    if(!value)throw new Error('Missing Entrophon instrument: '+key);
    bank[key]=normalizeEntrophonInstrument(value);
  }
  return keys.size?{entrophonInstruments:bank}:{};
}

/* xen-lazy:canonical */

function entrophonScheduleMelodic(ctx,destination,composer,note,track,start,stepSec,source,register){
  const item=source.noteBuffers.get(note.id);if(!item)throw new Error('Entrophon note not prepared: '+note.id);
  const player=ctx.createBufferSource(),pan=ctx.__mlMonoRender?null:ctx.createStereoPanner(),gain=ctx.createGain();
  player.buffer=item.buffer??item;if(pan)pan.pan.value=Math.max(-1,Math.min(1,track.pan??0));gain.gain.value=Math.max(0,Math.min(1,track.volume??.8));
  if(pan){player.connect(pan);pan.connect(gain);}else player.connect(gain);gain.connect(destination);player.start(start+Ax(composer,note)*stepSec);
  register?.(player);if(pan)register?.(pan);register?.(gain);
}

/* xen-lazy:canonical */


/* xen-lazy:canonical */


let __EntrophonMelodicPreparationController=null;
function beginEntrophonMelodicPreparation(){cancelEntrophonMelodicPreparation();__EntrophonMelodicPreparationController=new AbortController();return __EntrophonMelodicPreparationController.signal;}
function cancelEntrophonMelodicPreparation(){__EntrophonMelodicPreparationController?.abort();__EntrophonMelodicPreparationController=null;}
function hasEntrophonMelodicNotes(request){return !request.drumPreviewOnly&&(request.composer.notes??[]).some(note=>{const track=request.composer.tracks.find(t=>t.id===note.trackId);return track&&isSavedEntrophonSound(yW(track,note));});}
