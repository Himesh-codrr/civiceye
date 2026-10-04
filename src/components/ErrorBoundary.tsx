import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState | null {
    const msg = error.message || String(error);
    if (
      msg.includes('WebSocket') ||
      msg.includes('realtime') ||
      msg.includes('websocket') ||
      msg.toLowerCase().includes('websocket not available')
    ) {
      console.warn('[CivicEye] Ignoring non-critical WebSocket error in ErrorBoundary:', msg);
      return null;
    }
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const msg = error.message || String(error);
    if (
      msg.includes('WebSocket') ||
      msg.toLowerCase().includes('websocket not available')
    ) {
      console.warn('[CivicEye] Non-critical realtime error caught:', msg);
      return;
    }
    console.error('[CivicEye] runtime error:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-3xl border border-rose-200/70 bg-white p-8 text-center shadow-soft dark:border-rose-500/20 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Something hit a snag
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Something crashed while loading the app. The details were printed to the browser
              console (press{' '}
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-white/10">
                F12
              </kbd>{' '}
              →<em> Console</em>).
            </p>
            <pre className="mt-4 max-h-28 overflow-auto rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {this.state.message}
            </pre>
            <button onClick={this.reset} className="btn-primary mt-6 w-full">
              <RefreshCcw className="h-4 w-4" />
              Reload the app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
