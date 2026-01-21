"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-muted/50">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold tracking-tight">App error</div>
          <div className="mt-1 text-sm text-muted-foreground">
            This is a diagnostic page for Dev/Stage. Copy the details below and share them.
          </div>

          <div className="mt-4 rounded-lg border bg-muted/20 p-3">
            <div className="text-xs font-medium text-muted-foreground">Message</div>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
              {error?.message || "(no message)"}
            </pre>
          </div>

          <div className="mt-3 rounded-lg border bg-muted/20 p-3">
            <div className="text-xs font-medium text-muted-foreground">Stack</div>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
              {(error as any)?.stack || "(no stack)"}
            </pre>
          </div>

          {error?.digest ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Digest: <span className="font-mono">{error.digest}</span>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Link className="inline-flex" href="/login">
              <Button variant="secondary">Login</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

