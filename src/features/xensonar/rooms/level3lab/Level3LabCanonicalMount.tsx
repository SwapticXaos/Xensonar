import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import type { SyntheticForgeLogicView } from '../../../l3lab/canonicalForge/sessionTypes';
import type { ForgeMode } from '../../../l3lab/contracts/level3LabContracts';
import { SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT } from '../../../l3lab/canonicalForge/syntheticForgeWorkspacePackage';

const LazySyntheticForgeRoom = lazy(async () => {
  const mod = await import('../../../l3lab/canonicalForge/CanonicalForgeRoom');
  return { default: mod.CanonicalForgeRoom };
});

type Level3LabSyntheticForgeMountProps = {
  onBack: () => void;
  onRequestModeChange: (mode: ForgeMode) => void;
  syntheticForgeLogicView: SyntheticForgeLogicView;
  onSyntheticForgeLogicViewChange: (view: SyntheticForgeLogicView) => void;
};

class SyntheticForgeErrorBoundary extends Component<
  { onReset: () => void; children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { onReset: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unbekannter SyntheticForge-Fehler',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[xensonar][synthetic-forge][boundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3 border border-red-900/70 bg-red-950/20 p-4 text-sm text-red-100">
          <div className="text-xs uppercase tracking-[0.25em] text-red-300">SyntheticForge abgefangen</div>
          <div className="font-medium">SyntheticForge ist in einen Fehler gelaufen und wurde isoliert.</div>
          <div className="text-red-200/80">{this.state.message || 'SyntheticForge konnte nicht vollständig initialisiert werden.'}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                this.props.onReset();
              }}
              className="border border-red-700 px-3 py-1.5 text-red-100 hover:bg-red-900/40"
            >
              Zurück zu SpectralForge
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Level3LabSyntheticForgeMount({
  onBack,
  onRequestModeChange,
  syntheticForgeLogicView,
  onSyntheticForgeLogicViewChange,
}: Level3LabSyntheticForgeMountProps) {
  const [packageRestoreRevision, setPackageRestoreRevision] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleRestoredWorkspace = () => setPackageRestoreRevision((value) => value + 1);
    window.addEventListener(SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT, handleRestoredWorkspace);
    return () => window.removeEventListener(SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT, handleRestoredWorkspace);
  }, []);
  return (
    <SyntheticForgeErrorBoundary onReset={() => onRequestModeChange('experimental')}>
      <Suspense
        fallback={
          <div className="border border-violet-900/60 bg-violet-950/20 p-4 text-sm text-violet-100">
            SyntheticForge wird geladen …
          </div>
        }
      >
        <LazySyntheticForgeRoom
          key={packageRestoreRevision}
          onBack={onBack}
          onRequestModeChange={onRequestModeChange}
          externalLogicView={syntheticForgeLogicView}
          onExternalLogicViewChange={onSyntheticForgeLogicViewChange}
          hideTopLogicSwitch
        />
      </Suspense>
    </SyntheticForgeErrorBoundary>
  );
}

/** @deprecated Legacy implementation export. Use Level3LabSyntheticForgeMount. */
export const Level3LabCanonicalMount = Level3LabSyntheticForgeMount;
