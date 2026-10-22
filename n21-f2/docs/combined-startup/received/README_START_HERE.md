# XenSonar — Codex integration handoff, P7.38 → COMBINED review candidate

**Start:** Read `handoffs/CODEX_HANDOFF.md`. Status: NOT approved for production/audio runtime.

**Exact baseline:** `XenSonar_P7_38_Sessions_Reviewed_Quellen.zip` (Codex original).

Two separate descendants of P7.38.11 were both named "P7.38.12":
- Nodal Snapshot Persistence (experimental storage fence and legacy WAV fallback)
- Starter Grid Consistency (real mute masks + harmonic minor + guarded migration)

This bundle merges **both** into a common review candidate. Do not treat them as sequential patches; both focused patches originate from P7.38.11.

## Recommended: apply a single cumulative SOURCE patch
From the directory containing `n21-f2/`, against the unmodified P7.38 source:

```sh
git apply --check <bundle>/patches/P7_38_to_COMBINED_CUMULATIVE_SOURCE.patch
git apply <bundle>/patches/P7_38_to_COMBINED_CUMULATIVE_SOURCE.patch
cd n21-f2
node build.cjs
node build.cjs --verify
sha256sum Xensonar_P7_38_Sessions_Reviewed_Test.html
```
Expected HTML SHA-256: `572971dd9c06fd4aee243625e1b3d377933e35477304ec619a7b918509c56370` (bytes 5884717).
Source patch edits **64 source/template/style/manifest files** and deliberately contains no redundant node_modules, full-project ZIP or HTML blob.

**Alternative:** `patches/P7_38_to_COMBINED_CUMULATIVE_HTML.patch` applies ONLY to the original P7.38 standalone HTML. This is an alternative view of the same delta. **Never apply both cumulative patches.**

**Review-only fragments:** `P7_38_11_to_P7_38_12_NODAL_PERSISTENCE.patch` and `P7_38_11_to_P7_38_12_STARTER_GRID.patch.gz` each require P7.38.11; do not apply them directly to P7.38 or double-apply on top of the cumulative patch.

## Targeted gates

```sh
node <bundle>/tests/test_grid_consistency.cjs n21-f2/Xensonar_P7_38_Sessions_Reviewed_Test.html
node <bundle>/tests/test_nodal_export_regression.cjs n21-f2/Xensonar_P7_38_Sessions_Reviewed_Test.html
node <bundle>/tests/test_starter_colors.cjs n21-f2/Xensonar_P7_38_Sessions_Reviewed_Test.html
```

All three pass on the merged candidate. Grid regression fails on P7.38.11 as expected. Persistence test is a mocked timing/visibility test, not a real IndexedDB durability or audio test.

Please test in a clean **isolated** browser profile and separately an upgraded P7.38.11 profile. Do not reset or migrate a user's production localStorage/IndexedDB for testing.
