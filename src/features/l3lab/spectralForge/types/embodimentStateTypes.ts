export type EmbodimentPipelineStage =
  | 'idle'
  | 'donor_missing'
  | 'donor_ready'
  | 'scaffold_ready'
  | 'allocation_dirty'
  | 'allocation_ready'
  | 'preview_dirty'
  | 'preview_ready'
  | 'commit_pending'
  | 'commit_ready'
  | 'error';

export type EmbodimentFreshness = 'clean' | 'dirty' | 'stale';

export interface EmbodimentPipelineState {
  stage: EmbodimentPipelineStage;
  freshness: EmbodimentFreshness;
  message: string;
  lastUpdatedAt: number | null;
}
