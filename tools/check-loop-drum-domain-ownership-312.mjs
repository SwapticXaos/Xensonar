#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd();
const facadePath = 'src/features/l3lab/canonicalForge/loopDrumDomain.ts';
const pitchPath = 'src/features/l3lab/canonicalForge/loopPitchDomain.ts';
const drumPath = 'src/features/l3lab/canonicalForge/loopDrumComputerDomain.ts';
const facade = fs.readFileSync(facadePath, 'utf8');
const pitch = fs.readFileSync(pitchPath, 'utf8');
const drum = fs.readFileSync(drumPath, 'utf8');
const failures = [];
const requireText = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const forbidText = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const facadeLines = facade.split(/\r?\n/).length;
if (facadeLines > 950) failures.push(`loopDrumDomain facade remains too broad: ${facadeLines} lines`);
requireText(facade, "from './loopPitchDomain'", 'facade must import/re-export loopPitchDomain');
requireText(facade, "from './loopDrumComputerDomain'", 'facade must import/re-export loopDrumComputerDomain');
forbidText(facade, 'BP_13TET_RATIOS', 'facade still owns raw pitch-raster construction dependency');
forbidText(facade, 'getRasterDefinition', 'facade still owns raster-definition dependency');
forbidText(facade, 'createEmptyDrumPatternMatrix', 'facade still owns drum matrix construction');
forbidText(facade, 'sanitizeDrumLaneKitOverrides', 'facade still owns drum-kit sanitization');
requireText(pitch, 'export function createLoopPitchLinesFromTuning', 'pitch owner missing tuning-to-lines implementation');
requireText(pitch, 'export function buildLoopLineLayout', 'pitch owner missing logarithmic line layout');
requireText(pitch, 'export function getLoopNoteScreenRect', 'pitch owner missing note screen geometry');
requireText(drum, 'export const DEFAULT_GROOVE_MACHINE', 'drum owner missing default groove');
requireText(drum, 'export function createEmptyDrumComputer', 'drum owner missing empty-state construction');
requireText(drum, 'export function resizeDrumComputerState', 'drum owner missing resize implementation');

if (failures.length) {
  console.error('[loop-drum-domain-ownership-312] SOURCE FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outDir = path.join(root, '.xensonar-checks', 'loop-drum-domain-ownership-312');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const entry = path.join(outDir, 'probe.ts');
const bundle = path.join(outDir, 'probe.cjs');
fs.writeFileSync(entry, `
import * as facade from '../../src/features/l3lab/canonicalForge/loopDrumDomain';
import * as pitch from '../../src/features/l3lab/canonicalForge/loopPitchDomain';
import * as drum from '../../src/features/l3lab/canonicalForge/loopDrumComputerDomain';
const checks:string[]=[];
function check(label:string, condition:any, detail=''){ checks.push(label); if(!condition) throw new Error(label+(detail?' :: '+detail:'')); }
for (const name of ['createLoopPitchLinesFromTuning','buildLoopLineLayout','getLoopNoteLineRect','getLoopNoteScreenRect','rebuildLoopComposerPitchField']) {
  check('facade pitch identity '+name, (facade as any)[name] === (pitch as any)[name]);
}
for (const name of ['createEmptyDrumComputer','resizeDrumComputerState','cloneDrumComputerState','sanitizeGrooveMachineConfig','countActiveDrumSteps']) {
  check('facade drum identity '+name, (facade as any)[name] === (drum as any)[name]);
}
check('default groove identity', facade.DEFAULT_GROOVE_MACHINE === drum.DEFAULT_GROOVE_MACHINE);
const ji:any[] = facade.createLoopPitchLinesFromTuning('ji',220);
check('JI pitch lines exist', ji.length > 8, String(ji.length));
check('JI pitch lines obey max', ji.length <= facade.LOOP_COMPOSER_MAX_VISIBLE_LINES, String(ji.length));
check('pitch lines sorted descending Hz', ji.every((line:any,i:number)=>i===0 || ji[i-1].hz >= line.hz));
const state:any = facade.createEmptyLoopComposer(4);
const layout:any = facade.buildLoopLineLayout(state,640,facade.LOOP_COMPOSER_HEADER_H);
check('layout matches pitch line count', layout.lineYs.length === state.pitchLines.length);
check('layout geometry finite', layout.lineYs.every((y:number)=>Number.isFinite(y)));
const drumState:any = facade.createEmptyDrumComputer(2,16);
check('empty drum has two bars', drumState.bars === 2);
check('empty drum has 32 steps', drumState.stepCount === 32, String(drumState.stepCount));
const resized:any = facade.resizeDrumComputerState(drumState,3,12);
check('resize updates bar count', resized.bars === 3);
check('resize updates segment count', resized.segmentsPerBar === 12, String(resized.segmentsPerBar));
check('resize updates total step count', resized.stepCount === 36, String(resized.stepCount));
check('empty resized drum remains inactive', facade.countActiveDrumSteps(resized) === 0);
console.log('runtime '+checks.length+'/'+checks.length);
`);
await build({ entryPoints:[entry], outfile:bundle, bundle:true, platform:'node', format:'cjs', target:'node20', logLevel:'silent' });
const run = spawnSync(process.execPath,[bundle],{cwd:root,encoding:'utf8',env:{...process.env}});
if (run.status !== 0) {
  console.error('[loop-drum-domain-ownership-312] RUNTIME FAILED');
  console.error(run.stdout || '');
  console.error(run.stderr || '');
  process.exit(1);
}
console.log(`[loop-drum-domain-ownership-312] facade ${facadeLines} lines; pitch ${pitch.split(/\r?\n/).length} lines; drum ${drum.split(/\r?\n/).length} lines`);
console.log(`[loop-drum-domain-ownership-312] PASS: ${String(run.stdout||'').trim()}`);
