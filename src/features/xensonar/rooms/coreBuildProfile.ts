declare const __XENSONAR_CORE_TEST_BUILD__: boolean;
declare const __XENSONAR_BUILD_BODY__: string;
declare const __XENSONAR_XENSONAR_ONLY_BUILD__: boolean;
declare const __XENSONAR_NODAL_PATCH_BASIS_BUILD__: boolean;
declare const __XENSONAR_EXTRAS_ENABLED__: boolean;
declare const __XENSONAR_MATERIALSCHMIEDE_ENABLED__: boolean;
declare const __XENSONAR_DIAGNOSTIC_SURFACES_ENABLED__: boolean;

export const XENSONAR_CORE_TEST_BUILD = __XENSONAR_CORE_TEST_BUILD__;
export const XENSONAR_XENSONAR_ONLY_BUILD = __XENSONAR_XENSONAR_ONLY_BUILD__;
export const XENSONAR_NODAL_PATCH_BASIS_BUILD = __XENSONAR_NODAL_PATCH_BASIS_BUILD__;
export const XENSONAR_EXTRAS_ENABLED = __XENSONAR_EXTRAS_ENABLED__;
export const XENSONAR_MATERIALSCHMIEDE_ENABLED = __XENSONAR_MATERIALSCHMIEDE_ENABLED__;
export const XENSONAR_DIAGNOSTIC_SURFACES_ENABLED = __XENSONAR_DIAGNOSTIC_SURFACES_ENABLED__;

export type XensonarRuntimeBuildProfile = 'full' | 'core-test';
export type XensonarBuildBodyProfile = 'full' | 'core' | 'xensonar-only' | 'nodal-patch-basis' | 'materialschmiede' | 'topology' | 'extras' | string;

export const XENSONAR_RUNTIME_BUILD_PROFILE: XensonarRuntimeBuildProfile = XENSONAR_CORE_TEST_BUILD ? 'core-test' : 'full';
export const XENSONAR_BUILD_BODY_PROFILE: XensonarBuildBodyProfile = __XENSONAR_BUILD_BODY__;
