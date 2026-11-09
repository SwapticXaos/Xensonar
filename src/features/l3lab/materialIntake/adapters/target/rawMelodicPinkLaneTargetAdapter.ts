import {
  MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY,
  type MaterialIntakeRawMelodicImportDetail,
} from '../../../contracts/materialIntakeMelodicHandoffContract';
import { dispatchXensonarEvent } from '../../../../xensonar/runtime/xensonarEventChannels';
import type { MaterialTargetAdapter } from '../../types';
import { registerRawSelectionAsMaterialEntry } from './rawXensonarTargetAdapter';

export const rawMelodicPinkLaneTargetAdapter: MaterialTargetAdapter = {
  id: 'raw-melodic-pink-lane-send',
  label: 'Als pinke Spur nach Melodic Loop senden',
  acceptsRawLoop: true,
  acceptsAnalysisMeta: true,
  acceptsSpectralProjection: false,
  async commitLoop(payload) {
    const entry = registerRawSelectionAsMaterialEntry(payload);
    const detail: MaterialIntakeRawMelodicImportDetail = {
      entryId: entry.id,
      anchorHz: 55,
      source: 'spectral-forge-raw-audio',
    };

    try {
      window.sessionStorage.setItem(MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY, JSON.stringify(detail));
    } catch {}

    dispatchXensonarEvent('materialIntakeRawMelodicImport', detail);
    dispatchXensonarEvent('openCanonicalMelodicLoop', {
      reason: 'material-intake-raw-audio-direct',
      entryId: entry.id,
    });
  },
};
