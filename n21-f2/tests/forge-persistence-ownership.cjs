'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), { load } = require('./offline_runtime.cjs');
const h = load(process.cwd());
const watchdog = setTimeout(() => { console.error("FAIL unresolved persistence operation"); process.exit(1); }, 15000);
(async () => {
    const results = await h.run(`
(async () => {
    const create = __ForgeF33.createExperimentStatePersistenceController;
    const spin = async (predicate) => { for (let i = 0; i < 100 && !predicate(); i++)
        await Promise.resolve(); if (!predicate())
        throw Error('Async boundary not reached'); };
    async function duplicateStart() {
        let release, reads = 0, releases = [], storeSubs = 0, storeUnsubs = 0, runtimeSubs = 0, runtimeUnsubs = 0;
        const controller = create({ store: { getState: () => pe.getState(), subscribe: () => { storeSubs++; return () => storeUnsubs++; } }, runtime: { getSnapshot: () => Vt.getSnapshot(), subscribe: () => { runtimeSubs++; return () => runtimeUnsubs++; } }, prepareDonor: async () => null, storage: { get: () => { reads++; return new Promise(r => { release = r; releases.push(r); }); }, put: async () => { } } });
        const a = controller.start(), b = controller.start();
        await spin(() => !!release);
        releases.splice(0).forEach(r => r(null));
        await Promise.all([a, b]);
        const c = controller.start();
        for (let i = 0; i < 20; i++)
            await Promise.resolve();
        releases.splice(0).forEach(r => r(null));
        await c;
        controller.dispose();
        return { reads, storeSubs, storeUnsubs, runtimeSubs, runtimeUnsubs };
    }
    async function overlappingRestore() { let reads = 0, release, releases = []; const controller = create({ store: pe, runtime: Vt, prepareDonor: async () => null, storage: { get: () => { reads++; return new Promise(r => { release = r; releases.push(r); }); }, put: async () => { } } }); const a = controller.restore(), b = controller.restore(); await spin(() => !!release); releases.forEach(r => r(null)); await Promise.all([a, b]); controller.dispose(); return { reads }; }
    async function queuedRestore(dispose) {
        let writes = 0, reads = 0, release;
        const snapshot = pe.getState().createProjectSnapshot();
        snapshot.materialExport.name = 'Old restored name';
        const record = { value: { version: 'spectral-forge-experiment-v1', projectSnapshot: snapshot } };
        const controller = create({ store: pe, runtime: Vt, prepareDonor: async () => null, storage: { get: async () => { reads++; return reads === 1 ? null : record; }, put: () => { writes++; return writes === 1 ? new Promise(r => release = r) : Promise.resolve(); } } });
        await controller.start();
        const saving = controller.saveNow();
        await spin(() => !!release);
        const beforeReads = reads;
        const loading = controller.restore();
        if (dispose)
            controller.dispose();
        else {
            pe.getState().updateMaterialExport({ name: 'New edit while waiting' });
            __f333RestoreBarrier++;
        }
        release();
        await saving;
        await loading;
        const result = { readsAfterWaiting: reads - beforeReads, name: pe.getState().materialExport.name, status: controller.status(), writes };
        controller.dispose();
        return result;
    }
    async function retryRestore() { let reads = 0; const controller = create({ store: pe, runtime: Vt, prepareDonor: async () => null, storage: { get: async () => { reads++; if (reads === 1)
                throw Error('temporary storage failure'); return null; }, put: async () => { } } }); await controller.restore(); const failed = controller.status().lastError; await controller.restore(); const recovered = controller.status().lastError; controller.dispose(); await controller.start(); await controller.restore(); return { reads, failed, recovered }; }
    async function lateError() { let reject; const controller = create({ store: pe, runtime: Vt, prepareDonor: async () => null, storage: { get: () => new Promise((a, b) => reject = b), put: async () => { } } }); const pending = controller.start(); await spin(() => !!reject); controller.dispose(); const before = controller.status().lastError; reject(Error('obsolete read failure')); await pending; return { unchanged: before === controller.status().lastError, complete: controller.status().restoreComplete }; }
    return { start: await duplicateStart(), restore: await overlappingRestore(), disposed: await queuedRestore(true), edited: await queuedRestore(false), retry: await retryRestore(), lateError: await lateError() };
})();
`);
    fs.writeFileSync('results/architecture-stability/persistence-ownership.json', JSON.stringify(results, null, 2) + '\n');
    assert.equal(results.start.reads, 1, 'start must install and restore only once');
    for (const kind of ['store', 'runtime']) {
        assert.equal(results.start[kind + 'Subs'], 1);
        assert.equal(results.start[kind + 'Unsubs'], 1, 'every subscription must have one owner and cleanup');
    }
    assert.equal(results.restore.reads, 1, 'overlapping restore calls must share one read');
    assert.equal(results.disposed.readsAfterWaiting, 0, 'disposed owner must not start another DB read after queued save');
    assert.equal(results.edited.name, 'New edit while waiting', 'restore must respect edits made while waiting for a save');
    assert.equal(results.edited.status.restoreSkippedForInteraction, true);
    assert.equal(results.retry.reads, 2, 'a later restore can retry after failure, while disposal forbids restart');
    assert.equal(results.retry.failed, 'temporary storage failure');
    assert.equal(results.retry.recovered, null);
    assert.equal(results.lateError.unchanged, true, 'late failures cannot overwrite the disposed owner error');
    assert.equal(results.lateError.complete, false);
    clearTimeout(watchdog);
    console.log('PASS single persistence owner, joined restore, balanced subscriptions, disposal and edits while writes drain');
})().catch(error => { clearTimeout(watchdog); console.error(error); process.exitCode = 1; });
