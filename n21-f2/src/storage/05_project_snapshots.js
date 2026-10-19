/* Portable Forge snapshots. Decode and validate before touching the live workspace.
   The workspace archive's generic JSON replacer intentionally drops raw binary;
   this codec protects project arrays explicitly instead of weakening that policy. */
const __ForgeProjectSnapshot = (() => {
  const tag = 'xensonar-project-array-v1', maxBytes = 256 * 1024 * 1024;
  const types = Object.assign(Object.create(null), {Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array});
  const bodyFields = ['bodyMass','sourceTime','sourceBand','sourceWeight','bodyBias','airBias','impactBias','traceBias'];
  const fail = message => { throw new Error('Forge project: ' + message); };
  function codec(value, encode) {
    const ancestors = new Set(); let bytes = 0;
    const charge = count => { bytes += count; if (bytes > maxBytes) fail('snapshot exceeds the 256 MiB data budget.'); };
    function visit(v, depth = 0) {
      if (depth > 64) fail('snapshot nesting is too deep.');
      if (v == null || typeof v !== 'object') return v;
      if (ArrayBuffer.isView(v)) {
        const type = v.constructor.name;
        if (!types[type]) fail('unsupported project array: ' + type);
        charge(v.byteLength);
        if (!encode) return v;
        return {encoding:tag,type,length:v.length,dataBase64:Sw(v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength))};
      }
      if (!encode && v.encoding === tag) {
        const Type = types[v.type], length = v.length;
        if (!Type || !Number.isSafeInteger(length) || length < 0 || typeof v.dataBase64 !== 'string') fail('invalid encoded array.');
        const count = length * Type.BYTES_PER_ELEMENT;
        charge(count);
        // Reject truncated data before allocating its decoded binary buffer.
        if (v.dataBase64.length !== 4 * Math.ceil(count / 3) || /[^A-Za-z0-9+/=]/.test(v.dataBase64)) fail('encoded array length is invalid.');
        const binary = atob(v.dataBase64);
        if (binary.length !== count) fail('decoded array length is invalid.');
        const data = new Uint8Array(count);
        for (let i=0;i<count;i++) data[i]=binary.charCodeAt(i);
        return new Type(data.buffer);
      }
      if (!encode && v.encoding === 'xensonar-project-list-v1') {
        if (!Array.isArray(v.chunks) || !Number.isSafeInteger(v.length) || v.length < 0 || v.length > maxBytes/8) fail('invalid encoded list.');
        const result = [];
        for (const chunk of v.chunks) {
          if (!Array.isArray(chunk) || chunk.length > 8192 || result.length+chunk.length > v.length) fail('invalid list chunk.');
          for (const item of chunk) result.push(visit(item,depth+1));
        }
        if (result.length !== v.length) fail('encoded list length is invalid.');
        charge(result.length*8);return result;
      }
      if (!encode && (v.xensonarArchiveOmittedTypedArray || v.xensonarArchiveOmittedBinary || v.xensonarArchiveTruncatedNumberArray)) {
        // Historic exports may contain a complete short preview. Recover only
        // complete data, never silently manufacture missing samples.
        const Type=types[v.type];
        if (Type && Number.isSafeInteger(v.length) && Array.isArray(v.preview) && v.preview.length===v.length) {
          charge(v.length*Type.BYTES_PER_ELEMENT);return Type.from(v.preview);
        }
        fail('this older archive omitted project data. Use the original browser workspace or a complete backup.');
      }
      if (ancestors.has(v)) fail('cyclic snapshot.');
      ancestors.add(v);
      let result;
      if (Array.isArray(v)) {
        charge(v.length*8);
        if (encode && v.length > 8192) {
          const chunks=[];
          for(let start=0;start<v.length;start+=8192) chunks.push(v.slice(start,start+8192).map(x=>visit(x,depth+1)));
          result={encoding:'xensonar-project-list-v1',length:v.length,chunks};
        } else result=v.map(x=>visit(x,depth+1));
      } else result=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x,depth+1)]));
      ancestors.delete(v);return result;
    }
    return visit(value);
  }
  function finiteArray(value, length, label) {
    if (!(value instanceof Float32Array) && !Array.isArray(value)) fail(label+' is not an array.');
    if (value.length !== length) fail(label+' has the wrong length.');
    for (const sample of value) if (!Number.isFinite(sample)) fail(label+' contains a non-finite value.');
    const normalized=value instanceof Float32Array ? value : Float32Array.from(value);
    if(normalized!==value)for(const sample of normalized)if(!Number.isFinite(sample))fail(label+' exceeds Float32 range.');
    return normalized;
  }
  function bodySnapshot(value, grid, stamp = false) {
    if (!value || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height) || value.width<0 || value.height<0) fail('invalid body dimensions.');
    const cells=value.width*value.height;
    if (!Number.isSafeInteger(cells) || cells>grid.width*grid.height || (!stamp && cells && (value.width!==grid.width || value.height!==grid.height))) fail('body dimensions do not match this workspace.');
    const body={...value};
    for(const key of bodyFields) body[key]=finiteArray(value[key],cells,'body.'+key);
    if(!stamp) body.stampMeta=value.stampMeta ? bodySnapshot(value.stampMeta,grid,true) : null;
    return body;
  }
  function prepare(input, state) {
    const snapshot=codec(input,false),grid=state.spectralData;
    if (!snapshot || (snapshot.version != null && snapshot.version!=='spectral-forge-project-v1')) fail('unsupported snapshot version.');
    const length=snapshot.spectralSnapshot?.length,cells=grid.width*grid.height;
    if (length!==cells && length!==cells*2) fail('raster dimensions do not match this workspace.');
    snapshot.spectralSnapshot=finiteArray(snapshot.spectralSnapshot,length,'raster');
    for(const field of ['materialExport','viewPort','waveformMix']) if (!snapshot[field] || typeof snapshot[field]!=='object' || Array.isArray(snapshot[field])) fail('missing '+field+'.');
    if(snapshot.materialExport.guideMarkers != null && !Array.isArray(snapshot.materialExport.guideMarkers)) fail('invalid guide markers.');
    // Allocate all body copies during preparation. Commit can adopt them without
    // a second full-size body copy or a restore that fails halfway through.
    const body=new xDe();
    if(snapshot.bodySnapshot) body.restoreSnapshot(bodySnapshot(snapshot.bodySnapshot,grid));
    const profiles=CR(snapshot.toolProfiles),activeTool=snapshot.activeTool in profiles?snapshot.activeTool:'brush';
    const fields={activeTool,toolProfiles:profiles,toolSettings:qr(activeTool,profiles[activeTool]),
      materialExport:{...snapshot.materialExport,bars:Da(snapshot.materialExport.bars),beatsPerBar:Math.max(1,Math.min(16,Math.round(snapshot.materialExport.beatsPerBar??4))),guideSegments:cc(snapshot.materialExport.guideSegments),guideMarkers:nR(snapshot.materialExport.guideMarkers??yu(snapshot.materialExport.guideSegments),snapshot.materialExport.guideSegments),beatGuideVolume:Math.max(0,Math.min(1,snapshot.materialExport.beatGuideVolume??.35))},
      viewPort:__forgeRestoreViewport(snapshot.viewPort),
      carrierIntegralSelection:F0(snapshot.carrierIntegralSelection??null,state.carrierIntegralSelection),
      carrierIntegralSynthLab:Rg(snapshot.carrierIntegralSynthLab??null,state.carrierIntegralSynthLab),
      carrierIntegralHarmonicXplore:snapshot.carrierIntegralHarmonicXplore?oi(snapshot.carrierIntegralHarmonicXplore,state.carrierIntegralHarmonicXplore):NM(snapshot.carrierIntegralSynthLab??null,state.carrierIntegralHarmonicXplore)};
    if(snapshot.fractaliaInstrument!=null) snapshot.fractaliaInstrument=__Fractalia.core.settings(snapshot.fractaliaInstrument);
    return {snapshot,body,fields};
  }
  return Object.freeze({encode:value=>codec(value,true),decode:value=>codec(value,false),prepare});
})();
