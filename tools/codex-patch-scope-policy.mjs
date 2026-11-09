import { XENSONAR_ARCHITECTURE_LINE } from './xensonar-project-line.mjs';

export const patchScopePolicyVersion = XENSONAR_ARCHITECTURE_LINE;

export const patchScopeBaselinePath = `reports/codex-patch-scope-baseline.${XENSONAR_ARCHITECTURE_LINE}.json`;

const HARNESS_PATH_RULES = [
  /^AGENTS\.md$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^BUILD_REPORT_XENSONAR_3\.2\.91-7\.7\.\d+_[^/]+\.md$/,
  /^LICENSE_STATUS\.md$/,
  /^THIRD_PARTY_NOTICES\.md$/,
  /^docs\/PROVENANCE_LEDGER\.md$/,
  /^reports\/digital-commons-provenance-ledger\.(?:json|md)$/,
  /^docs\/CODEX_REFACTOR_HARNESS_3\.2\.91-7\.7\.\d+\.md$/,
  /^tools\/(?:codex-|run-codex-|check-codex-)[^/]+\.mjs$/,
  /^reports\/codex-[^/]+\.json$/,
  /^reports\/codex-[^/]+\.md$/,
  /^reports\/codex-[^/]+baseline[^/]+\.json$/,
  /^reports\/codex-[^/]+baseline\.[^/]+\.json$/,
];

const TOOLING_PATH_RULES = [
  /^tools\/[^/]+\.mjs$/,
  /^tools\/out\/[^/]+\.(?:json|md)$/,
  /^scripts\/[^/]+\.mjs$/,
  /^docs\//,
  /^reports\//,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^AGENTS\.md$/,
  /^BUILD_REPORT_/,
  /^LICENSE_STATUS\.md$/,
  /^THIRD_PARTY_NOTICES\.md$/,
  /^docs\/PROVENANCE_LEDGER\.md$/,
];

const PRODUCT_RUNTIME_PATH_RULES = [
  /^src\//,
  /^vite\.config\.ts$/,
  /^index\.html$/,
  /^src\/index\.(?:css|tsx|ts)$/,
];

export const patchScopes = {
  'harness-only': {
    label: 'Harness / Codex tooling only',
    intent: 'Only AGENTS, Codex harness tools, Codex reports, Codex docs, build report and package script metadata may change. Product runtime paths must stay untouched.',
    allowedPathRules: HARNESS_PATH_RULES,
    deniedPathRules: PRODUCT_RUNTIME_PATH_RULES,
    requiredGuards: [
      'npm run xensonar:codex:runtime-touch-guard',
      'npm run xensonar:codex:refactor-delta',
    ],
  },
  'tooling-only': {
    label: 'General tooling only',
    intent: 'Repository tools, scripts, docs, reports and package metadata may change; src runtime remains denied unless an explicit wider scope is chosen.',
    allowedPathRules: TOOLING_PATH_RULES,
    deniedPathRules: [/^src\//],
    requiredGuards: [
      'npm run xensonar:codex:runtime-touch-guard',
    ],
  },
  'runtime-declared': {
    label: 'Declared runtime slice',
    intent: 'Runtime paths may change only when the patch is explicitly a runtime/audio/routing/export slice and reports the behavioural trade-off.',
    allowedPathRules: [...TOOLING_PATH_RULES, ...PRODUCT_RUNTIME_PATH_RULES],
    deniedPathRules: [],
    requiredGuards: [
      'npm run xensonar:codex:runtime-touch-guard:allow',
      'profile-specific behavioural gates',
    ],
  },
};

export function patchScopeNames() {
  return Object.keys(patchScopes);
}

export function getPatchScope(name) {
  return patchScopes[name] || null;
}

export function matchesAnyRule(file, rules = []) {
  return rules.some((rule) => rule.test(file));
}

export function classifyPatchScopeFile(file, scopeName = 'harness-only') {
  const scope = getPatchScope(scopeName);
  if (!scope) {
    return { file, scopeName, knownScope: false, allowed: false, reason: 'unknown-scope' };
  }
  const denied = matchesAnyRule(file, scope.deniedPathRules);
  const allowed = matchesAnyRule(file, scope.allowedPathRules);
  let reason = 'allowed-by-scope';
  if (denied) reason = 'denied-product-runtime-path';
  else if (!allowed) reason = 'not-allowed-by-scope';
  return {
    file,
    scopeName,
    knownScope: true,
    allowed: allowed && !denied,
    allowedByRule: allowed,
    deniedByRule: denied,
    reason,
  };
}

export function findPatchScopeViolations(files, scopeName = 'harness-only') {
  return files
    .map((file) => classifyPatchScopeFile(file, scopeName))
    .filter((entry) => !entry.allowed);
}
