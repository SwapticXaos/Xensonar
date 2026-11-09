import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const singlefileEnabled = process.env.XENSONAR_SINGLEFILE !== "0";
const requestedBuildBody = process.env.XENSONAR_BUILD_BODY;
const xensonarOnlyBuildEnabled = requestedBuildBody === "xensonar-only";
const nodalPatchBasisBuildEnabled = requestedBuildBody === "nodal-patch-basis";
const coreTestBuildEnabled = process.env.XENSONAR_CORE_TEST_BUILD === "1" || requestedBuildBody === "core" || xensonarOnlyBuildEnabled || nodalPatchBasisBuildEnabled;
const buildBody = requestedBuildBody || (coreTestBuildEnabled ? "core" : "full");
const xenpolarExtrasBridge = xensonarOnlyBuildEnabled || nodalPatchBasisBuildEnabled
  ? path.resolve(__dirname, "src/features/xensonar/rooms/xenpolarExtrasBridge.xensonarOnly.ts")
  : coreTestBuildEnabled
    ? path.resolve(__dirname, "src/features/xensonar/rooms/xenpolarExtrasBridge.core.ts")
    : path.resolve(__dirname, "src/features/xensonar/rooms/xenpolarExtrasBridge.full.ts");
const xenpolarGameArenaRuntimeBoundary = coreTestBuildEnabled
  ? path.resolve(__dirname, "src/features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary.core.ts")
  : path.resolve(__dirname, "src/features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary.ts");
const performanceCrisisUiPolicyState = coreTestBuildEnabled
  ? path.resolve(__dirname, "src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.core.ts")
  : path.resolve(__dirname, "src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts");
const burstDiagnosticsRuntime = coreTestBuildEnabled
  ? path.resolve(__dirname, "src/features/xensonar/diagnostics/burstDiagnosticsRuntime.core.ts")
  : path.resolve(__dirname, "src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts");
const xensonarIndexCss = coreTestBuildEnabled
  ? path.resolve(__dirname, "src/index.core.css")
  : path.resolve(__dirname, "src/index.css");
const extrasEnabled = !coreTestBuildEnabled && !xensonarOnlyBuildEnabled && !nodalPatchBasisBuildEnabled;
const materialschmiedeEnabled = !nodalPatchBasisBuildEnabled;
const diagnosticSurfacesRequested = process.env.XENSONAR_DIAGNOSTIC_SURFACES;
const diagnosticSurfacesEnabled = diagnosticSurfacesRequested === undefined
  ? !coreTestBuildEnabled
  : diagnosticSurfacesRequested !== "0";

// https://vite.dev/config/
export default defineConfig({
  build: {
    modulePreload: singlefileEnabled ? false : { polyfill: true },
  },
  define: {
    __XENSONAR_CORE_TEST_BUILD__: JSON.stringify(coreTestBuildEnabled),
    __XENSONAR_BUILD_BODY__: JSON.stringify(buildBody),
    __XENSONAR_XENSONAR_ONLY_BUILD__: JSON.stringify(xensonarOnlyBuildEnabled),
    __XENSONAR_NODAL_PATCH_BASIS_BUILD__: JSON.stringify(nodalPatchBasisBuildEnabled),
    __XENSONAR_EXTRAS_ENABLED__: JSON.stringify(extrasEnabled),
    __XENSONAR_MATERIALSCHMIEDE_ENABLED__: JSON.stringify(materialschmiedeEnabled),
    __XENSONAR_DIAGNOSTIC_SURFACES_ENABLED__: JSON.stringify(diagnosticSurfacesEnabled),
  },
  plugins: [react(), tailwindcss(), singlefileEnabled ? viteSingleFile() : null].filter(Boolean),
  resolve: {
    alias: [
      {
        find: /^\.\/index\.css$/,
        replacement: xensonarIndexCss,
      },
      {
        find: /^@\/features\/xensonar\/rooms\/xenpolarExtrasBridge$/,
        replacement: xenpolarExtrasBridge,
      },
      {
        find: /^\.\/features\/xensonar\/rooms\/useAppXenpolarGameArenaRuntimeBoundary$/,
        replacement: xenpolarGameArenaRuntimeBoundary,
      },
      {
        find: /^\.\/features\/xensonar\/performanceCrisis\/usePerformanceCrisisUiPolicyState$/,
        replacement: performanceCrisisUiPolicyState,
      },
      {
        find: /^\.\/features\/xensonar\/diagnostics\/burstDiagnosticsRuntime$/,
        replacement: burstDiagnosticsRuntime,
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "src"),
      },
    ],
  },
});
