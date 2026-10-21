'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { load, PCMBuffer } = require('./offline_runtime.cjs');
const h = load(process.cwd());
h.context.requestProbe = new PCMBuffer({ numberOfChannels: 1, length: 128, sampleRate: 48000 });
h.context.requestProbe.getChannelData(0).fill(.2);
(async () => {
    const report = await h.run(`(async () => {
        xt.ctx={sampleRate:48000};
        pe.setState({spectralData:new ph(32,32)});
        pe.getState().spectralData.set(9,18,.5);
        __F35611DonorIntent=false;Vt.selectCarrier();
        const rows=[];
        for(const mode of ['pure-dieter','emilia','fractalia','harmonic-xplore','spektral-synthese','antonia','bert','cecilia']) {
            const option=LGe.find(x=>x.id===mode);
            pe.getState().setCarrierIntegralSelection({machineId:option.machineId,source:'user'});
            if(option.harmonicXploreProfileId)pe.getState().setCarrierIntegralHarmonicXplore({profileId:option.harmonicXploreProfileId,source:'user'});
            for(const loop of [false,true]) {
                pe.getState().updateMaterialExport({bars:1,bpm:180,loopPreview:loop});
                const state=pe.getState(),request=__f333HearingRequest(state,undefined,'hearing');
                const reference=OB({projectName:state.materialExport.name,snapshot:state.createProjectSnapshot(),machineId:state.carrierIntegralSelection.machineId,valueSource:'right-override',selection:state.carrierIntegralSelection,synthLab:state.carrierIntegralSynthLab,harmonicXplore:state.carrierIntegralHarmonicXplore,previewBpm:state.materialExport.bpm,previewGain:1,previewPitchSemitones:__f3565PitchSemis(),loopPreview:state.materialExport.loopPreview});
                const key=__f333HearingCacheKey(request,IB(request));
                rows.push({mode,loop,exactKey:key===__f333HearingCacheKey(reference,IB(reference)),exactContext:JSON.stringify(IB(request))===JSON.stringify(IB(reference))});
            }
        }
        const original=__f333HearingRequest,calls=[];
        __f333HearingRequest=(...args)=>{calls.push(args[2]);return original(...args)};
        try {
            for(const route of ['hearing','carrier']) {
                pe.getState().setCarrierIntegralSelection({machineId:'raw-darkpsy-oscillator',source:route==='carrier'?'default':'user'});
                const state=pe.getState();
                const request=original(state,undefined,route),key=__f333HearingCacheKey(request,IB(request));
                __f433RememberHearing(key,requestProbe);calls.length=0;
                if(!__f333CachedPreviewReady(state))throw Error('exact PCM should be ready');
                const rendered=await __f333RenderCurrentRaw(state);
                if(rendered.buffer!==requestProbe||!rendered.cacheHit)throw Error('Play must reuse the exact ready PCM');
                rows.push({route,callers:[...calls],renderedRoute:rendered.route,cacheHit:rendered.cacheHit,loopPreview:request.loopPreview});
            }
        }finally{__f333HearingRequest=original}
        const one=original(pe.getState()),two=original(pe.getState()),before=two.snapshot.spectralSnapshot[0];
        one.snapshot.spectralSnapshot[0]=.999;
        return {rows,privateSnapshots:one.snapshot!==two.snapshot&&two.snapshot.spectralSnapshot[0]===before&&pe.getState().spectralData.get(0,0)!==.999};
    })()`);
    for (const row of report.rows) {
        if (row.mode) {
            assert.equal(row.exactKey, true, row.mode + ': unchanged PCM cache identity');
            assert.equal(row.exactContext, true, row.mode + ': unchanged synthesis parameters');
        } else {
            assert.deepEqual(Array.from(row.callers), [row.route, row.route], 'readiness and rendering use one request builder');
            assert.equal(row.renderedRoute, row.route);
            assert.equal(row.cacheHit, true);
            if (row.route === 'carrier') assert.equal(row.loopPreview, true);
        }
    }
    assert.equal(report.privateSnapshots, true, 'snapshot ownership remains private');
    fs.writeFileSync('results/forge-request-ownership/request-contract.json', JSON.stringify(report, null, 2) + '\n');
    console.log('PASS same synthesis context/cache identity across eight modes; readiness and playback share request construction and exact PCM');
})().catch(error => { console.error(error); process.exitCode = 1; });
