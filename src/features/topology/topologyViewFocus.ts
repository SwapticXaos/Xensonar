export type TopologyViewFocus = 'field' | 'sound' | 'routing' | 'export';

export interface TopologyViewFocusOption {
  value: TopologyViewFocus;
  label: string;
  hint: string;
}

export const TOPOLOGY_VIEW_FOCUS_OPTIONS: TopologyViewFocusOption[] = [
  { value: 'field', label: 'Feld', hint: 'Aufstellung' },
  { value: 'sound', label: 'Klang', hint: 'Leseköpfe' },
  { value: 'routing', label: 'Routing', hint: 'Ziele' },
  { value: 'export', label: 'Export', hint: 'Körper' },
];

export const DEFAULT_TOPOLOGY_VIEW_FOCUS: TopologyViewFocus = 'field';
