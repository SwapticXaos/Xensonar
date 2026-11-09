export type FamilyApp = 'launcher' | 'resonanzwerk' | 'zone' | 'strangeAttractors' | 'melodieQuest';

export type FamilyCard = {
  key: Exclude<FamilyApp, 'launcher'>;
  title: string;
  subtitle: string;
  summary: string;
  badge: string;
  accent: string;
};
