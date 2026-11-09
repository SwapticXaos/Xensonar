export const XENSONAR_BUILD_PROFILES = Object.freeze({
  core: Object.freeze({
    id: 'core',
    label: 'Core singlefile',
    purpose: 'Routine instrument/workbench build without embedded Family/Xenpolar standalone extras.',
    buildScript: 'build:core-singlefile',
    artifactSlug: 'core_test',
    buildBody: 'core',
    coreTestBuild: true,
    includesEmbeddedStandaloneExtras: false,
    htmlBudgetBytes: 3_800_000,
  }),
  full: Object.freeze({
    id: 'full',
    label: 'Full browser singlefile',
    purpose: 'Browser artifact with Family/Xenpolar standalone extras injected after the Vite build.',
    buildScript: 'build:full-browser-html',
    artifactSlug: 'full_browser',
    buildBody: 'full',
    coreTestBuild: false,
    includesEmbeddedStandaloneExtras: true,
    htmlBudgetBytes: null,
  }),
  production: Object.freeze({
    id: 'production',
    label: 'Legacy production singlefile',
    purpose: 'Compatibility profile: ordinary production Vite singlefile without the explicit post-build standalone-extras injection step.',
    buildScript: 'build:production',
    artifactSlug: 'production',
    buildBody: 'implicit-full',
    coreTestBuild: false,
    includesEmbeddedStandaloneExtras: false,
    htmlBudgetBytes: 3_800_000,
  }),
  singlefile: Object.freeze({
    id: 'singlefile',
    label: 'Legacy singlefile',
    purpose: 'Compatibility alias for the historical singlefile build; prefer core or full for explicit artifact intent.',
    buildScript: 'build:singlefile',
    artifactSlug: 'singlefile',
    buildBody: 'implicit-full',
    coreTestBuild: false,
    includesEmbeddedStandaloneExtras: false,
    htmlBudgetBytes: 3_800_000,
  }),
});

export function getXensonarBuildProfile(profileId) {
  const profile = XENSONAR_BUILD_PROFILES[profileId];
  if (!profile) {
    throw new Error(`Unknown Xensonar build profile "${profileId}". Expected one of: ${Object.keys(XENSONAR_BUILD_PROFILES).join(', ')}`);
  }
  return profile;
}

export function describeXensonarBuildProfiles() {
  return Object.values(XENSONAR_BUILD_PROFILES).map((profile) => ({
    id: profile.id,
    label: profile.label,
    purpose: profile.purpose,
    npmScript: profile.buildScript,
    artifactSlug: profile.artifactSlug,
    buildBody: profile.buildBody,
    coreTestBuild: profile.coreTestBuild,
    includesEmbeddedStandaloneExtras: profile.includesEmbeddedStandaloneExtras,
    htmlBudgetBytes: profile.htmlBudgetBytes,
  }));
}
