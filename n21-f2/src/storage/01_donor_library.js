
const __DonorLibraryF36=(()=>{const module={exports:{}};const exports=module.exports;
"use strict";
/** Donor presets use the existing Material Intake IndexedDB asset namespace.
 * Metadata and selections are small records; raw PCM is stored only once per
 * asset fingerprint. Derived donor analysis / render output is never frozen. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.donorLibrary = void 0;
exports.materialAssetId = materialAssetId;
exports.createDonorLibrary = createDonorLibrary;
exports.DonorLibraryPanel = DonorLibraryPanel;
const DB = 'xensonar-spectral-forge-material-intake-v1';
const PREFIX = 'donor-library:preset:', ASSET = 'asset:';
const finite = __f35612Finite;
/** MUST equal materialIntakePersistence.assetFingerprint; asset namespace is shared. */
function materialAssetId(asset) { return ASSET + __f35612MaterialFingerprint(asset); }
function smallClone(value) {
    // Mask, viewport and labels only. Typed PCM belongs in the asset record, never in metadata.
    return value == null ? null : JSON.parse(JSON.stringify(value));
}
function safeTags(text) {
    return [...new Set(String(text ?? '').split(/[,;\n]/g).map(x => x.trim().slice(0, 35)).filter(Boolean))].slice(0, 12);
}
function safeName(text) {
    const name = String(text ?? '').trim().slice(0, 100);
    if (!name)
        throw new Error("Please enter a name for the donor.");
    return name;
}
function newId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function cleanSource(source, assetId) {
    const clean = {};
    for (const [key, val] of Object.entries(source ?? {})) {
        if (key === 'sourceAsset' || key === 'analysisCache')
            continue;
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null)
            clean[key] = val;
    }
    clean.sourceAsset = __F35614AudioRef.marker(assetId);
    return clean;
}
function createDonorLibrary(storage) {
    return {
        async save(name, tags, state) {
            if (!state?.source?.sourceAsset || !state?.selection?.fineLoopRange)
                throw new Error("First select an audio source and a donor mask.");
            const validName = safeName(name);
            const asset = state.source.sourceAsset, assetId = asset.__melodicSampleId ? __F35614AudioRef.sampleId(asset.__melodicSampleId) : materialAssetId(asset);
            const now = Date.now();
            if (!asset.__melodicSampleId && !await storage.has(assetId)) {
                const { analysisCache: _derived, ...raw } = asset;
                // One structured clone by IndexedDB for a genuinely new raw asset.
                await storage.put({ id: assetId, value: raw, updatedAt: now });
            }
            const preset = {
                version: 'donor-library-v1', id: newId(), assetId,
                name: validName, tags: safeTags(tags), favorite: false,
                createdAt: now, updatedAt: now,
                source: cleanSource(state.source, assetId),
                selection: smallClone(state.selection), readMode: state.readMode ?? 'hybrid',
                sourceAdapterId: state.sourceAdapterId ?? 'local-file',
                sourceLabel: String(state.source.label ?? asset.fileName ?? 'Audio'),
                durationSec: finite(state.source.durationSec ?? asset.durationSec ?? asset.originalDuration),
                selectionStartSec: finite(state.selection.fineLoopRange.startSec),
                selectionDurationSec: finite(state.selection.fineLoopRange.durationSec),
            };
            await storage.put({ id: PREFIX + preset.id, value: preset, updatedAt: now });
            return preset;
        },
        async list() {
            const rows = await storage.list(PREFIX);
            return rows.map(row => row.value).filter(x => x?.version === 'donor-library-v1')
                .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
        },
        async load(id) {
            const preset = (await storage.get(PREFIX + id))?.value;
            if (!preset || preset.version !== 'donor-library-v1')
                throw new Error("This donor was not found.");
            const asset = __F35614AudioRef.isLinkedSample(preset.assetId) ? (await __F3569SampleDonor.loadLinkedPreset(preset)).source.sourceAsset : (await storage.get(preset.assetId))?.value;
            if (!asset?.monoSamples?.length && !asset?.leftSamples?.length)
                throw new Error("The audio data for this donor are no longer available.");
            return { id: preset.id, source: { ...preset.source, sourceAsset: asset, waveformPreview: asset.waveformPreview ?? preset.source.waveformPreview ?? null }, selection: smallClone(preset.selection),
                readMode: preset.readMode, sourceAdapterId: preset.sourceAdapterId, name: preset.name };
        },
        async favorite(id, value) {
            const row = await storage.get(PREFIX + id);
            if (!row?.value || row.value.version !== 'donor-library-v1')
                throw new Error("Donor not found.");
            await storage.put({ ...row, updatedAt: Date.now(), value: { ...row.value, favorite: !!value, updatedAt: Date.now() } });
        },
        async remove(id) {
            // Deliberately retain shared assets; potentially referenced by workspace,
            // session and other presets. No speculative garbage collection.
            await storage.del(PREFIX + id);
        },
    };
}
const records = __f35612RecordStore(DB, {
  unavailable: 'IndexedDB unavailable.', open: 'Cannot open the donor database.',
  readAbort: 'Transaktion abgebrochen.', putAbort: 'Transaktion abgebrochen.',
  deleteAbort: 'Transaktion abgebrochen.',
});
const storage = { ...records, del: records.delete, list: records.listPrefix };
exports.donorLibrary = createDonorLibrary(storage);
/** Mounted only within Material Intake, so no extra browser scroll region. */
function __F36UsePanelController({ React: P, source, externalOpen, disabled, refreshToken }) {
    const open = !!externalOpen, [items, setItems] = P.useState([]);
    const [name, setName] = P.useState(''), [tags, setTags] = P.useState(''), [filter, setFilter] = P.useState('');
    const [working, setWorking] = P.useState(false), [message, setMessage] = P.useState('');
    P.useEffect(() => { setName(String(source?.label ?? source?.sourceAsset?.fileName ?? '').replace(/\.[^.]+$/, '')); }, [source?.sourceAsset]);
    const [sampleMode, setSampleMode] = P.useState(false), [sampleRows,setSampleRows] = P.useState([]);
    P.useEffect(() => { if (!open) return;
      let live=true;
      const update = () => {
        __F3569SampleDonor.listSamples().then(rows => {if(live) setSampleRows(rows);}).catch(e=>{if(live)setMessage(String(e.message??e));});
        exports.donorLibrary.list().then(rows=>{if(live)setItems(rows);}).catch(e=>{if(live)setMessage(String(e.message??e));}); };
      update();
      window.addEventListener('xensonar:donor-library-changed',update);
      window.addEventListener('xensonar:melodic-sample-library-updated',update);
      return ()=>{live=false;window.removeEventListener('xensonar:donor-library-changed',update);window.removeEventListener('xensonar:melodic-sample-library-updated',update);};
    },[open,sampleMode,refreshToken]);
    async function reload() { setItems(await exports.donorLibrary.list()); }
    async function run(action) { if (working || disabled)
        return; setWorking(true); setMessage(''); try {
        await action();
        await reload();
    }
    catch (e) {
        setMessage(e?.name === 'QuotaExceededError' ? "Browser storage full: donor could not be saved." : String(e?.message ?? e));
    }
    finally {
        setWorking(false);
    } }
    return {open,items,name,setName,tags,setTags,filter,setFilter,working,message,setMessage,sampleMode,setSampleMode,sampleRows,run};
}
function DonorLibraryPanel({ React: P, jsx, source, selection, readMode, sourceAdapterId, disabled, onLoad, onActivate, onLoadSelection, onPreview, onPreviewSelection, onStopPreview, externalOpen, onClose, refreshToken }) {
    const {open,items,name,setName,tags,setTags,filter,setFilter,working,message,setMessage,sampleMode,setSampleMode,sampleRows,run}=__F36UsePanelController({React:P,source,externalOpen,disabled,refreshToken});
    const button = (label, action, off = false, title) => jsx.jsx('button', { type: 'button', onClick: action, disabled: off || ((working || disabled) && label !== 'Vorschau stoppen'), title, style: { background: '#113336', color: '#b6f4eb', border: '1px solid #346966', padding: '4px 8px', borderRadius: 5, opacity: off ? .5 : 1, cursor: off ? 'default' : 'pointer' }, children: label });
    const matches = items.filter((x) => `${x.name} ${x.sourceLabel} ${x.tags.join(' ')}`.toLowerCase().includes(filter.trim().toLowerCase()));
    const donorAssetIds = new Set(items.map(p => p.assetId));
    return jsx.jsxs('section', { 'data-donor-library': 'v1', style: { margin: '6px 0 12px', border: '1px solid #275955', borderRadius: 7, padding: '8px 10px', background: '#0b1b20', fontSize: 11 }, children: [
            jsx.jsxs('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [
                    jsx.jsx('strong', { style: { color: '#b6f4eb' }, children: sampleMode ? "Sample Library" : "Donor Library" }),
                    button(sampleMode ? "Switch to Donor Library" : "Switch to Sample Library", () => { setMessage(''); setSampleMode(v=>!v); }),
                    button("Close", () => onClose?.()),
                    jsx.jsx('span', { style: { color: '#78bbb5' }, children: sampleMode ? `${sampleRows.length} saved samples · shared audio references` : `${items.length} saved donor selections · PCM is shared` }),
                ] }),
            open && sampleMode && jsx.jsxs('div',{style:{marginTop:8},children:[
                jsx.jsx('div',{style:{fontSize:10,color:'#83a9a3',marginBottom:7},children:"Use a short Sample directly as Donor, or add it permanently to the Donor Library. Audio remains in the Sample Database; no duplicate PCM is stored."}),
                jsx.jsx('input',{'aria-label':'Search Sample Library',placeholder:'Search samples …',value:filter,onChange:e=>setFilter(e.target.value),style:{width:'100%',marginBottom:7,background:'#06161a',border:'1px solid #2b4b49',color:'#d9f4ef',borderRadius:4,padding:5}}),
                ...sampleRows.filter(row=>`${row.name} ${row.id}`.toLowerCase().includes(filter.trim().toLowerCase())).map(row=>
                    jsx.jsxs('div',{style:{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',padding:'7px 0',borderTop:'1px solid #234340'},children:[
                        jsx.jsxs('div',{style:{flex:'1 1 190px',minWidth:140},children:[
                            jsx.jsx('strong',{style:{color:'#d9f6ef'},children:row.name}),
                            jsx.jsx('div',{style:{fontSize:10,color:'#83a9a3'},children:`${Number(row.durationSec||0).toFixed(2)} s · ${donorAssetIds.has(__F35614AudioRef.sampleId(row.id))?'Sample + Donor':'Sample'}`})
                        ]}),
                        button('Preview',()=>run(async()=>{const value=await __F3569SampleDonor.loadSample(row.id);await onPreview(value);setMessage('Sample preview playing.');})),
                        button('Use as Donor',()=>run(async()=>{await onLoad(await __F3569SampleDonor.loadSample(row.id),true);setMessage('Sample timbre activated as Donor · audio still stored once.');})),
                        button('Load / Edit Mask',()=>run(async()=>{await onLoad(await __F3569SampleDonor.loadSample(row.id),false);setMessage('Sample loaded; choose a mask and save it as a Donor selection if desired.');})),
                        button(donorAssetIds.has(__F35614AudioRef.sampleId(row.id))?'✓ In Donor Library':'Add to Donor Library',()=>run(async()=>{await __F3569SampleDonor.addToDonors(row);setMessage('Sample linked as Donor without audio duplication.');}),donorAssetIds.has(__F35614AudioRef.sampleId(row.id)))
                    ]},row.id)),
                sampleRows.length===0&&jsx.jsx('div',{style:{color:'#83a9a3',padding:7},children:'No samples saved in the Melodic Loop Sample Database.'}),
                message&&jsx.jsx('div',{role:'status',style:{marginTop:7,color:'#e1c17e'},children:message})
            ]}),
            open && !sampleMode && jsx.jsxs('div', { style: { marginTop: 8 }, children: [
                    jsx.jsxs('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }, children: [
                            jsx.jsx('input', { 'aria-label': 'Donor-Name', placeholder: 'Name des Donors', value: name, onChange: (e) => setName(e.target.value), maxLength: 100, style: { minWidth: 175, flex: 1, background: '#06161a', border: '1px solid #3b6663', borderRadius: 4, color: '#e1f7f4', padding: '5px' } }),
                            jsx.jsx('input', { 'aria-label': 'Donor-Tags', placeholder: 'Tags (kommagetrennt)', value: tags, onChange: (e) => setTags(e.target.value), style: { minWidth: 140, flex: 1, background: '#06161a', border: '1px solid #3b6663', borderRadius: 4, color: '#e1f7f4', padding: '5px' } }),
                            button("Save Current Selection", () => run(async () => { await exports.donorLibrary.save(name, tags, { source, selection, readMode, sourceAdapterId }); setMessage('Donor-Auswahl gespeichert.'); }), !source?.sourceAsset || !selection),
                            button("Stop preview", () => onStopPreview?.()),
                        ] }),
                    jsx.jsx('input', { 'aria-label': "Search Donor Library", placeholder: "Search library …", value: filter, onChange: (e) => setFilter(e.target.value), style: { width: '100%', marginBottom: 6, background: '#06161a', border: '1px solid #2b4b49', color: '#d9f4ef', borderRadius: 4, padding: '5px' } }),
                    matches.length === 0 ? jsx.jsx('div', { style: { color: '#7c9d9b', padding: 6 }, children: items.length ? "No matching donors." : "No donors saved yet." }) :
                        jsx.jsx('div', { style: { display: 'grid', gap: 5 }, children: matches.map((item) => jsx.jsxs('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, borderTop: '1px solid #234340', paddingTop: 6 }, children: [
                                    jsx.jsxs('div', { style: { flex: '1 1 190px', minWidth: 150 }, children: [
                                            jsx.jsx('strong', { style: { color: '#d9f6ef' }, children: item.name }),
                                            jsx.jsx('div', { style: { fontSize: 10, color: '#83a9a3' }, children: `${item.sourceLabel} · ${Number(item.selectionStartSec).toFixed(2)}–${Number(item.selectionStartSec + item.selectionDurationSec).toFixed(2)} s · ${item.tags.join(', ')}` }),
                                        ] }),
                                    button(item.favorite ? '★' : '☆', () => run(async () => exports.donorLibrary.favorite(item.id, !item.favorite)), false, 'Favorit'),
                                    button("Preview", () => run(async () => { if(onPreviewSelection)await onPreviewSelection(item.id);else{const value = await exports.donorLibrary.load(item.id); await onPreview(value);} setMessage("Preview playing · stop using the existing audio controls."); })),
                                    button("Load", () => run(async () => { if(onLoadSelection)await onLoadSelection(item.id);else{const value = await exports.donorLibrary.load(item.id); await onLoad(value, false);} setMessage("Donor loaded as source. “Use as Donor” transfers the timbre onto your painted figure; “Send to Workbench” projects the raw sample instead."); })),
                                    button("Use as Donor", () => run(async () => { if(onActivate)await onActivate(item.id);else{const value = await exports.donorLibrary.load(item.id); await onLoad(value, true);} setMessage("Donor timbre activated for the painted figure."); })),
                                    button("Delete", () => { if (window.confirm(`Donor-Auswahl „${item.name}” remove? The audio file will remain available for other selections.`))
                                        void run(async () => exports.donorLibrary.remove(item.id)); }),
                                ] }, item.id)) }),
                    message && jsx.jsx('div', { role: 'status', style: { marginTop: 7, color: '#e1c17e' }, children: message }),
                    jsx.jsx('div', { style: { marginTop: 7, color: '#789b98' }, children: "Audio is read from IndexedDB only when you select “Load”, “Preview” or “Use as Donor”. Carrier and bar position are preserved. Browser storage is tied to the origin of the opened HTML file." }),
                ] }),
        ] });
}

return module.exports;})();