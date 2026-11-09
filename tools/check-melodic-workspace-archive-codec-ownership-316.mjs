#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd();
const facadePath = 'src/features/l3lab/canonicalForge/melodicWorkspacePackage.ts';
const ownerPath = 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveCodec.ts';
const facade = fs.readFileSync(facadePath, 'utf8');
const owner = fs.readFileSync(ownerPath, 'utf8');
const failures = [];
const requireText = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const forbidText = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const facadeLines = facade.split(/\r?\n/).length;
const ownerLines = owner.split(/\r?\n/).length;
if (facadeLines > 470) failures.push(`melodicWorkspacePackage facade remains too broad after codec split: ${facadeLines} lines`);
requireText(facade, 'from "./melodicWorkspaceArchiveCodec"', 'facade must delegate/re-export archive codec');
requireText(facade, 'parseMelodicWorkspaceArchiveWithHosts', 'facade must adapt parser host ports');
requireText(facade, '{ buildWorkspaceArchivePackageId, cloneArchiveProject }', 'facade must provide package-id/clone host ports');
for (const forbidden of [
  'MAX_ARCHIVE_NUMBER_ARRAY_LENGTH',
  'packageSafeJsonReplacer',
  'prepareJsonPackageDownloadFromBlobParts',
  'parseGridLibraryArchivePayload',
  'JSON.parse(json)',
]) forbidText(facade, forbidden, `facade still owns codec implementation: ${forbidden}`);
for (const required of [
  'export function serializeMelodicWorkspaceArchive',
  'export function buildMelodicWorkspaceArchiveBlobParts',
  'export function prepareMelodicWorkspaceArchiveDownloadFromArchive',
  'export function downloadMelodicWorkspaceArchiveFromArchive',
  'export function parseMelodicWorkspaceArchiveWithHosts',
  'export function prepareMelodicWorkspaceArchiveDownload',
  'export function downloadMelodicWorkspaceArchive',
]) requireText(owner, required, `archive codec owner missing: ${required}`);
requireText(owner, 'from "./melodicWorkspaceArchiveTypes"', 'codec must depend on neutral archive types');
forbidText(owner, 'from "./melodicWorkspacePackage"', 'codec must not import facade, even type-only');

if (failures.length) {
  console.error('[melodic-workspace-archive-codec-ownership-316] SOURCE FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outDir = path.join(root, '.xensonar-checks', 'melodic-workspace-archive-codec-ownership-316');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const entry = path.join(outDir, 'probe.ts');
const bundle = path.join(outDir, 'probe.cjs');
fs.writeFileSync(entry, `
import * as pkg from '../../src/features/l3lab/canonicalForge/melodicWorkspacePackage';
import * as codec from '../../src/features/l3lab/canonicalForge/melodicWorkspaceArchiveCodec';
import { createEmptyLoopComposer } from '../../src/features/l3lab/canonicalForge/loopDrumDomain';
const checks:string[]=[];
function check(label:string, condition:any, detail=''){ checks.push(label); if(!condition) throw new Error(label+(detail?' :: '+detail:'')); }
for (const name of [
  'serializeMelodicWorkspaceArchive',
  'buildMelodicWorkspaceArchiveBlobParts',
  'prepareMelodicWorkspaceArchiveDownloadFromArchive',
  'downloadMelodicWorkspaceArchiveFromArchive',
  'prepareMelodicWorkspaceArchiveDownload',
  'downloadMelodicWorkspaceArchive',
]) check('facade codec identity '+name, (pkg as any)[name] === (codec as any)[name]);
const project:any={
  id:'workspace:316', name:'316 codec ownership probe', composer:createEmptyLoopComposer(),
  patternVariants:{}, patternLinks:{}, origin:'browserLocal', sourcePackageId:null, syncState:'localOnly', contentHash:null,
};
const archive:any=pkg.buildMelodicWorkspaceArchive({
  packageId:'pkg-316-probe', label:'316 codec probe', workspace:project, projects:[project], samples:[],
  residentConstellations:{version:1,entries:[]}, browserLocalStorage:{version:1,entries:[]},
});
const json=pkg.buildMelodicWorkspaceArchiveBlobParts(archive).join('');
const parsed:any=pkg.parseMelodicWorkspaceArchive(json);
const owned:any=codec.parseMelodicWorkspaceArchiveWithHosts({
  buildWorkspaceArchivePackageId:pkg.buildWorkspaceArchivePackageId,
  cloneArchiveProject:pkg.cloneArchiveProject,
},json);
check('blob parts produce JSON object', json.startsWith('{') && json.endsWith('}'));
check('facade parser equals owner parser', JSON.stringify(parsed) === JSON.stringify(owned));
check('package id preserved', parsed.packageId === 'pkg-316-probe', parsed.packageId);
check('workspace id preserved', parsed.workspace.id === 'workspace:316', parsed.workspace.id);
check('project count preserved', parsed.projects.length === 1, String(parsed.projects.length));
check('sample count preserved', parsed.samples.length === 0, String(parsed.samples.length));
check('sections preserved', Array.isArray(parsed.sections) && parsed.sections.length >= 10, String(parsed.sections?.length));
check('serializer stays valid', JSON.parse(pkg.serializeMelodicWorkspaceArchive(archive)).packageId === 'pkg-316-probe');
console.log('runtime '+checks.length+'/'+checks.length);
`);
await build({ entryPoints:[entry], outfile:bundle, bundle:true, platform:'node', format:'cjs', target:'node20', logLevel:'silent' });
const run = spawnSync(process.execPath,[bundle],{cwd:root,encoding:'utf8',env:{...process.env}});
if (run.status !== 0) {
  console.error('[melodic-workspace-archive-codec-ownership-316] RUNTIME FAILED');
  console.error(run.stdout || '');
  console.error(run.stderr || '');
  process.exit(1);
}
console.log(`[melodic-workspace-archive-codec-ownership-316] facade ${facadeLines} lines; codec owner ${ownerLines} lines`);
console.log(`[melodic-workspace-archive-codec-ownership-316] PASS: ${String(run.stdout||'').trim()}`);
