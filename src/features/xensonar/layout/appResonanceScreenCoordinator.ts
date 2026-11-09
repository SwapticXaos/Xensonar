import { buildAppChromeProps } from './appChromeProps';
import { buildResonancePanelSuiteProps } from '../rooms/resonancePanelCoordinator';

export type BuildAppResonanceScreenPropsArgs = {
  chrome: Parameters<typeof buildAppChromeProps>[0];
  resonancePanels: Parameters<typeof buildResonancePanelSuiteProps>[0];
};

export type AppResonanceScreenProps = ReturnType<typeof buildAppChromeProps> & ReturnType<typeof buildResonancePanelSuiteProps>;

export function buildAppResonanceScreenProps(args: BuildAppResonanceScreenPropsArgs): AppResonanceScreenProps {
  const chromeProps = buildAppChromeProps(args.chrome);
  const resonancePanelSuiteProps = buildResonancePanelSuiteProps(args.resonancePanels);

  return {
    ...chromeProps,
    ...resonancePanelSuiteProps,
  };
}
