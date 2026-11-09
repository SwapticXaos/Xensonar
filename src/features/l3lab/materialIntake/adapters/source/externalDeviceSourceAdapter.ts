import type { MaterialSourceAdapter } from '../../types';

export const externalDeviceSourceAdapter: MaterialSourceAdapter = {
  id: 'external-device-slot',
  label: 'Fremdgerät-Slot',
  unavailableReason: 'Der Adapter-Slot ist vorbereitet, aber in diesem Build noch nicht mit einem Fremdgerät verbunden.',
};
