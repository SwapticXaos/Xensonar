
function __f35636PortableRevision(bytes){let a=2166136261,b=2246822519;for(let i=0;i<bytes.length;i++){a=Math.imul(a^bytes[i],16777619);b=Math.imul(b^bytes[i],3266489917);}return 'pcm64:'+bytes.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);}
async function __f35636RevisionMatches(bytes,expected,sr=null,count=null){
 if(typeof expected!=='string')return false;if(expected.startsWith('pcm64:'))return __f35636PortableRevision(bytes)===expected;
 const digest=await __f35635Digest(bytes);return (sr==null?digest:digest+':'+sr+':'+count)===expected;
}
async function __f35636SessionFile(value){
  const entries=[];for(const slot of ['A','B','result']){const s=slot==='result'?value.result:value.sources[slot];if(s)entries.push({slot,sampleRate:s.sampleRate,length:s.samples.length,revision:s.revision,duration:s.duration,pcmRevision:__f35636PortableRevision(new Uint8Array(s.samples.buffer,s.samples.byteOffset,s.samples.byteLength))});}
  const grid=value.carrier?.spectralSnapshot?new Float32Array(value.carrier.spectralSnapshot):null;
  if(grid)entries.push({slot:'carrier-grid',length:grid.length,pcmRevision:__f35636PortableRevision(new Uint8Array(grid.buffer))});
  const encoder=new TextEncoder(),header=encoder.encode(JSON.stringify({schema:'xensonar-dual-donor-session-v2',plan:value.plan,settings:value.settings,
    carrier:value.carrier?{...value.carrier,spectralSnapshot:null}:null,workbench:value.workbench??null,combination:value.combination??null,stateContractVersion:3,renderContext:value.renderContext??null,resultManifest:value.result?.manifest??null,resultRevision:value.result?.revision??null,
    pcm:entries}));
  const size=new ArrayBuffer(4);new DataView(size).setUint32(0,header.length,true);return new Blob([new Uint8Array([88,68,83,49]),size,header,...['A','B','result'].map(slot=>slot==='result'?value.result?.samples:value.sources[slot]?.samples).filter(Boolean),...(grid?[grid]:[])],{type:'application/octet-stream'});
}
async function __f35636ReadSession(file){
  if(file.size>72*1024*1024||file.size<12)throw Error('Invalid session size.');const bytes=await file.arrayBuffer(),v=new DataView(bytes);
  if(v.getUint32(0,false)!==0x58445331)throw Error('Not a Dual Donor audio session.');const len=v.getUint32(4,true);if(len>12*1024*1024||len+8>bytes.byteLength)throw Error('Invalid session header.');
  const h=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,8,len)));if(!['xensonar-dual-donor-session-v1','xensonar-dual-donor-session-v2'].includes(h.schema))throw Error('Unsupported audio session.');
  const sources={A:null,B:null},slots=new Set();let result=null,at=8+len;
  for(const p of h.pcm){const grid=p.slot==='carrier-grid';if(!['A','B','result','carrier-grid'].includes(p.slot)||!Number.isSafeInteger(p.length)||p.length<(grid?1:256)||p.length>12000000||(!grid&&!(p.sampleRate>=8000&&p.sampleRate<=192000))||at+p.length*4>bytes.byteLength)throw Error('Invalid session audio.');
    if(slots.has(p.slot))throw Error('Duplicate session audio.');slots.add(p.slot);
    const samples=new Float32Array(bytes.slice(at,at+p.length*4));at+=p.length*4;for(const x of samples)if(!Number.isFinite(x))throw Error('Session contains invalid audio.');
    if(grid){if(!h.carrier||!(await __f35636RevisionMatches(new Uint8Array(samples.buffer),p.pcmRevision)))throw Error('Carrier figure does not match its content revision.');h.carrier.spectralSnapshot=samples;continue;}
    const source={samples,sampleRate:p.sampleRate,duration:p.length/p.sampleRate,revision:p.revision};
    if(!(await __f35636RevisionMatches(new Uint8Array(samples.buffer),p.pcmRevision,p.sampleRate,p.length)))throw Error('Session audio does not match its saved content revision.');
    if(p.slot==='result')result={...source,manifest:h.resultManifest};else sources[p.slot]=source;
  }
  if(at!==bytes.byteLength)throw Error('Unexpected trailing session data.');
  if(!sources.A||!sources.B)throw Error('Session needs both original donor recordings.');
  if(result&&(!h.resultManifest?.recipe||!Array.isArray(h.resultManifest.recipe.links)||typeof h.resultManifest.key!=='string'))throw Error('Completed audio has no valid saved render recipe.');
  if(result)result.manifest={...result.manifest,recipe:__f35634Clean(result.manifest.recipe)};
  const plan=__f35634Clean({...h.plan,revision:h.plan?.revision??(h.resultManifest?.version==='dual-donor-spectral-body-f3.56.36'?'original':'revised')});
  // Assess freshness BEFORE source revisions are rebound to the verified imported PCM.
  // A completed old render stays available even if today's draft cannot be rendered yet.
  let current=false;
  if(result&&h.resultManifest){try{
    current=h.resultManifest.version===__F35636DualDSP.forPlan(plan).version&&
      h.resultManifest.key===__F35636DualDSP.key(plan,sources,h.settings??{});
  }catch{/* An incomplete or edited draft does not invalidate the old audio itself. */}}
  for(const slot of ['A','B']){const revision=await __f35635PCMRevision(sources[slot]);
    // Session files bind marks to the actual imported PCM, not to a carried-over label.
    sources[slot].revision=revision;plan.sources[slot]={...plan.sources[slot],kind:'file',id:'session:'+revision,revision};}
  if(result){result.revision=await __f35635PCMRevision(result);
    result.manifest=current?{...result.manifest,key:__F35636DualDSP.key(plan,sources,h.settings??{}),sourceRevisions:{A:sources.A.revision,B:sources.B.revision},recipe:plan}:
      {...result.manifest,key:'last-render:'+(result.manifest?.key??result.revision)};}
  return {plan,sources,result,settings:h.settings,carrier:h.carrier,workbench:h.workbench,combination:h.combination,renderContext:h.renderContext??null};
}