"use client";

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { Button } from "@/components/ui/button";
import { useAuthRuntime } from "@/components/auth/auth-runtime";

export function AuthButtons() {
  const auth = useAuthRuntime();

  if (auth.status !== "ready") {
    return (
      <div className="text-xs text-muted-foreground">
        {auth.status === "loading"
          ? "Auth loading…"
          : `Auth disabled${auth.message ? `: ${auth.message}` : ""}`}
      </div>
    );
  }

  return <AuthButtonsInner />;
}

function AuthButtonsInner() {
  const { instance, accounts } = useMsal();
  const account = accounts?.[0];

  return (
    <div className="flex items-center gap-2">
      {account ? (
        <>
          <div className="hidden text-xs text-muted-foreground md:block">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {(account as any)?.name || account.username}
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => instance.logoutPopup({ account })}
          >
            Sign out
          </Button>
        </>
      ) : (
        <Button
          onClick={() => instance.loginPopup(loginRequest)}
        >
          Sign in
        </Button>
      )}
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuthRuntime();

  // If auth is disabled, allow everything (dev/test mode).
  if (auth.status !== "ready") return <>{children}</>;

  return <RequireAuthInner>{children}</RequireAuthInner>;
}

function RequireAuthInner({ children }: { children: React.ReactNode }) {
  const { accounts } = useMsal();
  const isAuthed = (accounts?.length ?? 0) > 0;

  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold tracking-tight">Sign in required</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Please sign in with your Talking Rain Microsoft account to continue.
          </div>
          <div className="mt-5">
            <AuthButtons />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            If you expected SSO to work and you see “Auth disabled”, check{" "}
            <span className="font-mono">NEXT_PUBLIC_AZURE_AD_*</span> env vars.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

