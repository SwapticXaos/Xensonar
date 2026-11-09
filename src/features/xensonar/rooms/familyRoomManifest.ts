import {
  XENSONAR_VARIANTE_FAMILY_SUMMARY,
  XENSONAR_VARIANTE_LABEL,
} from '../family/refactor/refucktorPresentation';

import type { FamilyCard } from './familyRoomManifestTypes';

export type { FamilyApp, FamilyCard } from './familyRoomManifestTypes';

export const FAMILY_CARDS: FamilyCard[] = [
  {
    key: 'resonanzwerk',
    title: 'Resonanzwerk',
    subtitle: 'Xensonar Kind',
    summary:
      'Feld, Maschine und Archiv als kompakter Resonanzkörper. Der direktere Xensonar-Verwandte mit eigener Spiel- und Interpretationslogik.',
    badge: 'Kind',
    accent: 'border-cyan-700/60 bg-cyan-950/20 text-cyan-100',
  },
  {
    key: 'zone',
    title: 'Zone',
    subtitle: 'Xensonar Enkel',
    summary:
      'Größerer Tochterkosmos mit Tarot-, Ontologie- und Zonenlogik. Souveräner, aber familiär deutlich mit den Resonanzwerk-Genen verwandt.',
    badge: 'Enkel',
    accent: 'border-fuchsia-700/60 bg-fuchsia-950/20 text-fuchsia-100',
  },
  {
    key: 'strangeAttractors',
    title: 'Archiv-Seitenzweig',
    subtitle: 'Xensonar Seitenzweig',
    summary:
      'Rooms V–VII als fokussierter Ableger: Spectral Garden, Chamber-Archiv und ritualisierte Weiterentwicklung.',
    badge: 'Seitenzweig',
    accent: 'border-violet-700/60 bg-violet-950/20 text-violet-100',
  },
  {
    key: 'melodieQuest',
    title: XENSONAR_VARIANTE_LABEL,
    subtitle: 'Xensonar Ableger',
    summary: XENSONAR_VARIANTE_FAMILY_SUMMARY,
    badge: 'Ableger',
    accent: 'border-amber-700/60 bg-amber-950/20 text-amber-100',
  },
];
