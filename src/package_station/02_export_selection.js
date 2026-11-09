/* Package Station 4.1: one category catalogue for the checkboxes, export scope,
 * reference closure and selected-category restore. No storage access at boot. */
const __XenPackageSelection41=(()=>{
 const groups=[
  {id:'projects',label:'Projekte & Arbeitsstände',items:[
   ['sessions','Sessions & Quick Rack'],['melodicProjects','Melodic-Projekte'],['figureProjects','Figure-Projekte'],
   ['currentEditor','Aktueller Forge- / Melodic-Stand'],['currentMain','Aktueller Hauptraum'],['dualDonor','Dual-Donor-Arbeitsstand'],['fractaliaExperiments','Fractalia-Materialexperimente']]},
  {id:'audio',label:'Audio & Material',items:[['samples','Samples & Uploads'],['materials','Materialspuren & Root Follow'],['donors','Donor-Bibliothek']]},
  {id:'music',label:'Instrumente & Vorlagen',items:[['drums','Drum-Patterns & Playlists'],['bass','Bass-Patterns'],['grids','Raster & Stimmungen'],['instruments','Nodal- & Entrophon-Instrumente'],['stamps','Stempel & eigene Vorlagen'],['emilia','Emilia-Konfigurationen'],['fractalia','Fractalia-Instrumente & Einstellungen'],['customMelodic','Eigene Melodic-Instrumente']]},
  {id:'preferences',label:'Einstellungen & Sammlungen',items:[['mixer','EQ, Pan & Klangregler'],['settings','Bedienung, Ansichten & Hörweisen'],['favorites','Favoriten, Notizen & Wheel']]},
  {id:'internal',label:'Interne Sicherungen & Altbestände',items:[['recovery','Letzte Sicherungsstände & History'],['unusedAssets','Forge-Assets (Verwendung prüfen)'],['sampleMirror','Sample-Metadaten-Spiegel'],['sessionMirror','Session-Spiegel'],['otherDatabases','Weitere XenSonar-Datenbanken']]}
 ];
 const ids=groups.flatMap(g=>g.items.map(x=>x[0])),allowed=new Set(ids);
 function normalize(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Paketstation: Ungültige Inhaltsauswahl.');for(const key of Object.keys(value))if(!allowed.has(key))throw Error('Paketstation: Unbekannte Inhaltsrubrik.');return Object.fromEntries(ids.map(id=>[id,value[id]===true]))}
 function keyCategory(key){
  if(key==='xensonar.working-session.v1')return'currentMain';
  if(key==='xensonar.quickrack.eq.tool-preference.v1')return'settings';
  if(/history|last-good|last-good/i.test(key))return'recovery';
  if(/dual-donor/.test(key))return'dualDonor';
  if(/emilia/.test(key))return'emilia';
  if(/fractalia/.test(key))return'fractalia';
  if(/melodic\.custom-instruments/.test(key))return'customMelodic';
  if(/meta-sessions|song-projects|quick-menu/.test(key))return'sessions';
  if(/melodic-loop-projects/.test(key))return'melodicProjects';
  if(/nodal\.melodic-session|level3lab|l3lab|forge.*session|dual-donor-session|spectral-forge:material-intake|spectralforge-v2|emilia.*draft|hybrid-session|combination-rack|donor-workbench/.test(key))return'currentEditor';
  if(/root-follow-loop-bank|rootFollow\.granular|material-library/.test(key))return'materials';
  if(/bass-clip-library|bass-live-scratch/.test(key))return'bass';
  if(/drum-pattern-playlist|drum.*memory/.test(key))return'drums';
  if(/grid-tuning|grid-library/.test(key))return'grids';
  if(/instruments|sounddesigner|dual-donor-blueprint/.test(key))return'instruments';
  if(/donor.*preset|donor.*recipe|active-library-donor/.test(key))return'donors';
  if(/eq\.|mix-pan|source-octaves|refucktor|entrophonUnifiedSoundConfig/.test(key))return'mixer';
  if(/worldFavorites|worldNotes/.test(key))return'favorites';
  if(/main-room-live|main:rhythm-scratchpad/.test(key))return'currentMain';
  return'settings';
 }
 function recordCategory(db,store,key){
  if(db==='xensonar-melodic-compact-v1'){
   if(store==='projects')return 'melodicProjects';
   if(store==='working')return 'currentEditor';
   if(store==='instruments')return 'instruments';
   if(store==='control')return key==='working'?'currentEditor':'melodicProjects';
  }
  if(db==='xensonar-melodic-samples')return'samples';
  if(db==='xensonar-material-library')return'materials';
  if(db==='xensonar-drum-config-library')return'drums';
  if(db==='xensonar-spectral-forge-custom-stamps')return'stamps';
  if(db==='xensonar-spectral-forge-projects'||db==='xensonar-canonical-forge-projects')return'figureProjects';
  if(db==='xensonar-melodic-metadata-m6')return'sampleMirror';
  if(db==='xensonar-meta-archive-m9')return'sessionMirror';
  if(db==='xensonar-spectral-forge-material-intake-v1'){
   if(String(key).startsWith('asset:'))return'unusedAssets';
   if(String(key).startsWith('donor-library:preset:'))return'donors';
   return'currentEditor';
  }
  if(db==='xensonar-spectral-forge-experiment-state'){
   if(String(key).startsWith('asset:'))return'unusedAssets';
   return /last-good|backup|history/.test(String(key))?'recovery':'currentEditor';
  }
  if(db==='xensonar-dual-donor-material-f35636')return'dualDonor';
  if(db==='xensonar.fractalia.material-experiments')return'fractaliaExperiments';
  return'otherDatabases';
 }
 function scope(value){const selected=normalize(value);return {version:1,selected,complete:ids.every(id=>selected[id])}}
 return Object.freeze({groups,ids,all:()=>Object.fromEntries(ids.map(id=>[id,true])),none:()=>Object.fromEntries(ids.map(id=>[id,false])),normalize,keyCategory,recordCategory,scope});
})();
