

/* F3.56.45: display-only grouping. Internal preset ids, recipe values and DSP stay unchanged. */
const __f35645PairedMethods=Object.freeze(['gestalt-articulation','gestalt-imprint','gestalt-motion','gestalt-weave','material-flow','signature-pilot','film','air','freeze','wander']);
function __f35645PresetItems(allRecipes,group){
 const family=id=>id.endsWith('-original')?id.slice(0,-9):id;
 const paired=item=>__f35645PairedMethods.includes(family(item.id));
 if(group===0)return allRecipes.filter(paired).sort((a,b)=>{
   const i=__f35645PairedMethods.indexOf(family(a.id))-__f35645PairedMethods.indexOf(family(b.id));
   return i||Number(!a.id.endsWith('-original'))-Number(!b.id.endsWith('-original'));
 });
 if(group===2)return allRecipes.filter(item=>item.id.startsWith('user-'));
 return allRecipes.filter(item=>!item.id.startsWith('user-')&&!paired(item)&&item.values?.engine==='spectral');
}
/* UI summary uses effective connection modes, never the new-link default mode. */
function __f35645Methods(recipe){
 const links=recipe?.links??[];
 const names=[];
 for(const link of links){
   const mode=link.mode==='imprint'?'Imprint'+(link.direction==='A_to_B'?' A→B':link.direction==='B_to_A'?' B→A':''):link.mode==='cross'?'Cross':link.mode==='interlock'?'Interlock':null;
   if(mode&&!names.includes(mode))names.push(mode);
 }
 return names.length?names.join(' + '):'Keine Verbindung';
}