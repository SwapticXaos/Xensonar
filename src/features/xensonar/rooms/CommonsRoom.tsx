import { ResonanceCommonsRoom as MicrotoResonanceCommonsRoom } from "../../../external/microto/features/commons/ResonanceCommonsRoom";

type CommonsRoomProps = {
  onBack: () => void;
};

export function CommonsRoom({ onBack }: CommonsRoomProps) {
  return <MicrotoResonanceCommonsRoom room="COMMONS" onBack={onBack} />;
}
