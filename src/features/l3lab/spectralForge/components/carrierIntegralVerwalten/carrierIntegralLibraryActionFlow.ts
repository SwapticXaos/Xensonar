export type CarrierIntegralLibraryActionValueSource = 'right-override' | 'stored-entry';

type CarrierIntegralLibraryNamedEntry = {
  id: string;
  name: string;
};

export type CarrierIntegralLibraryMessageFlow = {
  selectedProjectId?: string | null;
  projectName?: string;
  libraryMessage: string;
};

export type CarrierIntegralLibrarySelectEntryFlow = CarrierIntegralLibraryMessageFlow & {
  selectedProjectId: string;
  projectName: string;
  auditionValueSource: CarrierIntegralLibraryActionValueSource;
  auditionError: string | null;
};

export type CarrierIntegralLibraryDeleteSuccessFlow = CarrierIntegralLibraryMessageFlow & {
  selectedProjectId: null;
  deletedName: string;
};

export function createCarrierIntegralLibraryActionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bibliotheksaktion fehlgeschlagen';
}

export function resolveCarrierIntegralSaveSuccessFlow(meta: CarrierIntegralLibraryNamedEntry): CarrierIntegralLibraryMessageFlow & {
  selectedProjectId: string;
  projectName: string;
} {
  return {
    selectedProjectId: meta.id,
    projectName: meta.name,
    libraryMessage: `gesichert · ${meta.name}`,
  };
}

export function removeCarrierIntegralLibraryManualOrderId(ids: string[], deletedProjectId: string): string[] {
  return ids.filter((id) => id !== deletedProjectId);
}

export function resolveCarrierIntegralDeleteSuccessFlow(args: {
  selectedProjectId: string;
  selectedProjectName?: string | null;
  projectName: string;
}): CarrierIntegralLibraryDeleteSuccessFlow {
  const deletedName = args.selectedProjectName ?? args.projectName;
  return {
    selectedProjectId: null,
    deletedName,
    libraryMessage: `gelöscht · ${deletedName}`,
  };
}

export function resolveCarrierIntegralSelectEntryFlow(entry: CarrierIntegralLibraryNamedEntry): CarrierIntegralLibrarySelectEntryFlow {
  return {
    selectedProjectId: entry.id,
    projectName: entry.name,
    auditionValueSource: 'stored-entry',
    auditionError: null,
    libraryMessage: `aufgelegt · Werte aktiv · ${entry.name}`
  };
}

export function resolveCarrierIntegralLoadEntrySuccessFlow(entry: CarrierIntegralLibraryNamedEntry): CarrierIntegralLibraryMessageFlow & {
  selectedProjectId: string;
  projectName: string;
} {
  return {
    selectedProjectId: entry.id,
    projectName: entry.name,
    libraryMessage: `geladen · ${entry.name}`,
  };
}

