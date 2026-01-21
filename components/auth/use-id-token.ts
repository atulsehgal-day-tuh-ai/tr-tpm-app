"use client";

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { useAuthRuntime } from "@/components/auth/auth-runtime";

export function useIdToken() {
  const auth = useAuthRuntime();
  const { instance, accounts } = useMsal();
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (auth.status !== "ready") {
          if (!cancelled) {
            setToken(null);
            setError(null);
          }
          return;
        }
        const account = accounts?.[0];
        if (!account) {
          if (!cancelled) setToken(null);
          return;
        }
        const result = await instance.acquireTokenSilent({
          ...loginRequest,
          account,
        });
        if (!cancelled) setToken(result.idToken || null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Token acquisition failed");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accounts, instance, auth.status]);

  return { token, error };
}

