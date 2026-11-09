import { useEffect, type MutableRefObject } from "react";
import type { MyzelInterpreterMix } from "@/features/resonance/interpreterConfig";
import { normalizeMyzelCentralColorMixer, type MyzelCentralColorMixer } from "@/features/resonance/myzelCentralColorMixer";
import type { MyzelInstallationMix, MyzelTopologyMode } from "@/features/resonance/refactorTopologySupport";

export type Room3MyzelStateMirrorArgs = {
  myzelTopologyMode: MyzelTopologyMode;
  myzelTopologyModeRef: MutableRefObject<MyzelTopologyMode>;
  myzelInstallationMix: MyzelInstallationMix;
  myzelInstallationMixRef: MutableRefObject<MyzelInstallationMix>;
  myzelInterpreterMix: MyzelInterpreterMix;
  myzelInterpreterMixRef: MutableRefObject<MyzelInterpreterMix>;
  myzelCentralColorMixer: MyzelCentralColorMixer;
  myzelCentralColorMixerRef: MutableRefObject<MyzelCentralColorMixer>;
};

export const useRoom3MyzelStateMirrors = ({
  myzelTopologyMode,
  myzelTopologyModeRef,
  myzelInstallationMix,
  myzelInstallationMixRef,
  myzelInterpreterMix,
  myzelInterpreterMixRef,
  myzelCentralColorMixer,
  myzelCentralColorMixerRef,
}: Room3MyzelStateMirrorArgs) => {
  useEffect(() => {
    myzelTopologyModeRef.current = myzelTopologyMode;
  }, [myzelTopologyMode, myzelTopologyModeRef]);

  useEffect(() => {
    myzelInstallationMixRef.current = myzelInstallationMix;
  }, [myzelInstallationMix, myzelInstallationMixRef]);

  useEffect(() => {
    myzelInterpreterMixRef.current = myzelInterpreterMix;
  }, [myzelInterpreterMix, myzelInterpreterMixRef]);

  useEffect(() => {
    myzelCentralColorMixerRef.current = normalizeMyzelCentralColorMixer(myzelCentralColorMixer);
  }, [myzelCentralColorMixer, myzelCentralColorMixerRef]);
};
