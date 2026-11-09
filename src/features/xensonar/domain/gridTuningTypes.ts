export type BuiltInGridTuning = '12edo' | '17edo' | '19edo' | '22edo' | '31edo' | 'ji' | 'bp' | 'gamelan' | 'maqam';
export type CustomGridTuningId = `custom:${string}`;
export type GridTuning = BuiltInGridTuning | CustomGridTuningId;
