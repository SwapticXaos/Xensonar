'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const source=fs.readFileSync('src/rhythm/04_workspace_and_transport.js','utf8');
const parsed=ts.createSourceFile('control.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='__createLiveControlSnapshot');
assert(declaration,'control telemetry owner exists');let warnings=0;
const create=new Function('console',declaration.getText(parsed)+';return __createLiveControlSnapshot')({warn(){warnings++}});
const first={pendingIntents:[],latestDecisions:[],latestTapSnapshots:[]},channel=create(first),separate=create({diagnosis:'independent'});
assert.equal(channel.getSnapshot(),first);assert.equal(channel.getSnapshot(),channel.getSnapshot());
let good=0,bad=0;const off=channel.subscribe(()=>good++),broken=channel.subscribe(()=>{bad++;throw Error('broken observer')});
const second={pendingIntents:[{at:1,decision:'admitted'}],latestDecisions:[1],latestTapSnapshots:[{peak:.4}]};
channel.publish(second);assert.equal(channel.getSnapshot(),second);assert.equal(good,1);assert.equal(bad,1);assert.equal(warnings,1);
channel.publish(second);assert.equal(good,1,'unchanged identity does not publish');broken();off();
channel.publish(previous=>({...previous,marker:'latest'}));assert.equal(channel.getSnapshot().marker,'latest');assert.equal(good,1,'unsubscribed observer is not retained');
assert.equal(separate.getSnapshot().diagnosis,'independent');
// A direct subscriber and getter see every complete payload, independent of React.
let notifications=0;const unsubscribe=channel.subscribe(()=>notifications++);
for(let i=0;i<200;i++){const record={sequence:i,pendingIntents:[{sequence:i}],latestDecisions:[{decision:'keep'}],latestTapSnapshots:[{rms:i/1000,peak:.8}]};channel.publish(record);assert.equal(channel.getSnapshot(),record)}
unsubscribe();assert.equal(notifications,200);
console.log('PASS independent telemetry ownership, exact payload identity, updater semantics, same-value bailout, unsubscribe and isolated observer failure');
