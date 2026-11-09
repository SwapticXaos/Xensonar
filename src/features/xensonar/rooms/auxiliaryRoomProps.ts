import type { ComponentProps } from 'react';
import { CommonsRoom } from './CommonsRoom';
import { Level3LabRoom } from './Level3LabRoom';
import type { SpectralForgeEntryScrollIntent, SpectralForgeExternalAudioOrigin } from '../../l3lab/contracts/spectralForgeEntryIntent';

type BuildAuxiliaryRoomPropsArgs = {
  onBackToHauptraum: () => void;
  externalAudioUploadFile?: File | null;
  externalAudioUploadOrigin?: SpectralForgeExternalAudioOrigin | null;
  entryScrollIntent?: SpectralForgeEntryScrollIntent | null;
  onExternalAudioUploadConsumed?: () => void;
  onEntryScrollIntentConsumed?: (token: string) => void;
};

type AuxiliaryRoomProps = {
  commonsRoomProps: ComponentProps<typeof CommonsRoom>;
  level3LabRoomProps: ComponentProps<typeof Level3LabRoom>;
};

export function buildAuxiliaryRoomProps(args: BuildAuxiliaryRoomPropsArgs): AuxiliaryRoomProps {
  return {
    commonsRoomProps: {
      onBack: args.onBackToHauptraum,
    },
    level3LabRoomProps: {
      onBack: args.onBackToHauptraum,
      packageStationKeepAlive: true,
      externalAudioUploadFile: args.externalAudioUploadFile ?? null,
      externalAudioUploadOrigin: args.externalAudioUploadOrigin ?? null,
      entryScrollIntent: args.entryScrollIntent ?? null,
      onExternalAudioUploadConsumed: args.onExternalAudioUploadConsumed,
      onEntryScrollIntentConsumed: args.onEntryScrollIntentConsumed,
    },
  };
}
