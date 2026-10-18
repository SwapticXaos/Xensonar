// Narrow offline CPU comparison; not a live-instrument performance benchmark.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks'),{parse}=require('./extract.cjs');
const root=path.resolve(__dirname,'..');
const baseline=process.env.XENSONAR_CLEAN3_HTML;if(!baseline)throw Error('Set XENSONAR_CLEAN3_HTML to the unchanged CLEAN3 HTML');
function field(file){const {map}=parse(file),ctx=vm.createContext({console});vm.runInContext(map.get('__f347DonorFieldFactory')+'\n'+map.get('__F35641Field'),ctx);return vm.runInContext('__F35641Field',ctx)}
const before=field(baseline),after=field(path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).entry));
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/clean3_characterization.json'))).result.field.field;
const model={sampleRate:8000,sourceIndex:{windows:[{id:0,startSample:0,endSample:36000},{id:1,startSample:38000,endSample:79999}]},atlas:{nodes:reference.entries.map(e=>e.node)}};
const plain=x=>JSON.parse(JSON.stringify(x));assert.deepEqual(plain(before.build(model)),plain(after.build(model)));
for(let i=0;i<6;i++){before.build(model);after.build(model)}
const rounds=8,repetitions=10,oldTimes=[],newTimes=[];
function measure(engine){const t=performance.now();for(let i=0;i<repetitions;i++)engine.build(model);return (performance.now()-t)/repetitions}
for(let i=0;i<rounds;i++){if(i%2){newTimes.push(measure(after));oldTimes.push(measure(before))}else{oldTimes.push(measure(before));newTimes.push(measure(after))}}
const median=values=>{const s=values.slice().sort((a,b)=>a-b);return(s[3]+s[4])/2};
const report={scope:'Synthetic offline donor-state build only; 512 frames, 6 clusters. Timing is machine/JIT dependent.',rounds,repetitions,baselineMedianMs:median(oldTimes),currentMedianMs:median(newTimes),baselineRoundMs:oldTimes,currentRoundMs:newTimes,relativeSpeedup:median(oldTimes)/median(newTimes)};
fs.writeFileSync(path.join(root,'results/donor_field_benchmark.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
