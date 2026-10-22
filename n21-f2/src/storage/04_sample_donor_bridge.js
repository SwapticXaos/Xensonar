

/* F3.56.9 — Sample ↔ Donor: one persisted audio blob, two independent roles.
 * Sample records remain canonical in xensonar-melodic-samples / samples.
 * Donor presets hold metadata + a cross-store reference, never another PCM copy.
 * Decoding is deliberately lazy and only occurs on Load / Preview / Use as Donor,
 * or when deleting a sample which is still being used as a Donor.
 */
function __createF3569SampleDonorBridge(io) {
  const PRESET = 'donor-library:preset:';
  const isLinked = __F35614AudioRef.isLinkedSample;
  const sampleIdFromAsset = __F35614AudioRef.sampleIdFromAsset;
  const sampleAssetId = __F35614AudioRef.sampleId;
  const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const duration = x => Math.max(.002, Number(x?.durationSec) || .1);
  const clean = x => String(x ?? '').trim().slice(0, 100);
  async function getSample(id) {
    const row = await io.getSample(id);
    if (!row?.blob || !(row.blob.size > 0)) throw new Error('Sample audio is missing: ' + id + '. Please check the sample library.');
    return row;
  }
  async function listSamples() {
    const rows = await io.listSamples();
    return rows.filter(x => typeof x?.id === 'string' && x.id.length && x.name).sort((a, b) => a.name.localeCompare(b.name));
  }
  async function materialize(row) {
    const pcm = await io.decodeAudio(row);
    if (!pcm?.monoSamples?.length && !pcm?.leftSamples?.length) throw new Error('The sample cannot be decoded as a donor.');
    const title=String(row.name || pcm.fileName || 'Sample');
    return { ...pcm, fileName: /\.[a-z0-9]{2,5}$/i.test(title) ? title : title + '.wav', __melodicSampleId:row.id };
  }
  function sourceState(row, asset, name, selection) {
    const d = Math.max(.002, asset?.originalDuration ?? duration(row));
    return {
      id:__F35614AudioRef.sampleId(row.id),
      source: { id:'melodic-donor-' + row.id, kind:'audio', label:name ?? row.name,
        durationSec:d, waveformPreview:asset?.waveformPreview ?? null, sourceAsset:asset },
      selection: selection ?? { detailViewport:{startSec:0,durationSec:d}, fineLoopRange:{startSec:0,durationSec:d} },
      readMode:'hybrid', sourceAdapterId:'local-file', name:name ?? row.name
    };
  }
  async function loadSample(id) {
    const row = await getSample(id), pcm = await materialize(row);
    return sourceState(row, pcm);
  }
  async function loadLinkedPreset(preset) {
    const sampleId = sampleIdFromAsset(preset?.assetId);
    if (!sampleId) throw new Error('The donor is not a linked sample.');
    const row = await getSample(sampleId), asset = await materialize(row);
    const result = sourceState(row, asset, preset.name, preset.selection);
    return { ...result, id:preset.id, source:{...result.source, ...preset.source, sourceAsset:asset,
      waveformPreview:asset.waveformPreview ?? null }, readMode:preset.readMode ?? 'hybrid',
      sourceAdapterId:preset.sourceAdapterId ?? 'local-file', name:preset.name };
  }
  async function donorValues() { return (await io.listDonors()).map(x => x?.value?.version === 'donor-library-v1' ? x.value : x); }
  async function addToDonors(sample, options = {}) {
    const row = await getSample(sample.id);
    const assetId = sampleAssetId(row.id);
    const existing = (await donorValues()).find(x => x.assetId === assetId);
    if (existing) return existing;
    const name = clean(options.name || row.name) || 'Sample Donor';
    const d=duration(row), now=Date.now(), id=makeId();
    const preset = { version:'donor-library-v1', id, assetId, name, tags:[], favorite:false,
      createdAt:now, updatedAt:now, source:{id:'melodic-donor-'+row.id, kind:'audio',label:row.name,
        durationSec:d,sourceAsset:__F35614AudioRef.marker(assetId)},
      selection:{detailViewport:{startSec:0,durationSec:d},fineLoopRange:{startSec:0,durationSec:d}},
      readMode:'hybrid',sourceAdapterId:'local-file',sourceLabel:row.name,durationSec:d,
      selectionStartSec:0,selectionDurationSec:d };
    await io.putDonor({id:PRESET + id,value:preset,updatedAt:now});
    return preset;
  }
  async function detachBeforeSampleDelete(id) {
    const matching = (await donorValues()).filter(x => x.assetId === sampleAssetId(id));
    if (!matching.length) return 0;
    const row = await getSample(id);
    const asset = await materialize(row);
    // Store the replacement raw audio BEFORE removing the only blob reference.
    // One PCM copy is now necessary because the Sample role is going away.
    if (!io.promote) throw new Error('Deleting the sample may not safely preserve linked donors.');
    await io.promote(matching, asset);
    return matching.length;
  }
  function validatePackageSampleRefs(archive) {
    if (!archive?.donorLibrary?.presets) return;
    const names = new Set((archive.samples || []).map(r => r.archivedId));
    for (const entry of archive.donorLibrary.presets) {
      const id = sampleIdFromAsset(entry?.value?.assetId);
      if (id && !names.has(id)) throw new Error('Sample is missing from the experiment package: '+id+' for a linked donor.');
    }
  }
  async function rebindImportedLinks(ids, idMap) {
    let changed=0;
    for (const id of ids) {
      const key=PRESET+id;
      const row = await io.getDonor(key);
      const from=sampleIdFromAsset(row?.value?.assetId);
      if (!from || !idMap.has(from)) continue;
      const to=sampleAssetId(idMap.get(from)), now=Date.now();
      if (to===row.value.assetId) continue;
      await io.putDonor({...row,updatedAt:now,value:{...row.value,assetId:to,
        source:{...row.value.source,sourceAsset:__F35614AudioRef.marker(to)},updatedAt:now}});
      changed++;
    }
    return changed;
  }
  return Object.freeze({listSamples,loadSample,loadLinkedPreset,addToDonors,detachBeforeSampleDelete,
    validatePackageSampleRefs,rebindImportedLinks,sampleIdFromAsset,isLinked});
}
const __F3569SampleDonor = __createF3569SampleDonorBridge({
  listSamples: ()=>gs(),
  async getSample(id) {
    const db = await gee();
    return await new Promise((resolve,reject)=>{
      const request=db.transaction('samples','readonly').objectStore('samples').get(id);
      request.onsuccess=()=>resolve(request.result??null);
      request.onerror=()=>reject(request.error);
    });
  },
  decodeAudio: async(row)=>{
    const blob=row.blob;
    const name=String(row.name||'Sample');
    const type=blob.type||'audio/wav';
    const ext=type.includes('mpeg')?'.mp3':type.includes('flac')?'.flac':type.includes('ogg')?'.ogg':'.wav';
    const file=new File([blob], /\.[a-z0-9]{2,5}$/i.test(name)?name:name+ext,{type});
    return Cg(file);
  },
  listDonors:()=>__DonorLibraryF36.donorLibrary.list(),
  async getDonor(id){return __PaketDonorF3568.getRecord(id);},
  async putDonor(row){await __PaketDonorF3568.putRecords([row],[]);window.dispatchEvent(new Event('xensonar:donor-library-changed'));},
  async promote(presets,pcm){
    const {__melodicSampleId: _sampleLink, ...standalone} = pcm;
    const rawId=__DonorLibraryF36.materialAssetId(standalone),now=Date.now();
    const existing=await __PaketDonorF3568.getRecord(rawId);
    const rows=[];
    if(!existing?.value?.monoSamples?.length)rows.push({id:rawId,value:standalone,updatedAt:now});
    for(const p of presets){
      const old=await __PaketDonorF3568.getRecord('donor-library:preset:'+p.id);
      if(!old)continue;
      rows.push({...old,updatedAt:now,value:{...old.value,assetId:rawId,
        source:{...old.value.source,sourceAsset:__F35614AudioRef.marker(rawId)},updatedAt:now}});
    }
    await __PaketDonorF3568.putRecords(rows,[]);
    window.dispatchEvent(new Event('xensonar:donor-library-changed'));
  }
});

// Material Intake restores only the requested workspace before its editing owner mounts.