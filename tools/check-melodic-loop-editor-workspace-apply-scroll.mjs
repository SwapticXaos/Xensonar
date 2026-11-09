import fs from 'node:fs';

const panelPath = 'src/features/l3lab/canonicalForge/melodicLoopPanel.tsx';
const sidebarPath = 'src/features/l3lab/canonicalForge/MelodicLoopSidebar.tsx';
const inspectorPath = 'src/features/l3lab/canonicalForge/SelectedLoopBlockInspector.tsx';
const stripPath = 'src/features/l3lab/canonicalForge/SelectedSampleEffectStrip.tsx';
const localFieldPanelPath = 'src/features/l3lab/canonicalForge/LocalFieldEditorPanel.tsx';

const panel = fs.readFileSync(panelPath, 'utf8');
const sidebar = fs.readFileSync(sidebarPath, 'utf8');
const inspector = fs.readFileSync(inspectorPath, 'utf8');
const strip = fs.readFileSync(stripPath, 'utf8');
const localFieldPanel = fs.readFileSync(localFieldPanelPath, 'utf8');

const required = [
  {
    label: 'workspace scroll targets the melodic note canvas, not the import rack',
    ok: /const\s+scrollMelodicWorkspaceIntoView\s*=\s*React\.useCallback/.test(panel)
      && /clipComposerRef\.current\?\.scrollIntoView\(\{\s*block:\s*'center'/.test(panel),
  },
  {
    label: 'workspace canvas is explicitly tagged',
    ok: /data-xensonar-melodic-loop-workspace-canvas="true"/.test(panel),
  },
  {
    label: 'workspace scroll callback is passed through the sidebar',
    ok: /onScrollToWorkspace=\{scrollMelodicWorkspaceIntoView\}/.test(panel)
      && /onScrollToWorkspace\?:\s*\(\)\s*=>\s*void/.test(sidebar)
      && /onScrollToWorkspace=\{onScrollToWorkspace\}/.test(sidebar),
  },
  {
    label: 'synth block apply button is shortened and scrolls to workspace',
    ok: /onScrollToWorkspace\?\.\(\)/.test(inspector)
      && />\s*Übernehmen\s*<\/button>/.test(inspector)
      && !/So in diesem Block ins Projekt übertragen/.test(inspector),
  },
  {
    label: 'sample block apply button is shortened and scrolls to workspace',
    ok: /onScrollToWorkspace\?\.\(\)/.test(strip)
      && />\s*Übernehmen\s*<\/button>/.test(strip)
      && !/So in diesem Block ins Projekt übertragen/.test(strip),
  },
  {
    label: 'local field editor defaults to soft/fluid drawing',
    ok: /useState\(0\)/.test(localFieldPanel)
      && /useState\(1\)/.test(localFieldPanel),
  },
];

const failed = required.filter((entry) => !entry.ok);
if (failed.length) {
  console.error('[melodic-loop-editor-workspace-apply-scroll] FAIL');
  for (const entry of failed) console.error(`- ${entry.label}`);
  process.exit(1);
}

console.log('[melodic-loop-editor-workspace-apply-scroll] OK');
console.log(JSON.stringify({ checked: required.map((entry) => entry.label) }, null, 2));
