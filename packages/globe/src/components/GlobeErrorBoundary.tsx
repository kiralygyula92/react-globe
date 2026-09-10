/**
 * The module's one class component, because React offers no hook that catches a
 * render error. A failure inside the globe shows the fallback and never takes the
 * host screen down.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isDev } from '../env';
import { GlobeFallback } from './GlobeFallback';

type Props = {
  onError?: (error: Error) => void;
  children: ReactNode;
};

type State = { failed: boolean };

export class GlobeErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error);
    if (isDev) console.error('[globe] a render error was caught by the globe boundary', error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? <GlobeFallback /> : this.props.children;
  }
}
