import { readFileSync } from 'node:fs';

const file = 'src/features/xensonar/material/useResonanceMaterialLoopBridge.ts';
const source = readFileSync(file, 'utf8');
const errors = [];

const browseMatch = source.match(/const browseRootFollowLoopWithUmlaut = \(key: 'ö' \| 'ä'\) => \{[\s\S]*?\n  \};/);
if (!browseMatch) {
  errors.push('browseRootFollowLoopWithUmlaut function not found.');
} else {
  const body = browseMatch[0];
  if (!body.includes('rootFollowController.rootFollowLoopEntries')) {
    errors.push('Root-Follow umlaut browse must use full rootFollowLoopEntries, not only the direct hotkey slice.');
  }
  if (body.includes('recentRootFollowHotkeyEntries')) {
    errors.push('Root-Follow umlaut browse still references recentRootFollowHotkeyEntries.');
  }
  if (!body.includes('resolveMaterialLoopBrowseTargetIndex')) {
    errors.push('Root-Follow umlaut browse must use the shared full-bank browse resolver.');
  }
  if (!body.includes('directCount: hotkeyCount')) {
    errors.push('Root-Follow umlaut browse must reserve the direct A–L hotkey window via directCount: hotkeyCount.');
  }
  if (!body.includes('rootFollowLoopBrowseArmedRef.current = true')) {
    errors.push('Root-Follow umlaut browse must arm sequential browsing after entering the older-entry range.');
  }
}

if (!source.includes('const rootFollowLoopBrowseArmedRef = useRef(false);')) {
  errors.push('Root-Follow browse armed ref is missing.');
}
if (!source.includes("rootFollowLoopBrowseArmedRef.current = false;\n    updateNParams({ rootFollowLoopId: entry.id")) {
  errors.push('Direct Root-Follow hotkey/UI selection must reset the umlaut browse armed state.');
}

if (errors.length) {
  console.error('[xensonar][check-root-follow-umlaut-hotkey-full-bank] failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[xensonar][check-root-follow-umlaut-hotkey-full-bank] ok');
