/* XenSonar P2.7: additional cold-path reference adapters.
 * These are ADVISORY edges, not deletion authority: Material Tracks can preexist,
 * Drum playlist IDs may designate local or built-in sources, and Nodal instruments
 * may live in the separately persisted Nodal library rather than the composer.
 * No IDB access, audio decoding, PCM copies, writes or automatic repair.
 */
const __XenReferenceGraphP27 = (() => {
  const modes=new Set(['merge','replace','differential']);
  const adapters=Object.freeze([
    'rootFollowBank.memberIds -> materialLibrary.entries.archivedId',
    'drumConfigLibrary.playlist.(orderedIds|hiddenIds) exported: -> entries.id',
    'composer.tracks.instrumentPreset nodal: -> composer.nodalInstruments / external library'
  ]);
  const frozen=a=>Object.freeze(a);
  const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const edge=(kind,source,targetScope,targetId,path,status)=>
    Object.freeze({kind,source,targetScope,targetId,path,status,origin:'import'});
  function inspect({archive,mode}) {
    if(!modes.has(mode))throw new TypeError('Invalid reference-graph mode');
    if(!isRecord(archive)||!Array.isArray(archive.projects))
      throw new TypeError('P2.7 needs validated project inventory');
    const material=archive.materialLibrary;
    if(material!=null&&!Array.isArray(material.entries))
      throw new TypeError('Invalid Material Track entries');
    const bank=archive.rootFollowBank;
    if(bank!=null&&!Array.isArray(bank.memberIds))
      throw new TypeError('Invalid Root Follow memberIds');
    const drums=archive.drumConfigLibrary;
    if(drums!=null&&!Array.isArray(drums.entries))
      throw new TypeError('Invalid Drum Configuration entries');
    const playlist=drums?.playlist;
    if(playlist!=null&&(!Array.isArray(playlist.orderedIds)||!Array.isArray(playlist.hiddenIds)))
      throw new TypeError('Invalid Drum playlist orderedIds / hiddenIds');
    const mats=new Set((material?.entries??[]).map(x=>x?.archivedId).filter(x=>typeof x==='string'));
    const configs=new Set((drums?.entries??[]).map(x=>x?.id).filter(x=>typeof x==='string'));
    const edges=[];
    // Exported Root Follow IDs are historic Material Track IDs; CLe() remaps them on import.
    bank?.memberIds.forEach((id,i)=>{
      if(typeof id==='string'&&id.length)edges.push(edge('root-follow.material','Root Follow bank',
        'material-library',id,`rootFollowBank.memberIds[${i}]`,
        mats.has(id)?'packaged':'external-possible'));
    });
    // The drum playlist contains both built-in preset:* and exported:<config-id> tiles.
    // Only exported entries refer to a saved drum config. IDB inventory is unavailable
    // at this point, so absence from the *archive* is not proof of a broken local ref.
    for(const field of ['orderedIds','hiddenIds']){
      playlist?.[field].forEach((id,i)=>{
        if(typeof id!=='string'||!id.startsWith('exported:'))return;
        const target=id.slice('exported:'.length);
        if(!target)return;
        edges.push(edge('drum-playlist.exported','Drum playlist',
          'drum-config-library',target,`drumConfigLibrary.playlist.${field}[${i}]`,
          configs.has(target)?'packaged':'external-possible'));
      });
    }
    function scanComposer(composer,source){
      if(!Array.isArray(composer?.tracks))return;
      const embedded=isRecord(composer.nodalInstruments)?composer.nodalInstruments:{};
      composer.tracks.forEach((track,i)=>{
        const preset=track?.instrumentPreset;
        if(typeof preset!=='string'||!preset.startsWith('nodal:')||preset.length<=6)return;
        // Runtime resolver looks up composer.nodalInstruments before __XenNodalLibrary.
        const present=Object.prototype.hasOwnProperty.call(embedded,preset)&&embedded[preset]!=null;
        edges.push(edge('composer.nodal',source,'nodal-instrument',preset,
          `composer.tracks[${i}].instrumentPreset`,present?'embedded':'external-possible'));
      });
    }
    scanComposer(archive.workspace?.composer,'Workspace');
    archive.projects.forEach((p,i)=>scanComposer(p?.composer,
      'Project '+String(p?.name??p?.id??i).slice(0,100)));
    const unresolved=edges.filter(x=>x.status==='external-possible');
    // The completed P2.6 graph performs hard preflight validation on confirmed
    // package-private refs. P2.7 deliberately cannot make such claims here.
    return Object.freeze({schemaVersion:1,mode,adapters,edges:frozen(edges),
      unresolved:frozen(unresolved),counts:Object.freeze({edges:edges.length,
        unresolved:unresolved.length,definitivelyMissing:0}),
      coverage:'Root Follow -> Material IDs, drum exported playlist IDs, composer -> Nodal preset; advisory only',
      safety:'No automatic missing/deletion decision without local library inventories'});
  }
  return Object.freeze({schemaVersion:1,adapters,inspect});
})();
