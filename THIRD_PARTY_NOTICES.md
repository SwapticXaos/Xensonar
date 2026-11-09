# Third-Party Notices — Xensonar 3.2.91-7.7.69

This notice file is a working provenance ledger, not a legal opinion. It is meant to prevent AI-assisted handoff packages from erasing dependency and source-origin obligations.

## Runtime npm dependencies declared in `package.json`

| Package | Version range | Role |
|---|---:|---|
| `react` | `19.2.3` | React UI runtime |
| `react-dom` | `19.2.3` | React browser DOM runtime |
| `clsx` | `2.1.1` | conditional class-name utility |
| `tailwind-merge` | `3.4.0` | Tailwind class merge utility |

## Development / build dependencies declared in `package.json`

| Package | Version range | Role |
|---|---:|---|
| `@tailwindcss/vite` | `4.1.17` | Tailwind/Vite integration |
| `@types/node` | `^22.0.0` | Node.js type declarations |
| `@types/react` | `19.2.7` | React type declarations |
| `@types/react-dom` | `19.2.3` | React DOM type declarations |
| `@vitejs/plugin-react` | `5.1.1` | React plugin for Vite |
| `jsdom` | `^29.1.1` | DOM-like test environment for tooling |
| `tailwindcss` | `4.1.17` | CSS utility framework |
| `typescript` | `5.9.3` | TypeScript compiler |
| `vite` | `7.2.4` | build/dev server |
| `vite-plugin-singlefile` | `2.3.0` | single-file HTML build support |

The lockfile currently contains many transitive packages. Licenses should be verified from upstream package metadata before public redistribution. The automated provenance check reports how many lockfile package records have or lack a license field.

## External / collaborative source boundary

`src/external/microto` is treated as an external/collaborative boundary rather than ordinary Xensonar-native code. It must retain source attribution and should not be silently absorbed into Xensonar's authorship narrative.

Before public release or broader redistribution, verify:

- origin and maintainer of the Microto/mPRG material,
- whether redistribution is permitted,
- whether code, assets, generated data, or game logic require separate notices,
- whether adapter-generated Xensonar material is transformatively new or still carries source obligations.

## AI-assisted patch provenance

Recent 7.7.x patches include AI-assisted refactor, harness, and audit work. AI assistance does not remove human authorship, dependency obligations, or review duties. The project should keep explicit patch reports, diffs, build evidence, and known non-changes with each handoff.

## Maintenance rule

When adding a dependency, external source tree, generated asset, model-produced source file, or copied code excerpt, update this file or `docs/PROVENANCE_LEDGER.md` in the same patch.
