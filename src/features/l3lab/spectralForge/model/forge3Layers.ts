export type Forge3LayerDomain =
  | 'workbench'
  | 'forge3_body'
  | 'carrier_donor_lab';

export const FORGE3_LAYER_LABEL: Record<Forge3LayerDomain, string> = {
  workbench: 'Werkbank',
  forge3_body: 'Körperraum',
  carrier_donor_lab: 'Form-Labor',
};

export type CommitDomain =
  | 'none'
  | 'projection_only'
  | 'body_state'
  | 'source_derived_body'
  | 'form_derived_body'
  | 'hybrid_body';

export function getCommitDomainLabel(domain: CommitDomain): string {
  switch (domain) {
    case 'projection_only':
      return 'nur Projektion';
    case 'body_state':
      return 'Körperzustand';
    case 'source_derived_body':
      return 'quellenbasierter Körper';
    case 'form_derived_body':
      return 'formbasierter Körper';
    case 'hybrid_body':
      return 'hybrider Körper';
    default:
      return 'noch keiner';
  }
}

export type SourceAssetContext =
  | 'none'
  | 'forge3_main'
  | 'carrier_donor_lab';

export const GLOBAL_UNDO_DOMAIN: Forge3LayerDomain = 'workbench';
