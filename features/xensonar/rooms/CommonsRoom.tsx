import { ResonanceCommonsRoom } from "../../../components/ResonanceCommonsRoom";

type CommonsRoomProps = {
  onBack: () => void;
};

export function CommonsRoom({ onBack }: CommonsRoomProps) {
  return <ResonanceCommonsRoom onBack={onBack} />;
}
