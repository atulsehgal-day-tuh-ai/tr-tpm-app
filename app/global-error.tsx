"use client";

import * as React from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2>Global error</h2>
          <p>Copy/paste this stack trace for debugging.</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error?.stack || error?.message}</pre>
          {error?.digest ? (
            <p>
              Digest: <code>{error.digest}</code>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}

