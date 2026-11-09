/**
 * Canonical project-line metadata.
 *
 * Keep architecture/tooling line separate from user-facing artifact patch numbers:
 * the long-lived repository baseline can stay on 3.2.91-7.7.90 while manual
 * instrument patches (125, 126, …) continue independently.
 */
export const XENSONAR_PROJECT_LINE = Object.freeze({
  architectureLine: '3.2.91-7.7.90',
  acceptedArchitectureLine: '3.2.91-7.7.89',
  artifactPatch: 134,
  baseArtifactPatch: 133,
  artifactName: 'Xensonar_134',
  donorIdentityRevision: 'donor-body-v3/formant-lock-v5/table-cache-132',
});

export const XENSONAR_ARCHITECTURE_LINE = XENSONAR_PROJECT_LINE.architectureLine;
export const XENSONAR_ACCEPTED_ARCHITECTURE_LINE = XENSONAR_PROJECT_LINE.acceptedArchitectureLine;
export const XENSONAR_ARTIFACT_PATCH = XENSONAR_PROJECT_LINE.artifactPatch;
