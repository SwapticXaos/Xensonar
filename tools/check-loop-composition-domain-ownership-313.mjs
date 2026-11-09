#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd();
const facadePath = 'src/features/l3lab/canonicalForge/loopDrumDomain.ts';
const ownerPath = 'src/features/l3lab/canonicalForge/loopCompositionDomain.ts';
const facade = fs.readFileSync(facadePath, 'utf8');
const owner = fs.readFileSync(ownerPath, 'utf8');
const failures = [];
const requireText = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const forbidText = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const facadeLines = facade.split(/\r?\n/).length;
const ownerLines = owner.split(/\r?\n/).length;
if (facadeLines > 560) failures.push(`loopDrumDomain facade remains too broad after composition split: ${facadeLines} lines`);
requireText(facade, "from './loopCompositionDomain'", 'facade must import/re-export loopCompositionDomain');
for (const forbidden of [
  'const COMPOSITION_MOTIFS',
  'export const LOOP_COMPOSITION_PRESETS',
  'export function buildTrackPatternNotes',
  'export function buildBassPatternNotes',
  'export function buildCompanionPatternNotes',
  'export function makeLoopNote',
  'export function buildChordNotesFromStep',
]) forbidText(facade, forbidden, `facade still owns composition implementation: ${forbidden}`);
for (const required of [
  'export const LOOP_COMPOSITION_PRESETS',
  'export const DEFAULT_LOOP_TRACKS',
  'export function makeLoopNote',
  'export function buildChordNotesFromStep',
  'export function buildBassPatternNotes',
  'export function buildCompanionPatternNotes',
  'export function buildTrackPatternNotes',
]) requireText(owner, required, `composition owner missing: ${required}`);

if (failures.length) {
  console.error('[loop-composition-domain-ownership-313] SOURCE FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outDir = path.join(root, '.xensonar-checks', 'loop-composition-domain-ownership-313');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const entry = path.join(outDir, 'probe.ts');
const bundle = path.join(outDir, 'probe.cjs');
fs.writeFileSync(entry, `
import * as facade from '../../src/features/l3lab/canonicalForge/loopDrumDomain';
import * as composition from '../../src/features/l3lab/canonicalForge/loopCompositionDomain';
const checks:string[]=[];
function check(label:string, condition:any, detail=''){ checks.push(label); if(!condition) throw new Error(label+(detail?' :: '+detail:'')); }
for (const name of [
  'clamp01','getLoopCompositionPresetMeta','defaultLoopTrackLabel','totalComposerSteps',
  'chordIntervalsForVoicing','makeLoopNote','buildChordGhostNotes','buildChordNotesFromStep',
  'clampComposerLength','buildBassPatternNotes','buildCompanionPatternNotes',
  'defaultLoopTrackPatternPreset','buildTrackPatternNotes'
]) check('facade composition identity '+name, (facade as any)[name] === (composition as any)[name]);
check('preset table identity', facade.LOOP_COMPOSITION_PRESETS === composition.LOOP_COMPOSITION_PRESETS);
check('default tracks identity', facade.DEFAULT_LOOP_TRACKS === composition.DEFAULT_LOOP_TRACKS);
const base:any = facade.createEmptyLoopComposer(4);
check('default loop has four tracks', base.tracks.length === 4, String(base.tracks.length));
const jazzA:any[] = facade.buildTrackPatternNotes('bass','patternA',base);
const jazzC:any[] = facade.buildTrackPatternNotes('companion','patternC',base);
check('bass pattern produces notes', jazzA.length > 0, String(jazzA.length));
check('companion pattern produces notes', jazzC.length > 0, String(jazzC.length));
check('pattern notes remain bounded', [...jazzA,...jazzC].every((n:any)=>n.startUnit >= 0 && n.startUnit < facade.totalComposerSteps(base)));
const chord:any[] = facade.buildChordNotesFromStep(base,{trackId:'companion',rootChannelIndex:0,startUnit:0,durationUnits:2,velocity:0.8,octaveOffset:0,voicing:'triad'});
check('triad still creates three notes', chord.length === 3, String(chord.length));
const applied:any = facade.applyLoopCompositionPreset(base,'classical',4);
check('composition preset remains classical', applied.compositionPresetId === 'classical');
check('composition preset still builds notes', applied.notes.length > 0, String(applied.notes.length));
console.log('runtime '+checks.length+'/'+checks.length);
`);
await build({ entryPoints:[entry], outfile:bundle, bundle:true, platform:'node', format:'cjs', target:'node20', logLevel:'silent' });
const run = spawnSync(process.execPath,[bundle],{cwd:root,encoding:'utf8',env:{...process.env}});
if (run.status !== 0) {
  console.error('[loop-composition-domain-ownership-313] RUNTIME FAILED');
  console.error(run.stdout || '');
  console.error(run.stderr || '');
  process.exit(1);
}
console.log(`[loop-composition-domain-ownership-313] facade ${facadeLines} lines; composition ${ownerLines} lines`);
console.log(`[loop-composition-domain-ownership-313] PASS: ${String(run.stdout||'').trim()}`);
