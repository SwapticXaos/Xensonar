'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/forge_and_melodic/10_audition_and_persistence.js', 'utf8');
// Exercise the production job owner with controllable renderer and donor adapters.
// DSP stays outside this test: the existing PCM/browser suites cover its output.
function setup() {
    let donorKey = 'donor-A', recipe = { name: 'A', donor: { revision: 3 } };
    let releaseDonor;
    const releaseRenders=[];
    const counts = { donors: 0, rasters: 0, renders: 0, instruments: [], warnings: 0 };
    const ctx = {
        console: { warn: () => { counts.warnings++; } }, DOMException, __f333Epoch: 0, __f333HearingCache: new Map(),
        IB: () => ({ durationSec: 1, previewPitchRatio: 1 }),
        TR: () => { counts.rasters++; return {}; }, Ti: JSON.stringify, ER: () => 'figure',
        xt: { getContext: () => ({ sampleRate: 8000 }) }, xK: () => null,
        fractaliaDonorSnapshot: () => ({ key: donorKey }),
        __f3562EnsureDonor: () => { counts.donors++; return new Promise(resolve => { releaseDonor = resolve; }); },
        __Fractalia: {
            snapshot: () => recipe, semanticKey: input => input.name,
            renderCarrier: async args => {
                counts.renders++; counts.instruments.push(args.instrument.name);
                args.onProgress?.(.35);
                await new Promise(resolve => { releaseRenders.push(resolve); });
                args.onProgress?.(.7);
                return { length: 8000, numberOfChannels: 1, donorKey };
            }
        }
    };
    vm.createContext(ctx);
    vm.runInContext(
        source.slice(source.indexOf('const __f433HearingBudgetBytes'), source.indexOf('function __f333Stop')) +
        source.slice(source.indexOf('async function __f333RenderHearing('), source.indexOf('// F3.56.5:')),
        ctx
    );
    return {
        ctx, counts,
        render: progress => ctx.__f333RenderHearing({ machineId: 'fractalia-self-carrier', snapshot: {}, onRenderProgress: progress }),
        prepare: () => releaseDonor(), finish: () => releaseRenders.splice(0).forEach(resolve=>resolve()),
        setDonor: key => { donorKey = key; }, setRecipe: next => { recipe = next; }
    };
}
const drain = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
async function scenario(kind) {
    const h = setup();
    const pending = h.render(progress => {
        if(kind==='observer-initial'&&progress===0||kind==='observer-progress'&&progress>.1&&progress<1||kind==='observer-final'&&progress===1)throw Error('broken progress consumer');
        if (progress === 0 && kind === 'donor-before-render') h.setDonor('donor-B');
        if (progress === 0 && kind === 'recipe-after-request') h.setRecipe({ name: 'B', donor: { revision: 3 } });
    }).then(result => ({ outcome: 'ready', key: result.cacheKey }), error => ({ outcome: error.name }));
    if (kind === 'stop-during-prepare') h.ctx.__f333Epoch++;
    h.prepare(); await drain();
    if (kind === 'donor-during-render') h.setDonor('donor-B');
    h.finish();
    const result = await pending;
    return { kind, ...result, ...h.counts, cached: h.ctx.__f333HearingCache.size };
}
async function sharedObserverFailure() {
    const h=setup(),healthy=[];
    const first=h.render(()=>{throw Error('broken first consumer')});
    h.prepare();await drain();
    const second=h.render(value=>healthy.push(value));
    h.prepare();await drain();
    h.finish();
    const [owner,joined]=await Promise.all([first,second]);
    const coldWarnings=h.counts.warnings;
    const cached=h.render(()=>{throw Error('broken cached consumer')});
    h.prepare();await cached;
    return {...h.counts,coldWarnings,healthy,sameBuffer:owner.buffer===joined.buffer,jobs:vm.runInContext('__f447HearingJobs.size',h.ctx)};
}
const watchdog=setTimeout(()=>{console.error('FAIL unresolved hearing request');process.exit(1)},10000);
(async () => {
    const rows = [];
    for (const kind of ['stop-during-prepare', 'donor-before-render', 'donor-during-render', 'recipe-after-request', 'normal', 'observer-initial', 'observer-progress', 'observer-final']) rows.push(await scenario(kind));
    const shared=await sharedObserverFailure();
    fs.writeFileSync('results/forge-request-ownership/render-lifecycle.json', JSON.stringify({rows,shared}, null, 2) + '\n');
    for (const row of rows) {
        if (['stop-during-prepare', 'donor-before-render', 'donor-during-render'].includes(row.kind)) {
            assert.equal(row.outcome, 'AbortError', row.kind + ': an obsolete request cannot become ready');
            assert.equal(row.cached, 0, row.kind + ': no mismatched PCM in cache');
            if (row.kind !== 'donor-during-render') assert.equal(row.rasters, 0, row.kind + ': cancel before raster reconstruction');
        } else {
            assert.equal(row.outcome, 'ready');
            assert.equal(row.cached, 1);
            assert.deepEqual(row.instruments, ['A'], 'render uses the recipe captured by the request');
            assert.equal(row.donors, 1);
            if(row.kind.startsWith('observer-'))assert.equal(row.warnings,1,'failed observer is detached and reported once');
        }
    }
    assert.equal(shared.sameBuffer,true,'healthy consumer joins the original calculation');
    assert.equal(shared.renders,1,'observer failure must not start duplicate synthesis');
    assert.equal(shared.rasters,1);
    assert.equal(shared.coldWarnings,1);assert.equal(shared.warnings,2);
    assert.equal(shared.jobs,0);assert.equal(shared.healthy.at(-1),1);
    clearTimeout(watchdog);
    console.log('PASS stopped donor preparation, donor identity before/during render, captured recipe, shared observers and normal completion');
})().catch(error => { clearTimeout(watchdog);console.error(error); process.exitCode = 1; });
