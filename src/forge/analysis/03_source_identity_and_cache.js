

/* F3.53: donor-conditioned structural planning. No oscillator or PCM is returned
 * by this module. Carrier run boundaries and target curves remain unchanged.
 * Historical inspirations: Bert (continuity), Antonia (event role), Cecilia
 * (within-event energy movement), HX (measured native register). L1 transfers.
 */


/* Content keys read only the selected PCM (at most eight seconds), once per
 * array/selection. IndexedDB supplies new arrays on load; equal audio still
 * reaches the same offline analysis and rendered result. */
var __F353SourceIdentity=(()=>{
 const memo=new WeakMap();
 function channel(pcm,sr,start,duration){if(!pcm?.length)return 'none';const a=Math.max(0,Math.round(start*sr)),b=Math.min(pcm.length,a+Math.round(duration*sr)),key=sr+':'+a+':'+b;let entries=memo.get(pcm);if(!entries){entries=new Map();memo.set(pcm,entries);}if(entries.has(key))return entries.get(key);
  const words=new Uint32Array(pcm.buffer,pcm.byteOffset,pcm.length);let x=2166136261,y=2246822519;for(let i=a;i<b;i++){x=Math.imul(x^words[i],16777619);y=Math.imul(y^words[i],3266489917);}const value=[sr,b-a,x>>>0,y>>>0].join(':');entries.set(key,value);if(entries.size>16)entries.delete(entries.keys().next().value);return value;
 }
 function key(source){if(!source)return 'missing';const sr=source.sampleRate,start=source.importStartSec,duration=source.importDurationSec;return [source.fileName??'',start,duration,channel(source.leftSamples??source.monoSamples,sr,start,duration),source.channelCount>1?channel(source.rightSamples,sr,start,duration):'mono'].join('|');}
 return Object.freeze({key});
})();
var __F353AnalysisCache=__createF353AnalysisCache({keyForSource:source=>__F353SourceIdentity.key(source),prepareSource:(source,isCancelled)=>__f353PrepareDonorBase(source,isCancelled),sizeOfValue:__f353AnalysisSize});