import { lazy, Suspense, type ReactElement } from "react";
import { MyzelTopologyPanel } from "../../topology/MyzelTopologyPanel";
import type { Room } from "../types";
import { XENSONAR_CORE_TEST_BUILD } from "./coreBuildProfile";
import type { MainRoomProps } from "./MainRoom";
import type { XenpolarRoomProps } from "./XenpolarRoom";
import type { IrrlichtArenaPanelProps } from "./IrrlichtArenaPanel";
import type { ComponentProps } from "react";

const MainRoomLazy = XENSONAR_CORE_TEST_BUILD
  ? null
  : lazy(() => import("./MainRoom").then((module) => ({ default: module.MainRoom })));

const XenpolarRoomLazy = XENSONAR_CORE_TEST_BUILD
  ? null
  : lazy(() => import("./XenpolarRoom").then((module) => ({ default: module.XenpolarRoom })));

const IrrlichtArenaPanelLazy = XENSONAR_CORE_TEST_BUILD
  ? null
  : lazy(() => import("./IrrlichtArenaPanel").then((module) => ({ default: module.IrrlichtArenaPanel })));

type AppRoomViewportProps = {
  room: Room;
  mainRoomProps: MainRoomProps;
  topologyPanelProps: ComponentProps<typeof MyzelTopologyPanel>;
  xenpolarRoomProps: XenpolarRoomProps;
  irrlichtArenaPanelProps: IrrlichtArenaPanelProps;
};

function DisabledExtraRoom({ title }: { title: string }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl items-center justify-center p-4 text-center text-sm text-neutral-400">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">{title} ist im Core-Build archiviert.</div>
    </div>
  );
}

function LazyRoomBoundary({ children }: { children: ReactElement }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Raum wird geladen …</div>}>
      {children}
    </Suspense>
  );
}

export function AppRoomViewport({
  room,
  mainRoomProps,
  topologyPanelProps,
  xenpolarRoomProps,
  irrlichtArenaPanelProps,
}: AppRoomViewportProps) {
  return (
    <>
      {room === "MAIN" && (
        MainRoomLazy ? (
          <LazyRoomBoundary><MainRoomLazy {...mainRoomProps} /></LazyRoomBoundary>
        ) : <DisabledExtraRoom title="Xensonar Familie" />
      )}

      {room === "NEXUS" && (
        <div className="flex items-center justify-center h-full opacity-50">
          <p>II. Der frühere Nexus ist in dieser UI-Runde im Familienraum aufgegangen.</p>
        </div>
      )}

      {room === "TOPOLOGY" && <MyzelTopologyPanel {...topologyPanelProps} />}

      {room === "XENPOLAR" && (
        XenpolarRoomLazy ? (
          <LazyRoomBoundary>
            <XenpolarRoomLazy
              {...xenpolarRoomProps}
              arenaContent={
                IrrlichtArenaPanelLazy ? (
                  <LazyRoomBoundary><IrrlichtArenaPanelLazy {...irrlichtArenaPanelProps} /></LazyRoomBoundary>
                ) : <DisabledExtraRoom title="Irrlicht" />
              }
            />
          </LazyRoomBoundary>
        ) : <DisabledExtraRoom title="Xenpolar" />
      )}

      {room === "GAME" && (
        IrrlichtArenaPanelLazy ? (
          <LazyRoomBoundary><IrrlichtArenaPanelLazy {...irrlichtArenaPanelProps} /></LazyRoomBoundary>
        ) : <DisabledExtraRoom title="Irrlicht" />
      )}
    </>
  );
}
