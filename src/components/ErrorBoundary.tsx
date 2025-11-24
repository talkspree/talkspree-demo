import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">An error occurred while loading the app</p>
              </div>
            </div>
            
            {this.state.error && (
              <div className="mb-4 p-3 bg-destructive/5 rounded border border-destructive/20">
                <p className="text-sm font-mono text-destructive break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Common solutions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check browser console (F12) for details</li>
                  <li>Ensure .env file exists with Supabase credentials</li>
                  <li>Restart the dev server (Ctrl+C, then npm run dev)</li>
                  <li>Clear browser cache and reload</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

