"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type State = {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
};

export class ClientErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // This will show in App Service logs via browser console collection, and helps us pinpoint the offender.
    // eslint-disable-next-line no-console
    console.error("ClientErrorBoundary caught error:", error);
    // eslint-disable-next-line no-console
    console.error("Component stack:", info.componentStack);
    this.setState({ componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold tracking-tight">Something went wrong</div>
          <div className="mt-1 text-sm text-muted-foreground">
            The app hit a client-side error. Please share the details below with the dev team.
          </div>

          <div className="mt-4 rounded-lg border bg-muted/20 p-3">
            <div className="text-xs font-medium text-muted-foreground">Error</div>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
              {this.state.error?.message || "(no message)"}
            </pre>
          </div>

          {this.state.componentStack ? (
            <div className="mt-3 rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Component stack</div>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
                {this.state.componentStack}
              </pre>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="secondary" onClick={() => (window.location.href = "/login")}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

