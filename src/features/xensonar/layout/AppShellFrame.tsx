import type { ComponentProps } from 'react';
import { AppHeader } from './AppHeader';
import { APP_SHELL_KEYFRAMES_CSS } from './appShellStyles';
import { AppMainContent } from './AppMainContent';

type AppShellFrameProps = {
  appHeaderProps: ComponentProps<typeof AppHeader>;
  mainContentProps: ComponentProps<typeof AppMainContent>;
};

export function AppShellFrame(props: AppShellFrameProps) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono flex flex-col">
      <style>{APP_SHELL_KEYFRAMES_CSS}</style>
      <AppHeader {...props.appHeaderProps} />
      <AppMainContent {...props.mainContentProps} />
    </div>
  );
}
