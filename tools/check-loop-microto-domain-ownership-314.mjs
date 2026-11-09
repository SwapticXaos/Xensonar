#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd();
const facadePath = 'src/features/l3lab/canonicalForge/loopDrumDomain.ts';
const ownerPath = 'src/features/l3lab/canonicalForge/loopMicrotoDomain.ts';
const facade = fs.readFileSync(facadePath, 'utf8');
const owner = fs.readFileSync(ownerPath, 'utf8');
const failures = [];
const requireText = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const forbidText = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const facadeLines = facade.split(/\r?\n/).length;
const ownerLines = owner.split(/\r?\n/).length;
if (facadeLines > 420) failures.push(`loopDrumDomain facade remains too broad after Microto split: ${facadeLines} lines`);
requireText(facade, "from './loopMicrotoDomain'", 'facade must import/re-export loopMicrotoDomain');
requireText(facade, 'buildLoopComposerFromMicrotoSeedOwned(seed, { createEmptyLoopComposer, cloneLoopComposerState })', 'facade must adapt state host ports into Microto owner');
for (const forbidden of [
  "from '../../../external/microto/integrations/xensonar/types'",
  'event.energy * 0.5',
  'fallbackPhrase = seed.fallbackPhrase.length',
  'sampleStride = Math.max(1, Math.ceil(sortedEvents.length',
  'lineIndexFromMicrotoSemi(lineCount, combinedSemi)',
]) forbidText(facade, forbidden, `facade still owns Microto implementation: ${forbidden}`);
for (const required of [
  'export function mapMicrotoTuningToCanonical',
  'export function trackIdForMicrotoMovementKind',
  'export function velocityForMicrotoMovement',
  'export function durationUnitsForMicrotoMovement',
  'export function lineIndexFromMicrotoSemi',
  'export function buildLoopComposerFromMicrotoSeedOwned',
]) requireText(owner, required, `Microto owner missing: ${required}`);

if (failures.length) {
  console.error('[loop-microto-domain-ownership-314] SOURCE FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outDir = path.join(root, '.xensonar-checks', 'loop-microto-domain-ownership-314');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const entry = path.join(outDir, 'probe.ts');
const bundle = path.join(outDir, 'probe.cjs');
fs.writeFileSync(entry, `
import * as facade from '../../src/features/l3lab/canonicalForge/loopDrumDomain';
import * as microto from '../../src/features/l3lab/canonicalForge/loopMicrotoDomain';
const checks:string[]=[];
function check(label:string, condition:any, detail=''){ checks.push(label); if(!condition) throw new Error(label+(detail?' :: '+detail:'')); }
for (const name of [
  'mapMicrotoTuningToCanonical','trackIdForMicrotoMovementKind','velocityForMicrotoMovement',
  'durationUnitsForMicrotoMovement','lineIndexFromMicrotoSemi'
]) check('facade Microto helper identity '+name, (facade as any)[name] === (microto as any)[name]);
check('12edo mapping', facade.mapMicrotoTuningToCanonical('12edo') === '12edo');
check('bp mapping', facade.mapMicrotoTuningToCanonical('bp') === 'bp');
check('step routes to bass', facade.trackIdForMicrotoMovementKind('step') === 'bass');
check('jump routes to companion', facade.trackIdForMicrotoMovementKind('jump') === 'companion');
check('gate routes to aux', facade.trackIdForMicrotoMovementKind('gate_unlock') === 'aux');
check('line mapper clamps high semi', facade.lineIndexFromMicrotoSemi(13, 999) === 0);
check('line mapper clamps low semi', facade.lineIndexFromMicrotoSemi(13, -999) === 12);
const event:any={kind:'jump',semi:7,energy:0.8,t:0.5,lane:2,airborne:true,ordinal:1};
check('velocity remains bounded', facade.velocityForMicrotoMovement(event) >= 0.25 && facade.velocityForMicrotoMovement(event) <= 1);
check('airborne duration remains bounded', facade.durationUnitsForMicrotoMovement(event) >= 1 && facade.durationUnitsForMicrotoMovement(event) <= 8);
const seed:any={
  name:'314 ownership probe',bars:4,rootHz:233,
  movementEvents:[
    {kind:'step',semi:0,energy:0.4,t:0,lane:1,airborne:false,ordinal:0},
    {kind:'jump',semi:7,energy:0.8,t:0.5,lane:2,airborne:true,ordinal:1},
    {kind:'checkpoint',semi:-5,energy:0.6,t:1,lane:0,airborne:false,ordinal:2},
    {kind:'gate_unlock',semi:12,energy:0.9,t:1.25,lane:3,airborne:false,ordinal:3},
  ],
  fallbackPhrase:[0,3,7,10],arrangementMode:'balanced',formMode:'auto',sectionBias:'auto',
  tuningMode:'19edo',evolutionDepth:0.5,sourceDevice:'MelodicQuest',sourceVersion:'probe'
};
const facadeState:any=facade.buildLoopComposerFromMicrotoSeed(seed);
const ownedState:any=microto.buildLoopComposerFromMicrotoSeedOwned(seed,{
  createEmptyLoopComposer:facade.createEmptyLoopComposer,
  cloneLoopComposerState:facade.cloneLoopComposerState,
});
const summarize=(state:any)=>({
  bars:state.bars,tuning:state.tuning,baseHz:state.baseHz,segmentCount:state.segmentCount,
  selectedTrackId:state.selectedTrackId,activeTrackIds:state.activeTrackIds,
  tracks:state.tracks.map((t:any)=>({id:t.id,enabled:t.enabled})),
  notes:state.notes.map((n:any)=>({trackId:n.trackId,channelIndex:n.channelIndex,startUnit:n.startUnit,durationUnits:n.durationUnits,velocity:n.velocity}))
});
check('facade adapter equals owner output', JSON.stringify(summarize(facadeState)) === JSON.stringify(summarize(ownedState)));
check('seed tuning preserved', facadeState.tuning === '19edo');
check('seed base Hz preserved', facadeState.baseHz === 233, String(facadeState.baseHz));
check('Microto import produces notes', facadeState.notes.length > 0, String(facadeState.notes.length));
check('Microto notes capped', facadeState.notes.length <= 96, String(facadeState.notes.length));
check('Microto tracks active', ['bass','companion','aux'].every((id)=>facadeState.activeTrackIds.includes(id)));
check('Microto note geometry bounded', facadeState.notes.every((n:any)=>n.channelIndex>=0 && n.channelIndex<facade.composerChannelCount(facadeState)));
console.log('runtime '+checks.length+'/'+checks.length);
`);
await build({ entryPoints:[entry], outfile:bundle, bundle:true, platform:'node', format:'cjs', target:'node20', logLevel:'silent' });
const run = spawnSync(process.execPath,[bundle],{cwd:root,encoding:'utf8',env:{...process.env}});
if (run.status !== 0) {
  console.error('[loop-microto-domain-ownership-314] RUNTIME FAILED');
  console.error(run.stdout || '');
  console.error(run.stderr || '');
  process.exit(1);
}
console.log(`[loop-microto-domain-ownership-314] facade ${facadeLines} lines; Microto owner ${ownerLines} lines`);
console.log(`[loop-microto-domain-ownership-314] PASS: ${String(run.stdout||'').trim()}`);
