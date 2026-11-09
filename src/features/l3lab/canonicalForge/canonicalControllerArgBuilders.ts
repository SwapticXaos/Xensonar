import { createCanonicalAssetLibraryController } from './canonicalAssetLibraryController';
import { createCanonicalMaterialTransferController } from './canonicalMaterialTransferController';
import { createCanonicalSourceIntakeController } from './canonicalSourceIntakeController';
import { createCanonicalWorkspacePersistenceController } from './canonicalWorkspacePersistenceController';
import { createCanonicalSourcePreviewController } from './canonicalSourcePreviewController';
import { createCanonicalSourceSelectionController } from './canonicalSourceSelectionController';
import { createCanonicalSourceToolApplyController } from './canonicalSourceToolApplyController';

export type CanonicalSourceIntakeControllerArgs = Parameters<typeof createCanonicalSourceIntakeController>[0];
export type CanonicalSourceToolApplyControllerArgs = Parameters<typeof createCanonicalSourceToolApplyController>[0];
export type CanonicalSourceSelectionControllerArgs = Parameters<typeof createCanonicalSourceSelectionController>[0];
export type CanonicalSourcePreviewControllerArgs = Parameters<typeof createCanonicalSourcePreviewController>[0];
export type CanonicalMaterialTransferControllerArgs = Parameters<typeof createCanonicalMaterialTransferController>[0];
export type CanonicalAssetLibraryControllerArgs = Parameters<typeof createCanonicalAssetLibraryController>[0];
export type CanonicalWorkspacePersistenceControllerArgs = Parameters<typeof createCanonicalWorkspacePersistenceController>[0];

type CanonicalControllerArgGroup<T extends object> = Partial<T> | undefined | null | false;

export function flattenCanonicalControllerArgGroups<T extends object>(groups: Record<string, CanonicalControllerArgGroup<T>>): T {
  return Object.assign({}, ...Object.values(groups).filter(Boolean)) as T;
}
