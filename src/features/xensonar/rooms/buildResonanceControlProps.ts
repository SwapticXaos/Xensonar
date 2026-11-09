import type {
  ResonanceControlRuntimeProps,
  ResonanceControlRuntimeSpreadProps,
} from './resonanceControlRuntimeTypes';
export type {
  ResonanceControlRuntimePropKeys,
  ResonanceControlRuntimeProps,
  ResonanceControlRuntimeSpreadProps,
} from './resonanceControlRuntimeTypes';

export function buildResonanceControlProps(args: ResonanceControlRuntimeProps): ResonanceControlRuntimeSpreadProps {
  const { updateNParams: _updateNParams, commitResonanceCursorY: _commitResonanceCursorY, nexusRefs: _nexusRefs, ...spreadProps } = args;
  void _updateNParams;
  void _commitResonanceCursorY;
  void _nexusRefs;
  return spreadProps;
}
