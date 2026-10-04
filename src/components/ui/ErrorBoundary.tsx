import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Creative OS crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-300" />
        </div>
        <h2 className="text-lg font-semibold text-fog-50">Something broke on this screen</h2>
        <p className="mt-2 max-w-md text-sm text-fog-400">
          Your data is safe in local storage. Reload the page to continue, or reset sample data from Settings if the problem persists.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink-950 hover:bg-accent-strong"
        >
          Reload app
        </button>
      </div>
    );
  }
}
